package com.podcast.collab.service;

import com.podcast.collab.dto.*;
import com.podcast.collab.entity.AdPlacementRule;
import com.podcast.collab.entity.Advertisement;
import com.podcast.collab.entity.Episode;
import com.podcast.collab.entity.EpisodeAdInsertion;
import com.podcast.collab.repository.AdPlacementRuleRepository;
import com.podcast.collab.repository.AdvertisementRepository;
import com.podcast.collab.repository.EpisodeAdInsertionRepository;
import com.podcast.collab.repository.EpisodeRepository;
import com.podcast.collab.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EpisodeAdInsertionService {

    private final EpisodeAdInsertionRepository insertionRepository;
    private final EpisodeRepository episodeRepository;
    private final AdvertisementRepository advertisementRepository;
    private final AdPlacementRuleRepository ruleRepository;
    private final AdPlacementRuleService placementRuleService;
    private final SecurityUtil securityUtil;

    @Transactional(readOnly = true)
    public List<EpisodeAdInsertionDTO> getInsertionsByEpisode(Long episodeId) {
        Long teamId = securityUtil.getCurrentTeamId();
        validateEpisodeOwnership(episodeId, teamId);
        return insertionRepository.findByEpisodeId(episodeId).stream()
                .map(EpisodeAdInsertionDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<EpisodeAdInsertionDTO> getInsertionsByEpisodeAndPlatform(Long episodeId, String platform) {
        Long teamId = securityUtil.getCurrentTeamId();
        validateEpisodeOwnership(episodeId, teamId);
        return insertionRepository.findByEpisodeIdAndPlatform(episodeId, platform).stream()
                .map(EpisodeAdInsertionDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<EpisodeAdInsertionDTO> getInsertionsByEpisodePlatformVersion(Long episodeId, String platform, Integer versionNumber) {
        Long teamId = securityUtil.getCurrentTeamId();
        validateEpisodeOwnership(episodeId, teamId);
        return insertionRepository.findByEpisodeIdAndPlatformAndVersionNumber(episodeId, platform, versionNumber).stream()
                .map(EpisodeAdInsertionDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<String> getPlatformsForEpisode(Long episodeId) {
        Long teamId = securityUtil.getCurrentTeamId();
        validateEpisodeOwnership(episodeId, teamId);
        return insertionRepository.findDistinctPlatformsByEpisodeId(episodeId);
    }

    @Transactional(readOnly = true)
    public List<Integer> getVersionsForEpisodeAndPlatform(Long episodeId, String platform) {
        Long teamId = securityUtil.getCurrentTeamId();
        validateEpisodeOwnership(episodeId, teamId);
        return insertionRepository.findDistinctVersionsByEpisodeIdAndPlatform(episodeId, platform);
    }

    @Transactional
    public List<EpisodeAdInsertionDTO> generateInsertions(AdGenerationRequest request) {
        Long teamId = securityUtil.getCurrentTeamId();
        Episode episode = episodeRepository.findByIdAndTeamId(request.getEpisodeId(), teamId)
                .orElseThrow(() -> new IllegalArgumentException("节目不存在"));

        Long programId = episode.getProgram() != null ? episode.getProgram().getId() : null;

        List<String> platforms = request.getPlatforms();
        if (platforms == null || platforms.isEmpty()) {
            platforms = List.of("ALL");
        }

        List<EpisodeAdInsertion> allInsertions = new ArrayList<>();

        for (String platform : platforms) {
            int newVersion = 1;
            if (!Boolean.TRUE.equals(request.getOverwriteExisting())) {
                Integer maxVersion = insertionRepository.findMaxVersionNumberByEpisodeIdAndPlatform(
                        request.getEpisodeId(), platform);
                if (maxVersion != null) {
                    newVersion = maxVersion + 1;
                }
            } else {
                List<EpisodeAdInsertion> existing = insertionRepository.findByEpisodeIdAndPlatform(
                        request.getEpisodeId(), platform);
                if (!existing.isEmpty()) {
                    insertionRepository.deleteAll(existing);
                }
            }

            AdMatchRequest matchRequest = AdMatchRequest.builder()
                    .episodeId(request.getEpisodeId())
                    .programId(programId)
                    .episodeDuration(episode.getDuration())
                    .platform(platform)
                    .region(request.getRegion())
                    .audienceType(request.getAudienceType())
                    .build();

            if (request.getAdIds() != null && !request.getAdIds().isEmpty()) {
                allInsertions.addAll(createInsertionsFromAdIds(
                        episode, request.getAdIds(), platform, newVersion, teamId,
                        request.getPositionType(), request.getInsertTimeSeconds()));
            } else {
                AdMatchResult matchResult = placementRuleService.matchAdvertisements(matchRequest);
                allInsertions.addAll(createInsertionsFromMatchResult(
                        episode, matchResult, platform, newVersion, teamId));
            }
        }

        return allInsertions.stream()
                .map(EpisodeAdInsertionDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public EpisodeAdInsertionDTO createManualInsertion(Long episodeId, EpisodeAdInsertionDTO dto) {
        Long teamId = securityUtil.getCurrentTeamId();
        Episode episode = episodeRepository.findByIdAndTeamId(episodeId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("节目不存在"));

        Advertisement ad = advertisementRepository.findByIdAndTeamId(dto.getAdId(), teamId)
                .orElseThrow(() -> new IllegalArgumentException("广告不存在"));

        AdPlacementRule rule = null;
        if (dto.getPlacementRuleId() != null) {
            rule = ruleRepository.findByIdAndTeamId(dto.getPlacementRuleId(), teamId).orElse(null);
        }

        int versionNumber = 1;
        if (dto.getVersionNumber() != null) {
            versionNumber = dto.getVersionNumber();
        } else {
            Integer maxVersion = insertionRepository.findMaxVersionNumberByEpisodeIdAndPlatform(
                    episodeId, dto.getPlatform());
            if (maxVersion != null) {
                versionNumber = maxVersion + 1;
            }
        }

        int insertTime = dto.getInsertTimeSeconds() != null ? dto.getInsertTimeSeconds() : 0;
        if (dto.getPositionType() == AdPlacementRule.PositionType.POST_ROLL && episode.getDuration() != null) {
            insertTime = episode.getDuration();
        }

        validateInsertTime(dto.getPositionType(), insertTime, episode.getDuration());

        EpisodeAdInsertion insertion = EpisodeAdInsertion.builder()
                .episode(episode)
                .advertisement(ad)
                .placementRule(rule)
                .platform(dto.getPlatform())
                .positionType(dto.getPositionType())
                .insertTimeSeconds(insertTime)
                .durationSeconds(dto.getDurationSeconds() != null ? dto.getDurationSeconds() : ad.getDurationSeconds())
                .versionNumber(versionNumber)
                .isGenerated(false)
                .build();

        insertion = insertionRepository.save(insertion);
        return EpisodeAdInsertionDTO.fromEntity(insertion);
    }

    @Transactional
    public EpisodeAdInsertionDTO updateInsertion(Long insertionId, EpisodeAdInsertionDTO dto) {
        Long teamId = securityUtil.getCurrentTeamId();
        EpisodeAdInsertion insertion = insertionRepository.findById(insertionId)
                .orElseThrow(() -> new IllegalArgumentException("插入记录不存在"));

        if (!insertion.getEpisode().getProgram().getTeam().getId().equals(teamId)) {
            throw new IllegalArgumentException("无权操作此插入记录");
        }

        AdPlacementRule.PositionType newPositionType = dto.getPositionType() != null
                ? dto.getPositionType() : insertion.getPositionType();
        Integer newInsertTime = dto.getInsertTimeSeconds() != null
                ? dto.getInsertTimeSeconds() : insertion.getInsertTimeSeconds();

        if (dto.getInsertTimeSeconds() != null) {
            insertion.setInsertTimeSeconds(dto.getInsertTimeSeconds());
        }
        if (dto.getDurationSeconds() != null) {
            insertion.setDurationSeconds(dto.getDurationSeconds());
        }
        if (dto.getPositionType() != null) {
            insertion.setPositionType(dto.getPositionType());
        }

        validateInsertTime(newPositionType, newInsertTime,
                insertion.getEpisode() != null ? insertion.getEpisode().getDuration() : null);
        if (dto.getPlatform() != null) {
            insertion.setPlatform(dto.getPlatform());
        }
        if (dto.getGeneratedAudioUrl() != null) {
            insertion.setGeneratedAudioUrl(dto.getGeneratedAudioUrl());
        }
        if (dto.getIsGenerated() != null) {
            insertion.setIsGenerated(dto.getIsGenerated());
        }

        insertion = insertionRepository.save(insertion);
        return EpisodeAdInsertionDTO.fromEntity(insertion);
    }

    @Transactional
    public void deleteInsertion(Long insertionId) {
        Long teamId = securityUtil.getCurrentTeamId();
        EpisodeAdInsertion insertion = insertionRepository.findById(insertionId)
                .orElseThrow(() -> new IllegalArgumentException("插入记录不存在"));

        if (!insertion.getEpisode().getProgram().getTeam().getId().equals(teamId)) {
            throw new IllegalArgumentException("无权操作此插入记录");
        }

        insertionRepository.delete(insertion);
    }

    @Transactional
    public void deleteInsertionsByEpisodeAndPlatformAndVersion(Long episodeId, String platform, Integer versionNumber) {
        Long teamId = securityUtil.getCurrentTeamId();
        validateEpisodeOwnership(episodeId, teamId);

        List<EpisodeAdInsertion> insertions = insertionRepository
                .findByEpisodeIdAndPlatformAndVersionNumber(episodeId, platform, versionNumber);
        insertionRepository.deleteAll(insertions);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getInsertionSummary(Long episodeId) {
        Long teamId = securityUtil.getCurrentTeamId();
        validateEpisodeOwnership(episodeId, teamId);

        List<EpisodeAdInsertion> insertions = insertionRepository.findByEpisodeId(episodeId);

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalInsertions", insertions.size());

        Map<String, List<EpisodeAdInsertionDTO>> byPlatform = insertions.stream()
                .map(EpisodeAdInsertionDTO::fromEntity)
                .collect(Collectors.groupingBy(dto -> dto.getPlatform() != null ? dto.getPlatform() : "ALL"));
        summary.put("byPlatform", byPlatform);

        Map<AdPlacementRule.PositionType, Long> byPosition = insertions.stream()
                .collect(Collectors.groupingBy(
                        EpisodeAdInsertion::getPositionType,
                        Collectors.counting()
                ));
        summary.put("byPosition", byPosition);

        int totalDuration = insertions.stream()
                .mapToInt(i -> i.getDurationSeconds() != null ? i.getDurationSeconds() : 0)
                .sum();
        summary.put("totalAdDuration", totalDuration);

        long generatedCount = insertions.stream()
                .filter(i -> Boolean.TRUE.equals(i.getIsGenerated()))
                .count();
        summary.put("generatedCount", generatedCount);
        summary.put("pendingCount", insertions.size() - generatedCount);

        return summary;
    }

    private List<EpisodeAdInsertion> createInsertionsFromMatchResult(
            Episode episode, AdMatchResult matchResult, String platform, int version, Long teamId) {
        List<EpisodeAdInsertion> insertions = new ArrayList<>();
        Integer episodeDuration = episode.getDuration();

        for (AdMatchResult.MatchedAd matched : matchResult.getMatchedAds()) {
            Advertisement ad = advertisementRepository.findById(matched.getAdId()).orElse(null);
            AdPlacementRule rule = matched.getRuleId() != null
                    ? ruleRepository.findById(matched.getRuleId()).orElse(null) : null;

            if (ad == null) continue;

            validateInsertTime(matched.getPositionType(), matched.getInsertTimeSeconds(), episodeDuration);

            EpisodeAdInsertion insertion = EpisodeAdInsertion.builder()
                    .episode(episode)
                    .advertisement(ad)
                    .placementRule(rule)
                    .platform(platform)
                    .positionType(matched.getPositionType())
                    .insertTimeSeconds(matched.getInsertTimeSeconds())
                    .durationSeconds(matched.getDurationSeconds())
                    .versionNumber(version)
                    .isGenerated(false)
                    .build();

            insertions.add(insertionRepository.save(insertion));
        }

        return insertions;
    }

    private List<EpisodeAdInsertion> createInsertionsFromAdIds(
            Episode episode, List<Long> adIds, String platform, int version, Long teamId,
            AdPlacementRule.PositionType specifiedPositionType, Integer specifiedInsertTime) {
        List<EpisodeAdInsertion> insertions = new ArrayList<>();
        Integer episodeDuration = episode.getDuration();

        for (int i = 0; i < adIds.size(); i++) {
            Long adId = adIds.get(i);
            Advertisement ad = advertisementRepository.findByIdAndTeamId(adId, teamId).orElse(null);
            if (ad == null) continue;

            AdPlacementRule.PositionType positionType;
            int insertTime;

            if (specifiedPositionType != null) {
                positionType = specifiedPositionType;
                insertTime = calculateInsertTimeForPosition(positionType, specifiedInsertTime, episodeDuration);
            } else {
                if (insertions.isEmpty()) {
                    positionType = AdPlacementRule.PositionType.PRE_ROLL;
                    insertTime = 0;
                } else if (insertions.size() == 1) {
                    positionType = AdPlacementRule.PositionType.POST_ROLL;
                    insertTime = episodeDuration != null ? episodeDuration : 0;
                } else {
                    positionType = AdPlacementRule.PositionType.MID_ROLL;
                    insertTime = (episodeDuration != null ? episodeDuration : 600) / 2;
                }
            }

            validateInsertTime(positionType, insertTime, episodeDuration);

            EpisodeAdInsertion insertion = EpisodeAdInsertion.builder()
                    .episode(episode)
                    .advertisement(ad)
                    .placementRule(null)
                    .platform(platform)
                    .positionType(positionType)
                    .insertTimeSeconds(insertTime)
                    .durationSeconds(ad.getDurationSeconds())
                    .versionNumber(version)
                    .isGenerated(false)
                    .build();

            insertions.add(insertionRepository.save(insertion));
        }

        return insertions;
    }

    private int calculateInsertTimeForPosition(
            AdPlacementRule.PositionType positionType, Integer specifiedInsertTime, Integer episodeDuration) {
        int duration = episodeDuration != null ? episodeDuration : 0;
        return switch (positionType) {
            case PRE_ROLL -> 0;
            case POST_ROLL -> Math.max(duration, 0);
            case MID_ROLL -> {
                if (specifiedInsertTime != null && specifiedInsertTime > 0) {
                    yield specifiedInsertTime;
                }
                yield duration / 2;
            }
        };
    }

    private void validateInsertTime(
            AdPlacementRule.PositionType positionType, int insertTime, Integer episodeDuration) {
        if (positionType == AdPlacementRule.PositionType.MID_ROLL) {
            if (insertTime < 0) {
                throw new IllegalArgumentException("中插时间点不能为负数");
            }
            if (episodeDuration != null && episodeDuration > 0 && insertTime > episodeDuration) {
                throw new IllegalArgumentException(
                        String.format("中插时间点 %d 秒超出节目时长 %d 秒", insertTime, episodeDuration));
            }
        }
    }

    private void validateEpisodeOwnership(Long episodeId, Long teamId) {
        if (!episodeRepository.existsByIdAndTeamId(episodeId, teamId)) {
            throw new IllegalArgumentException("节目不存在或无权访问");
        }
    }
}
