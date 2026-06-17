package com.podcast.collab.service;

import com.podcast.collab.dto.SubtitleCueUpdateRequest;
import com.podcast.collab.dto.SubtitleDTO;
import com.podcast.collab.dto.SubtitleExportRequest;
import com.podcast.collab.dto.SubtitleGenerateRequest;
import com.podcast.collab.entity.AudioVersion;
import com.podcast.collab.entity.Subtitle;
import com.podcast.collab.entity.SubtitleCue;
import com.podcast.collab.entity.User;
import com.podcast.collab.exception.BusinessException;
import com.podcast.collab.exception.ResourceNotFoundException;
import com.podcast.collab.repository.AudioVersionRepository;
import com.podcast.collab.repository.SubtitleCueRepository;
import com.podcast.collab.repository.SubtitleRepository;
import com.podcast.collab.repository.UserRepository;
import com.podcast.collab.service.asr.AsrResult;
import com.podcast.collab.service.asr.AsrService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubtitleService {

    private final SubtitleRepository subtitleRepository;
    private final SubtitleCueRepository subtitleCueRepository;
    private final AudioVersionRepository audioVersionRepository;
    private final UserRepository userRepository;
    private final AsrService asrService;
    private final MinioService minioService;
    private final AuditService auditService;

    @Value("${audio.temp.directory:/tmp/podcast-audio}")
    private String tempDirectory;

    @Value("${subtitle.default.language:zh-CN}")
    private String defaultLanguage;

    @Transactional
    public SubtitleDTO generateSubtitle(Long teamId, SubtitleGenerateRequest request, Long userId) throws Exception {
        String language = request.getLanguage() != null ? request.getLanguage() : defaultLanguage;
        boolean detectSpeakers = request.getSpeakerDetectionEnabled() != null ? request.getSpeakerDetectionEnabled() : true;

        if (!asrService.isLanguageSupported(language)) {
            throw new BusinessException("不支持的语言: " + language);
        }

        AudioVersion audioVersion = audioVersionRepository.findByIdAndTeamId(request.getAudioVersionId(), teamId)
                .orElseThrow(() -> new ResourceNotFoundException("音频版本不存在或不属于当前团队"));

        Optional<Subtitle> existingSubtitle = subtitleRepository.findByAudioVersionIdAndLanguage(
                request.getAudioVersionId(), language);
        if (existingSubtitle.isPresent()) {
            throw new BusinessException("该语言的字幕已存在");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("用户不存在"));

        Subtitle subtitle = Subtitle.builder()
                .audioVersion(audioVersion)
                .language(language)
                .title(request.getTitle())
                .status(Subtitle.Status.GENERATING)
                .speakerDetectionEnabled(detectSpeakers)
                .createdBy(user)
                .build();

        subtitle = subtitleRepository.save(subtitle);

        processSubtitleGenerationAsync(subtitle.getId(), teamId, userId, audioVersion, language, detectSpeakers);

        auditService.logAction(
                audioVersion.getEpisode().getProgram().getTeam(),
                user,
                "GENERATE_SUBTITLE",
                "SUBTITLE",
                subtitle.getId(),
                Map.of("audioVersionId", request.getAudioVersionId(), "language", language)
        );

        return SubtitleDTO.fromEntity(subtitle);
    }

    @Async
    @Transactional
    public void processSubtitleGenerationAsync(Long subtitleId, Long teamId, Long userId,
                                                AudioVersion audioVersion, String language, boolean detectSpeakers) {
        try {
            File audioFile = downloadAudioToTemp(audioVersion);

            AsrResult asrResult = asrService.transcribe(audioFile, language, detectSpeakers);

            Subtitle subtitle = subtitleRepository.findById(subtitleId)
                    .orElseThrow(() -> new ResourceNotFoundException("字幕不存在"));

            List<SubtitleCue> cues = new ArrayList<>();
            int order = 0;
            for (AsrResult.AsrCue asrCue : asrResult.getCues()) {
                SubtitleCue cue = SubtitleCue.builder()
                        .subtitle(subtitle)
                        .startTime(asrCue.getStartTime())
                        .endTime(asrCue.getEndTime())
                        .text(asrCue.getText())
                        .speakerId(asrCue.getSpeakerId())
                        .speakerName(asrCue.getSpeakerName())
                        .confidence(asrCue.getConfidence())
                        .order(order++)
                        .build();
                cues.add(cue);
            }

            subtitle.getCues().addAll(cues);
            subtitle.setStatus(Subtitle.Status.DRAFT);
            subtitleRepository.save(subtitle);

            cleanupTempFile(audioFile);

            log.info("字幕生成完成，subtitleId: {}, 条目数: {}", subtitleId, cues.size());

        } catch (Exception e) {
            log.error("字幕生成失败，subtitleId: {}", subtitleId, e);
            try {
                Subtitle subtitle = subtitleRepository.findById(subtitleId).orElse(null);
                if (subtitle != null) {
                    subtitle.setStatus(Subtitle.Status.DRAFT);
                    subtitleRepository.save(subtitle);
                }
            } catch (Exception ex) {
                log.error("更新字幕状态失败", ex);
            }
        }
    }

    private File downloadAudioToTemp(AudioVersion audioVersion) throws Exception {
        Files.createDirectories(Paths.get(tempDirectory));

        String uniqueFileName = "asr_" + audioVersion.getId() + "_" + UUID.randomUUID().toString().substring(0, 8);
        Path tempPath = Paths.get(tempDirectory, uniqueFileName);

        try (InputStream inputStream = minioService.downloadFile(audioVersion.getFilePath())) {
            Files.copy(inputStream, tempPath, StandardCopyOption.REPLACE_EXISTING);
        }

        return tempPath.toFile();
    }

    private void cleanupTempFile(File file) {
        try {
            if (file != null && file.exists()) {
                Files.deleteIfExists(file.toPath());
            }
        } catch (Exception e) {
            log.warn("清理临时文件失败: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<SubtitleDTO> getSubtitlesByAudioVersion(Long teamId, Long audioVersionId) {
        List<Subtitle> subtitles = subtitleRepository.findByAudioVersionIdAndTeamId(audioVersionId, teamId);
        return subtitles.stream()
                .map(s -> SubtitleDTO.fromEntity(s))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SubtitleDTO getSubtitleDetail(Long teamId, Long subtitleId, boolean includeCues) {
        Subtitle subtitle = subtitleRepository.findByIdWithCuesAndTeamId(subtitleId, teamId)
                .orElseThrow(() -> new ResourceNotFoundException("字幕不存在或不属于当前团队"));
        return SubtitleDTO.fromEntity(subtitle, includeCues);
    }

    @Transactional(readOnly = true)
    public List<SubtitleDTO> getSubtitlesByEpisode(Long teamId, Long episodeId) {
        List<Subtitle> subtitles = subtitleRepository.findByEpisodeIdAndTeamId(episodeId, teamId);
        return subtitles.stream()
                .map(s -> SubtitleDTO.fromEntity(s))
                .collect(Collectors.toList());
    }

    @Transactional
    public SubtitleDTO updateSubtitleStatus(Long teamId, Long subtitleId, Subtitle.Status status, Long userId) {
        Subtitle subtitle = subtitleRepository.findByIdAndTeamId(subtitleId, teamId)
                .orElseThrow(() -> new ResourceNotFoundException("字幕不存在或不属于当前团队"));

        subtitle.setStatus(status);
        subtitle = subtitleRepository.save(subtitle);

        User user = userRepository.findById(userId).orElse(null);
        auditService.logAction(
                subtitle.getAudioVersion().getEpisode().getProgram().getTeam(),
                user,
                "UPDATE_SUBTITLE_STATUS",
                "SUBTITLE",
                subtitleId,
                Map.of("status", status.name())
        );

        return SubtitleDTO.fromEntity(subtitle);
    }

    @Transactional
    public com.podcast.collab.dto.SubtitleCueDTO updateCue(Long teamId, Long cueId, SubtitleCueUpdateRequest request, Long userId) {
        SubtitleCue cue = subtitleCueRepository.findByIdAndTeamId(cueId, teamId)
                .orElseThrow(() -> new ResourceNotFoundException("字幕条目不存在或不属于当前团队"));

        if (request.getEndTime().compareTo(request.getStartTime()) <= 0) {
            throw new BusinessException("结束时间必须大于开始时间");
        }

        cue.setStartTime(request.getStartTime());
        cue.setEndTime(request.getEndTime());
        cue.setText(request.getText());
        cue.setSpeakerId(request.getSpeakerId());
        cue.setSpeakerName(request.getSpeakerName());

        cue = subtitleCueRepository.save(cue);

        Subtitle subtitle = cue.getSubtitle();
        if (subtitle != null && subtitle.getStatus() == Subtitle.Status.FINALIZED) {
            subtitle.setStatus(Subtitle.Status.DRAFT);
            subtitleRepository.save(subtitle);
        }

        User user = userRepository.findById(userId).orElse(null);
        auditService.logAction(
                subtitle != null ? subtitle.getAudioVersion().getEpisode().getProgram().getTeam() : null,
                user,
                "UPDATE_SUBTITLE_CUE",
                "SUBTITLE_CUE",
                cueId,
                Map.of("text", request.getText())
        );

        return com.podcast.collab.dto.SubtitleCueDTO.fromEntity(cue);
    }

    @Transactional
    public List<com.podcast.collab.dto.SubtitleCueDTO> batchUpdateCues(Long teamId, Long subtitleId,
                                                                        List<SubtitleCueUpdateRequest> requests, Long userId) {
        Subtitle subtitle = subtitleRepository.findByIdWithCuesAndTeamId(subtitleId, teamId)
                .orElseThrow(() -> new ResourceNotFoundException("字幕不存在或不属于当前团队"));

        if (requests.size() != subtitle.getCues().size()) {
            throw new BusinessException("字幕条目数量不匹配");
        }

        List<SubtitleCue> updatedCues = new ArrayList<>();
        for (int i = 0; i < requests.size(); i++) {
            SubtitleCueUpdateRequest request = requests.get(i);
            SubtitleCue cue = subtitle.getCues().get(i);

            if (request.getEndTime().compareTo(request.getStartTime()) <= 0) {
                throw new BusinessException("第 " + (i + 1) + " 条字幕结束时间必须大于开始时间");
            }

            cue.setStartTime(request.getStartTime());
            cue.setEndTime(request.getEndTime());
            cue.setText(request.getText());
            cue.setSpeakerId(request.getSpeakerId());
            cue.setSpeakerName(request.getSpeakerName());
            cue.setOrder(i);

            updatedCues.add(subtitleCueRepository.save(cue));
        }

        if (subtitle.getStatus() == Subtitle.Status.FINALIZED) {
            subtitle.setStatus(Subtitle.Status.DRAFT);
            subtitleRepository.save(subtitle);
        }

        User user = userRepository.findById(userId).orElse(null);
        auditService.logAction(
                subtitle.getAudioVersion().getEpisode().getProgram().getTeam(),
                user,
                "BATCH_UPDATE_SUBTITLE_CUES",
                "SUBTITLE",
                subtitleId,
                Map.of("count", requests.size())
        );

        return updatedCues.stream()
                .map(com.podcast.collab.dto.SubtitleCueDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public com.podcast.collab.dto.SubtitleCueDTO addCue(Long teamId, Long subtitleId, SubtitleCueUpdateRequest request, Long userId) {
        Subtitle subtitle = subtitleRepository.findByIdWithCuesAndTeamId(subtitleId, teamId)
                .orElseThrow(() -> new ResourceNotFoundException("字幕不存在或不属于当前团队"));

        if (request.getEndTime().compareTo(request.getStartTime()) <= 0) {
            throw new BusinessException("结束时间必须大于开始时间");
        }

        Integer maxOrder = subtitleCueRepository.findMaxOrderBySubtitleId(subtitleId);
        int newOrder = (maxOrder != null ? maxOrder : -1) + 1;

        SubtitleCue cue = SubtitleCue.builder()
                .subtitle(subtitle)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .text(request.getText())
                .speakerId(request.getSpeakerId())
                .speakerName(request.getSpeakerName())
                .order(newOrder)
                .build();

        cue = subtitleCueRepository.save(cue);

        if (subtitle.getStatus() == Subtitle.Status.FINALIZED) {
            subtitle.setStatus(Subtitle.Status.DRAFT);
            subtitleRepository.save(subtitle);
        }

        User user = userRepository.findById(userId).orElse(null);
        auditService.logAction(
                subtitle.getAudioVersion().getEpisode().getProgram().getTeam(),
                user,
                "ADD_SUBTITLE_CUE",
                "SUBTITLE",
                subtitleId,
                Map.of("text", request.getText())
        );

        return com.podcast.collab.dto.SubtitleCueDTO.fromEntity(cue);
    }

    @Transactional
    public void deleteCue(Long teamId, Long cueId, Long userId) {
        SubtitleCue cue = subtitleCueRepository.findByIdAndTeamId(cueId, teamId)
                .orElseThrow(() -> new ResourceNotFoundException("字幕条目不存在或不属于当前团队"));

        Subtitle subtitle = cue.getSubtitle();
        subtitleCueRepository.delete(cue);

        List<SubtitleCue> remainingCues = subtitleCueRepository.findBySubtitleIdOrderByOrderAsc(subtitle.getId());
        for (int i = 0; i < remainingCues.size(); i++) {
            remainingCues.get(i).setOrder(i);
            subtitleCueRepository.save(remainingCues.get(i));
        }

        if (subtitle.getStatus() == Subtitle.Status.FINALIZED) {
            subtitle.setStatus(Subtitle.Status.DRAFT);
            subtitleRepository.save(subtitle);
        }

        User user = userRepository.findById(userId).orElse(null);
        auditService.logAction(
                subtitle.getAudioVersion().getEpisode().getProgram().getTeam(),
                user,
                "DELETE_SUBTITLE_CUE",
                "SUBTITLE_CUE",
                cueId,
                null
        );
    }

    @Transactional
    public List<com.podcast.collab.dto.SubtitleCueDTO> mergeCues(Long teamId, List<Long> cueIds, Long userId) {
        if (cueIds == null || cueIds.size() < 2) {
            throw new BusinessException("至少需要选择2条字幕进行合并");
        }

        List<SubtitleCue> cues = new ArrayList<>();
        Subtitle subtitle = null;

        for (Long cueId : cueIds) {
            SubtitleCue cue = subtitleCueRepository.findByIdAndTeamId(cueId, teamId)
                    .orElseThrow(() -> new ResourceNotFoundException("字幕条目不存在或不属于当前团队"));
            cues.add(cue);

            if (subtitle == null) {
                subtitle = cue.getSubtitle();
            } else if (!subtitle.getId().equals(cue.getSubtitle().getId())) {
                throw new BusinessException("只能合并同一份字幕的条目");
            }
        }

        cues.sort(Comparator.comparingInt(SubtitleCue::getOrder));

        SubtitleCue firstCue = cues.get(0);
        SubtitleCue lastCue = cues.get(cues.size() - 1);

        StringBuilder mergedText = new StringBuilder();
        String currentSpeaker = null;
        for (SubtitleCue cue : cues) {
            if (cue.getSpeakerName() != null && !cue.getSpeakerName().equals(currentSpeaker)) {
                if (mergedText.length() > 0) {
                    mergedText.append("\n");
                }
                mergedText.append(cue.getSpeakerName()).append(": ");
                currentSpeaker = cue.getSpeakerName();
            } else if (mergedText.length() > 0) {
                mergedText.append(" ");
            }
            mergedText.append(cue.getText());
        }

        firstCue.setEndTime(lastCue.getEndTime());
        firstCue.setText(mergedText.toString());
        firstCue = subtitleCueRepository.save(firstCue);

        for (int i = 1; i < cues.size(); i++) {
            subtitleCueRepository.delete(cues.get(i));
        }

        List<SubtitleCue> remainingCues = subtitleCueRepository.findBySubtitleIdOrderByOrderAsc(subtitle.getId());
        for (int i = 0; i < remainingCues.size(); i++) {
            remainingCues.get(i).setOrder(i);
            subtitleCueRepository.save(remainingCues.get(i));
        }

        if (subtitle.getStatus() == Subtitle.Status.FINALIZED) {
            subtitle.setStatus(Subtitle.Status.DRAFT);
            subtitleRepository.save(subtitle);
        }

        User user = userRepository.findById(userId).orElse(null);
        auditService.logAction(
                subtitle.getAudioVersion().getEpisode().getProgram().getTeam(),
                user,
                "MERGE_SUBTITLE_CUES",
                "SUBTITLE",
                subtitle.getId(),
                Map.of("mergedCount", cueIds.size())
        );

        return remainingCues.stream()
                .map(com.podcast.collab.dto.SubtitleCueDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<com.podcast.collab.dto.SubtitleCueDTO> splitCue(Long teamId, Long cueId, BigDecimal splitTime, Long userId) {
        SubtitleCue cue = subtitleCueRepository.findByIdAndTeamId(cueId, teamId)
                .orElseThrow(() -> new ResourceNotFoundException("字幕条目不存在或不属于当前团队"));

        if (splitTime.compareTo(cue.getStartTime()) <= 0 || splitTime.compareTo(cue.getEndTime()) >= 0) {
            throw new BusinessException("分割时间必须在字幕的开始和结束时间之间");
        }

        Subtitle subtitle = cue.getSubtitle();

        SubtitleCue firstCue = SubtitleCue.builder()
                .subtitle(subtitle)
                .startTime(cue.getStartTime())
                .endTime(splitTime)
                .text(cue.getText())
                .speakerId(cue.getSpeakerId())
                .speakerName(cue.getSpeakerName())
                .confidence(cue.getConfidence())
                .order(cue.getOrder())
                .build();

        SubtitleCue secondCue = SubtitleCue.builder()
                .subtitle(subtitle)
                .startTime(splitTime)
                .endTime(cue.getEndTime())
                .text(cue.getText())
                .speakerId(cue.getSpeakerId())
                .speakerName(cue.getSpeakerName())
                .confidence(cue.getConfidence())
                .order(cue.getOrder() + 1)
                .build();

        subtitleCueRepository.delete(cue);
        firstCue = subtitleCueRepository.save(firstCue);
        secondCue = subtitleCueRepository.save(secondCue);

        List<SubtitleCue> allCues = subtitleCueRepository.findBySubtitleIdOrderByOrderAsc(subtitle.getId());
        for (int i = 0; i < allCues.size(); i++) {
            if (!Objects.equals(allCues.get(i).getId(), firstCue.getId())
                    && !Objects.equals(allCues.get(i).getId(), secondCue.getId())) {
                if (allCues.get(i).getOrder() >= cue.getOrder() + 1) {
                    allCues.get(i).setOrder(allCues.get(i).getOrder() + 1);
                    subtitleCueRepository.save(allCues.get(i));
                }
            }
        }

        if (subtitle.getStatus() == Subtitle.Status.FINALIZED) {
            subtitle.setStatus(Subtitle.Status.DRAFT);
            subtitleRepository.save(subtitle);
        }

        User user = userRepository.findById(userId).orElse(null);
        auditService.logAction(
                subtitle.getAudioVersion().getEpisode().getProgram().getTeam(),
                user,
                "SPLIT_SUBTITLE_CUE",
                "SUBTITLE",
                subtitle.getId(),
                Map.of("splitTime", splitTime)
        );

        return List.of(
                com.podcast.collab.dto.SubtitleCueDTO.fromEntity(firstCue),
                com.podcast.collab.dto.SubtitleCueDTO.fromEntity(secondCue)
        );
    }

    @Transactional(readOnly = true)
    public String exportSubtitle(Long teamId, Long subtitleId, SubtitleExportRequest request) {
        Subtitle subtitle = subtitleRepository.findByIdWithCuesAndTeamId(subtitleId, teamId)
                .orElseThrow(() -> new ResourceNotFoundException("字幕不存在或不属于当前团队"));

        String format = request.getFormat() != null ? request.getFormat().toUpperCase() : "SRT";
        boolean includeSpeaker = request.getIncludeSpeaker() != null ? request.getIncludeSpeaker() : true;
        String speakerSeparator = request.getSpeakerSeparator() != null ? request.getSpeakerSeparator() : ": ";

        return switch (format) {
            case "VTT" -> exportAsVtt(subtitle, includeSpeaker, speakerSeparator);
            case "SRT" -> exportAsSrt(subtitle, includeSpeaker, speakerSeparator);
            default -> throw new BusinessException("不支持的导出格式: " + format);
        };
    }

    private String exportAsSrt(Subtitle subtitle, boolean includeSpeaker, String speakerSeparator) {
        StringBuilder sb = new StringBuilder();
        int index = 1;

        for (SubtitleCue cue : subtitle.getCues()) {
            sb.append(index++).append("\n");
            sb.append(formatSrtTime(cue.getStartTime())).append(" --> ").append(formatSrtTime(cue.getEndTime())).append("\n");

            if (includeSpeaker && cue.getSpeakerName() != null && !cue.getSpeakerName().isEmpty()) {
                sb.append(cue.getSpeakerName()).append(speakerSeparator);
            }
            sb.append(cue.getText()).append("\n\n");
        }

        return sb.toString();
    }

    private String exportAsVtt(Subtitle subtitle, boolean includeSpeaker, String speakerSeparator) {
        StringBuilder sb = new StringBuilder("WEBVTT\n\n");

        for (SubtitleCue cue : subtitle.getCues()) {
            sb.append(formatVttTime(cue.getStartTime())).append(" --> ").append(formatVttTime(cue.getEndTime()));

            if (cue.getSpeakerId() != null && !cue.getSpeakerId().isEmpty()) {
                sb.append(" <v ").append(cue.getSpeakerName() != null ? cue.getSpeakerName() : cue.getSpeakerId()).append(">");
            }
            sb.append("\n");

            if (includeSpeaker && cue.getSpeakerName() != null && !cue.getSpeakerName().isEmpty()) {
                sb.append(cue.getSpeakerName()).append(speakerSeparator);
            }
            sb.append(cue.getText()).append("\n\n");
        }

        return sb.toString();
    }

    private String formatSrtTime(BigDecimal seconds) {
        BigDecimal millis = seconds.multiply(BigDecimal.valueOf(1000)).setScale(0, RoundingMode.HALF_UP);
        long totalMillis = millis.longValue();
        long hours = totalMillis / 3_600_000;
        long minutes = (totalMillis % 3_600_000) / 60_000;
        long secs = (totalMillis % 60_000) / 1000;
        long ms = totalMillis % 1000;
        return String.format("%02d:%02d:%02d,%03d", hours, minutes, secs, ms);
    }

    private String formatVttTime(BigDecimal seconds) {
        BigDecimal millis = seconds.multiply(BigDecimal.valueOf(1000)).setScale(0, RoundingMode.HALF_UP);
        long totalMillis = millis.longValue();
        long hours = totalMillis / 3_600_000;
        long minutes = (totalMillis % 3_600_000) / 60_000;
        long secs = (totalMillis % 60_000) / 1000;
        long ms = totalMillis % 1000;
        return String.format("%02d:%02d:%02d.%03d", hours, minutes, secs, ms);
    }

    @Transactional(readOnly = true)
    public Set<String> getSupportedLanguages() {
        return asrService.getSupportedLanguages();
    }

    @Transactional
    public void deleteSubtitle(Long teamId, Long subtitleId, Long userId) {
        Subtitle subtitle = subtitleRepository.findByIdAndTeamId(subtitleId, teamId)
                .orElseThrow(() -> new ResourceNotFoundException("字幕不存在或不属于当前团队"));

        User user = userRepository.findById(userId).orElse(null);
        auditService.logAction(
                subtitle.getAudioVersion().getEpisode().getProgram().getTeam(),
                user,
                "DELETE_SUBTITLE",
                "SUBTITLE",
                subtitleId,
                Map.of("language", subtitle.getLanguage())
        );

        subtitleRepository.delete(subtitle);
    }

    @Transactional(readOnly = true)
    public List<com.podcast.collab.dto.SubtitleCueDTO> getCuesByTime(Long teamId, Long subtitleId, BigDecimal time) {
        Subtitle subtitle = subtitleRepository.findByIdAndTeamId(subtitleId, teamId)
                .orElseThrow(() -> new ResourceNotFoundException("字幕不存在或不属于当前团队"));

        List<SubtitleCue> cues = subtitleCueRepository.findBySubtitleIdAndTimeRange(subtitleId, time);
        return cues.stream()
                .map(com.podcast.collab.dto.SubtitleCueDTO::fromEntity)
                .collect(Collectors.toList());
    }
}
