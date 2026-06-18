package com.podcast.collab.service;

import com.podcast.collab.dto.*;
import com.podcast.collab.entity.*;
import com.podcast.collab.repository.*;
import com.podcast.collab.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CoverGenerationService {

    private final CoverGenerationRepository coverGenerationRepository;
    private final CoverStyleRepository coverStyleRepository;
    private final EpisodeRepository episodeRepository;
    private final ProgramRepository programRepository;
    private final ImageProcessingService imageProcessingService;
    private final MinioService minioService;
    private final SecurityUtil securityUtil;
    private final AuditService auditService;

    private static final List<String> DEFAULT_STYLE_KEYS = Arrays.asList(
            "MODERN_MINIMAL", "VIBRANT_GRADIENT", "WARM_NATURE", "DARK_PROFESSIONAL"
    );

    @Transactional(readOnly = true)
    public List<CoverStyleDTO> getAvailableStyles() {
        Long teamId = securityUtil.getCurrentTeamId();
        List<CoverStyle> styles = coverStyleRepository.findAvailableStyles(teamId);
        return styles.stream()
                .map(CoverStyleDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CoverStyleDTO getStyleById(Long styleId) {
        Long teamId = securityUtil.getCurrentTeamId();
        CoverStyle style = coverStyleRepository.findByIdAndTeam(styleId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("风格不存在或无权访问"));
        return CoverStyleDTO.fromEntity(style);
    }

    @Transactional
    public List<CoverGenerationDTO> generateCovers(CoverGenerateRequest request) {
        Long teamId = securityUtil.getCurrentTeamId();
        User currentUser = securityUtil.getCurrentUser();

        Episode episode = null;
        Program program = null;
        String title = request.getTitle();
        String description = request.getDescription();
        String subtitle = request.getSubtitle();

        if (request.getEpisodeId() != null) {
            episode = episodeRepository.findByIdAndTeamId(request.getEpisodeId(), teamId)
                    .orElseThrow(() -> new IllegalArgumentException("节目单集不存在"));
            if (title == null || title.isEmpty()) title = episode.getTitle();
            if (description == null || description.isEmpty()) description = episode.getDescription();
            program = episode.getProgram();
        } else if (request.getProgramId() != null) {
            program = programRepository.findByIdAndTeamId(request.getProgramId(), teamId)
                    .orElseThrow(() -> new IllegalArgumentException("节目不存在"));
            if (title == null || title.isEmpty()) title = program.getName();
            if (description == null || description.isEmpty()) description = program.getDescription();
        }

        if (title == null || title.isEmpty()) {
            throw new IllegalArgumentException("标题不能为空");
        }

        List<String> styleKeys = resolveStyleKeys(request);
        List<CoverGeneration> results = new ArrayList<>();

        for (int i = 0; i < styleKeys.size(); i++) {
            String styleKey = styleKeys.get(i);
            CoverStyle style = coverStyleRepository.findByStyleKeyAndTeam(styleKey, teamId).orElse(null);

            String primaryColor = request.getPrimaryColor();
            String secondaryColor = request.getSecondaryColor();
            String accentColor = request.getAccentColor();
            String fontFamily = request.getFontFamily();
            Long styleId = null;
            String layoutType = "CENTERED";

            if (style != null) {
                styleId = style.getId();
                layoutType = style.getLayoutType();
                if (primaryColor == null || primaryColor.isEmpty()) primaryColor = style.getPrimaryColor();
                if (secondaryColor == null || secondaryColor.isEmpty()) secondaryColor = style.getSecondaryColor();
                if (accentColor == null || accentColor.isEmpty()) accentColor = style.getAccentColor();
                if (fontFamily == null || fontFamily.isEmpty()) fontFamily = style.getFontFamily();
            }

            if (request.getStyleId() != null && i == 0) {
                CoverStyle selectedStyle = coverStyleRepository.findByIdAndTeam(request.getStyleId(), teamId).orElse(null);
                if (selectedStyle != null) {
                    styleId = selectedStyle.getId();
                    styleKey = selectedStyle.getStyleKey();
                    layoutType = selectedStyle.getLayoutType();
                    if (primaryColor == null || primaryColor.isEmpty()) primaryColor = selectedStyle.getPrimaryColor();
                    if (secondaryColor == null || secondaryColor.isEmpty()) secondaryColor = selectedStyle.getSecondaryColor();
                    if (accentColor == null || accentColor.isEmpty()) accentColor = selectedStyle.getAccentColor();
                    if (fontFamily == null || fontFamily.isEmpty()) fontFamily = selectedStyle.getFontFamily();
                }
            }

            String prompt = buildPrompt(title, subtitle, description, styleKey, primaryColor, secondaryColor, accentColor);

            CoverGeneration generation = CoverGeneration.builder()
                    .teamId(teamId)
                    .episode(episode)
                    .program(program)
                    .title(title)
                    .subtitle(subtitle)
                    .description(description)
                    .style(styleId != null ? getStyleReference(styleId) : null)
                    .styleKey(styleKey)
                    .primaryColor(primaryColor)
                    .secondaryColor(secondaryColor)
                    .accentColor(accentColor)
                    .fontFamily(fontFamily)
                    .referenceImageUrl(request.getReferenceImageUrl())
                    .generationStatus(CoverGeneration.GenerationStatus.PENDING)
                    .generatedBy(currentUser.getId())
                    .isSelected(false)
                    .prompt(prompt)
                    .build();

            generation = coverGenerationRepository.save(generation);
            results.add(generation);

            executeCoverGenerationAsync(
                    generation.getId(),
                    title, subtitle,
                    primaryColor, secondaryColor, accentColor,
                    fontFamily, layoutType,
                    request.getReferenceImageUrl(),
                    styleKey,
                    teamId
            );
        }

        final String finalTitle = title;
        auditService.logAction(teamId, currentUser.getId(), "GENERATE_COVER",
                "COVER_GENERATION", null,
                Map.of("count", results.size(), "title", finalTitle,
                        "episodeId", request.getEpisodeId(), "programId", request.getProgramId()));

        return results.stream()
                .map(CoverGenerationDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Async
    protected void executeCoverGenerationAsync(
            Long generationId,
            String title, String subtitle,
            String primaryColor, String secondaryColor, String accentColor,
            String fontFamily, String layoutType,
            String referenceImageUrl,
            String styleKey,
            Long teamId
    ) {
        try {
            CoverGeneration generation = coverGenerationRepository.findById(generationId).orElse(null);
            if (generation == null) return;

            generation.setGenerationStatus(CoverGeneration.GenerationStatus.GENERATING);
            coverGenerationRepository.save(generation);

            byte[] hdImage = imageProcessingService.generateHdCover(
                    title, subtitle,
                    primaryColor, secondaryColor, accentColor,
                    fontFamily, layoutType,
                    referenceImageUrl,
                    styleKey
            );

            byte[] thumbnail = imageProcessingService.generateThumbnail(hdImage);

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            String hdObjectName = String.format("covers/team_%d/%s_%d_hd.png", teamId, timestamp, generationId);
            String thumbObjectName = String.format("covers/team_%d/%s_%d_thumb.png", teamId, timestamp, generationId);

            String hdUrl = imageProcessingService.uploadCoverImage(hdObjectName, hdImage, true);
            String thumbUrl = imageProcessingService.uploadCoverImage(thumbObjectName, thumbnail, true);

            generation.setHdImageUrl(hdUrl);
            generation.setThumbnailUrl(thumbUrl);
            generation.setGenerationStatus(CoverGeneration.GenerationStatus.COMPLETED);
            coverGenerationRepository.save(generation);

            log.info("封面生成成功: generationId={}, hdUrl={}", generationId, hdUrl);

        } catch (Exception e) {
            log.error("封面生成失败: generationId={}, error={}", generationId, e.getMessage(), e);
            CoverGeneration generation = coverGenerationRepository.findById(generationId).orElse(null);
            if (generation != null) {
                generation.setGenerationStatus(CoverGeneration.GenerationStatus.FAILED);
                generation.setErrorMessage(e.getMessage());
                coverGenerationRepository.save(generation);
            }
        }
    }

    @Transactional
    public CoverGenerationDTO adjustCover(CoverAdjustRequest request) {
        Long teamId = securityUtil.getCurrentTeamId();
        User currentUser = securityUtil.getCurrentUser();

        CoverGeneration generation = coverGenerationRepository.findByIdAndTeamId(request.getCoverGenerationId(), teamId)
                .orElseThrow(() -> new IllegalArgumentException("封面记录不存在或无权访问"));

        if (request.getTitle() != null) generation.setTitle(request.getTitle());
        if (request.getSubtitle() != null) generation.setSubtitle(request.getSubtitle());
        if (request.getPrimaryColor() != null) generation.setPrimaryColor(request.getPrimaryColor());
        if (request.getSecondaryColor() != null) generation.setSecondaryColor(request.getSecondaryColor());
        if (request.getAccentColor() != null) generation.setAccentColor(request.getAccentColor());
        if (request.getFontFamily() != null) generation.setFontFamily(request.getFontFamily());
        if (request.getReferenceImageUrl() != null) generation.setReferenceImageUrl(request.getReferenceImageUrl());

        CoverStyle newStyle = null;
        String layoutType = resolveLayoutType(generation.getStyleKey());
        if (request.getNewStyleId() != null) {
            newStyle = coverStyleRepository.findByIdAndTeam(request.getNewStyleId(), teamId).orElse(null);
            if (newStyle != null) {
                generation.setStyle(newStyle);
                generation.setStyleKey(newStyle.getStyleKey());
                layoutType = newStyle.getLayoutType();
                if (request.getPrimaryColor() == null) generation.setPrimaryColor(newStyle.getPrimaryColor());
                if (request.getSecondaryColor() == null) generation.setSecondaryColor(newStyle.getSecondaryColor());
                if (request.getAccentColor() == null) generation.setAccentColor(newStyle.getAccentColor());
                if (request.getFontFamily() == null) generation.setFontFamily(newStyle.getFontFamily());
            }
        }

        String prompt = buildPrompt(
                generation.getTitle(), generation.getSubtitle(), generation.getDescription(),
                generation.getStyleKey(),
                generation.getPrimaryColor(), generation.getSecondaryColor(), generation.getAccentColor()
        );
        generation.setPrompt(prompt);
        generation.setGenerationStatus(CoverGeneration.GenerationStatus.GENERATING);
        generation = coverGenerationRepository.save(generation);

        final Long savedId = generation.getId();
        final String finalLayoutType = layoutType;

        new Thread(() -> executeCoverGenerationAsync(
                savedId,
                generation.getTitle(),
                generation.getSubtitle(),
                generation.getPrimaryColor(),
                generation.getSecondaryColor(),
                generation.getAccentColor(),
                generation.getFontFamily(),
                finalLayoutType,
                generation.getReferenceImageUrl(),
                generation.getStyleKey(),
                teamId
        )).start();

        auditService.logAction(teamId, currentUser.getId(), "ADJUST_COVER",
                "COVER_GENERATION", savedId, null);

        return CoverGenerationDTO.fromEntity(generation);
    }

    @Transactional
    public CoverGenerationDTO selectCover(Long generationId) {
        Long teamId = securityUtil.getCurrentTeamId();
        User currentUser = securityUtil.getCurrentUser();

        CoverGeneration generation = coverGenerationRepository.findByIdAndTeamId(generationId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("封面记录不存在或无权访问"));

        if (generation.getGenerationStatus() != CoverGeneration.GenerationStatus.COMPLETED) {
            throw new IllegalArgumentException("只能选择已生成完成的封面");
        }

        if (generation.getEpisode() != null) {
            coverGenerationRepository.unselectOtherEpisodeCovers(teamId, generation.getEpisode().getId(), generationId);
        } else if (generation.getProgram() != null) {
            coverGenerationRepository.unselectOtherProgramCovers(teamId, generation.getProgram().getId(), generationId);
        }

        generation.setIsSelected(true);
        generation = coverGenerationRepository.save(generation);

        if (generation.getEpisode() != null && generation.getEpisode().getProgram() != null) {
            Program program = generation.getEpisode().getProgram();
            if (program.getCoverImageUrl() == null || program.getCoverImageUrl().isEmpty()) {
                program.setCoverImageUrl(generation.getHdImageUrl());
                programRepository.save(program);
            }
        } else if (generation.getProgram() != null) {
            Program program = generation.getProgram();
            program.setCoverImageUrl(generation.getHdImageUrl());
            programRepository.save(program);
        }

        auditService.logAction(teamId, currentUser.getId(), "SELECT_COVER",
                "COVER_GENERATION", generationId,
                Map.of("hdUrl", generation.getHdImageUrl()));

        return CoverGenerationDTO.fromEntity(generation);
    }

    @Transactional(readOnly = true)
    public List<CoverGenerationDTO> getCoversByEpisode(Long episodeId) {
        Long teamId = securityUtil.getCurrentTeamId();
        validateEpisodeOwnership(episodeId, teamId);
        List<CoverGeneration> covers = coverGenerationRepository.findByTeamIdAndEpisodeId(teamId, episodeId);
        return covers.stream()
                .map(CoverGenerationDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CoverGenerationDTO> getCoversByProgram(Long programId) {
        Long teamId = securityUtil.getCurrentTeamId();
        validateProgramOwnership(programId, teamId);
        List<CoverGeneration> covers = coverGenerationRepository.findByTeamIdAndProgramId(teamId, programId);
        return covers.stream()
                .map(CoverGenerationDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CoverGenerationDTO getCoverById(Long generationId) {
        Long teamId = securityUtil.getCurrentTeamId();
        CoverGeneration generation = coverGenerationRepository.findByIdAndTeamId(generationId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("封面记录不存在或无权访问"));
        return CoverGenerationDTO.fromEntity(generation);
    }

    @Transactional
    public void deleteCover(Long generationId) {
        Long teamId = securityUtil.getCurrentTeamId();
        User currentUser = securityUtil.getCurrentUser();

        CoverGeneration generation = coverGenerationRepository.findByIdAndTeamId(generationId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("封面记录不存在或无权访问"));

        try {
            if (generation.getHdImageUrl() != null) {
                String objectName = minioService.extractObjectNameFromUrl(generation.getHdImageUrl());
                if (objectName != null) {
                    try {
                        minioService.deletePublicFile(objectName);
                    } catch (Exception ignored) {
                    }
                }
            }
            if (generation.getThumbnailUrl() != null) {
                String objectName = minioService.extractObjectNameFromUrl(generation.getThumbnailUrl());
                if (objectName != null) {
                    try {
                        minioService.deletePublicFile(objectName);
                    } catch (Exception ignored) {
                    }
                }
            }
        } catch (Exception e) {
            log.warn("删除封面文件失败: {}", e.getMessage());
        }

        coverGenerationRepository.delete(generation);

        auditService.logAction(teamId, currentUser.getId(), "DELETE_COVER",
                "COVER_GENERATION", generationId, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getGenerationStatus(List<Long> generationIds) {
        Long teamId = securityUtil.getCurrentTeamId();
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> statuses = new ArrayList<>();

        for (Long id : generationIds) {
            CoverGeneration generation = coverGenerationRepository.findByIdAndTeamId(id, teamId).orElse(null);
            if (generation != null) {
                Map<String, Object> status = new HashMap<>();
                status.put("id", generation.getId());
                status.put("status", generation.getGenerationStatus().name());
                status.put("hdImageUrl", generation.getHdImageUrl());
                status.put("thumbnailUrl", generation.getThumbnailUrl());
                status.put("errorMessage", generation.getErrorMessage());
                status.put("updatedAt", generation.getUpdatedAt());
                statuses.add(status);
            }
        }

        result.put("generations", statuses);
        boolean allDone = statuses.stream()
                .allMatch(s -> "COMPLETED".equals(s.get("status")) || "FAILED".equals(s.get("status")));
        result.put("allDone", allDone);

        return result;
    }

    private List<String> resolveStyleKeys(CoverGenerateRequest request) {
        List<String> styleKeys = new ArrayList<>();

        if (request.getStyleKeys() != null && !request.getStyleKeys().isEmpty()) {
            styleKeys.addAll(request.getStyleKeys());
        } else if (request.getStyleId() != null) {
            styleKeys.add("CUSTOM_STYLE_" + request.getStyleId());
        } else if (request.getStyleKey() != null && !request.getStyleKey().isEmpty()) {
            styleKeys.add(request.getStyleKey());
        } else {
            int count = request.getVariationCount() != null ? request.getVariationCount() : 4;
            count = Math.min(count, DEFAULT_STYLE_KEYS.size());
            styleKeys.addAll(DEFAULT_STYLE_KEYS.subList(0, count));
        }

        return styleKeys;
    }

    private String buildPrompt(String title, String subtitle, String description,
                                String styleKey, String primaryColor, String secondaryColor, String accentColor) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("播客封面图生成 - ");
        prompt.append("标题: ").append(title != null ? title : "");
        if (subtitle != null && !subtitle.isEmpty()) {
            prompt.append(", 副标题: ").append(subtitle);
        }
        if (description != null && !description.isEmpty()) {
            prompt.append(", 描述: ").append(description.substring(0, Math.min(200, description.length())));
        }
        prompt.append(", 风格: ").append(styleKey != null ? styleKey : "DEFAULT");
        prompt.append(", 配色: 主色=").append(primaryColor != null ? primaryColor : "");
        prompt.append(", 辅助色=").append(secondaryColor != null ? secondaryColor : "");
        prompt.append(", 强调色=").append(accentColor != null ? accentColor : "");
        return prompt.toString();
    }

    private String resolveLayoutType(String styleKey) {
        if (styleKey == null) return "CENTERED";
        return switch (styleKey) {
            case "MODERN_MINIMAL", "DARK_PROFESSIONAL", "LITERARY_FRESH" -> "CENTERED";
            case "WARM_NATURE", "BUSINESS_FORMAL" -> "LEFT_ALIGNED";
            case "VIBRANT_GRADIENT", "CREATIVE_ILLUSTRATION", "DYNAMIC_SPORTS" -> "OVERLAY";
            default -> "CENTERED";
        };
    }

    private CoverStyle getStyleReference(Long styleId) {
        CoverStyle ref = new CoverStyle();
        ref.setId(styleId);
        return ref;
    }

    private void validateEpisodeOwnership(Long episodeId, Long teamId) {
        if (!episodeRepository.existsByIdAndTeamId(episodeId, teamId)) {
            throw new IllegalArgumentException("节目不存在或无权访问");
        }
    }

    private void validateProgramOwnership(Long programId, Long teamId) {
        if (!programRepository.existsByIdAndTeamId(programId, teamId)) {
            throw new IllegalArgumentException("节目不存在或无权访问");
        }
    }
}
