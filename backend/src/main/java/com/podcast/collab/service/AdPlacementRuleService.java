package com.podcast.collab.service;

import com.podcast.collab.dto.AdMatchRequest;
import com.podcast.collab.dto.AdMatchResult;
import com.podcast.collab.dto.AdPlacementRuleDTO;
import com.podcast.collab.entity.AdPlacementRule;
import com.podcast.collab.entity.Advertisement;
import com.podcast.collab.repository.AdPlacementRuleRepository;
import com.podcast.collab.repository.AdvertisementRepository;
import com.podcast.collab.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdPlacementRuleService {

    private final AdPlacementRuleRepository ruleRepository;
    private final AdvertisementRepository advertisementRepository;
    private final SecurityUtil securityUtil;

    @Transactional(readOnly = true)
    public List<AdPlacementRuleDTO> getAllRules() {
        Long teamId = securityUtil.getCurrentTeamId();
        return ruleRepository.findByTeamId(teamId).stream()
                .map(AdPlacementRuleDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AdPlacementRuleDTO getRule(Long id) {
        Long teamId = securityUtil.getCurrentTeamId();
        AdPlacementRule rule = ruleRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("投放规则不存在"));
        return AdPlacementRuleDTO.fromEntity(rule);
    }

    @Transactional(readOnly = true)
    public List<AdPlacementRuleDTO> getRulesByAd(Long adId) {
        Long teamId = securityUtil.getCurrentTeamId();
        return ruleRepository.findByAdIdAndTeamId(adId, teamId).stream()
                .map(AdPlacementRuleDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public AdPlacementRuleDTO createRule(AdPlacementRuleDTO dto) {
        Long teamId = securityUtil.getCurrentTeamId();

        Advertisement ad = advertisementRepository.findByIdAndTeamId(dto.getAdId(), teamId)
                .orElseThrow(() -> new IllegalArgumentException("广告不存在"));

        validateRule(dto, ad);

        AdPlacementRule rule = AdPlacementRule.builder()
                .teamId(teamId)
                .advertisement(ad)
                .positionType(dto.getPositionType())
                .insertTimeSeconds(dto.getInsertTimeSeconds() != null ? dto.getInsertTimeSeconds() : 0)
                .priority(dto.getPriority() != null ? dto.getPriority() : 0)
                .isEnabled(dto.getIsEnabled() != null ? dto.getIsEnabled() : true)
                .targetPlatforms(dto.getTargetPlatforms())
                .targetRegions(dto.getTargetRegions())
                .targetAudienceTypes(dto.getTargetAudienceTypes())
                .programIds(dto.getProgramIds())
                .episodeIds(dto.getEpisodeIds())
                .minEpisodeDuration(dto.getMinEpisodeDuration() != null ? dto.getMinEpisodeDuration() : 0)
                .maxEpisodeDuration(dto.getMaxEpisodeDuration() != null ? dto.getMaxEpisodeDuration() : 0)
                .build();

        rule = ruleRepository.save(rule);
        return AdPlacementRuleDTO.fromEntity(rule);
    }

    @Transactional
    public AdPlacementRuleDTO updateRule(Long id, AdPlacementRuleDTO dto) {
        Long teamId = securityUtil.getCurrentTeamId();
        AdPlacementRule rule = ruleRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("投放规则不存在"));

        if (dto.getPositionType() != null) {
            rule.setPositionType(dto.getPositionType());
        }
        if (dto.getInsertTimeSeconds() != null) {
            rule.setInsertTimeSeconds(dto.getInsertTimeSeconds());
        }
        if (dto.getPriority() != null) {
            rule.setPriority(dto.getPriority());
        }
        if (dto.getIsEnabled() != null) {
            rule.setIsEnabled(dto.getIsEnabled());
        }
        if (dto.getTargetPlatforms() != null) {
            rule.setTargetPlatforms(dto.getTargetPlatforms());
        }
        if (dto.getTargetRegions() != null) {
            rule.setTargetRegions(dto.getTargetRegions());
        }
        if (dto.getTargetAudienceTypes() != null) {
            rule.setTargetAudienceTypes(dto.getTargetAudienceTypes());
        }
        if (dto.getProgramIds() != null) {
            rule.setProgramIds(dto.getProgramIds());
        }
        if (dto.getEpisodeIds() != null) {
            rule.setEpisodeIds(dto.getEpisodeIds());
        }
        if (dto.getMinEpisodeDuration() != null) {
            rule.setMinEpisodeDuration(dto.getMinEpisodeDuration());
        }
        if (dto.getMaxEpisodeDuration() != null) {
            rule.setMaxEpisodeDuration(dto.getMaxEpisodeDuration());
        }

        rule = ruleRepository.save(rule);
        return AdPlacementRuleDTO.fromEntity(rule);
    }

    @Transactional
    public void deleteRule(Long id) {
        Long teamId = securityUtil.getCurrentTeamId();
        AdPlacementRule rule = ruleRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("投放规则不存在"));
        ruleRepository.delete(rule);
    }

    @Transactional
    public AdPlacementRuleDTO toggleRuleEnabled(Long id) {
        Long teamId = securityUtil.getCurrentTeamId();
        AdPlacementRule rule = ruleRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("投放规则不存在"));
        rule.setIsEnabled(!rule.getIsEnabled());
        rule = ruleRepository.save(rule);
        return AdPlacementRuleDTO.fromEntity(rule);
    }

    @Transactional(readOnly = true)
    public AdMatchResult matchAdvertisements(AdMatchRequest request) {
        Long teamId = securityUtil.getCurrentTeamId();
        LocalDate today = LocalDate.now();

        List<AdPlacementRule.PositionType> positionTypes = request.getPositionTypes();
        if (positionTypes == null || positionTypes.isEmpty()) {
            positionTypes = Arrays.asList(
                    AdPlacementRule.PositionType.PRE_ROLL,
                    AdPlacementRule.PositionType.MID_ROLL,
                    AdPlacementRule.PositionType.POST_ROLL
            );
        }

        List<Advertisement> activeAds = advertisementRepository.findActiveAdsByTeamId(teamId, today);
        Set<Long> activeAdIds = activeAds.stream().map(Advertisement::getId).collect(Collectors.toSet());

        List<AdPlacementRule> allRules = ruleRepository.findEnabledByTeamId(teamId);

        Map<AdPlacementRule.PositionType, List<AdPlacementRule>> rulesByPosition = allRules.stream()
                .filter(rule -> activeAdIds.contains(rule.getAdvertisement().getId()))
                .filter(rule -> positionTypes.contains(rule.getPositionType()))
                .filter(rule -> matchesPlatform(rule, request.getPlatform()))
                .filter(rule -> matchesRegion(rule, request.getRegion()))
                .filter(rule -> matchesAudienceType(rule, request.getAudienceType()))
                .filter(rule -> matchesProgram(rule, request.getProgramId()))
                .filter(rule -> matchesEpisode(rule, request.getEpisodeId()))
                .filter(rule -> matchesEpisodeDuration(rule, request.getEpisodeDuration()))
                .sorted(Comparator.comparingInt(AdPlacementRule::getPriority).reversed())
                .collect(Collectors.groupingBy(AdPlacementRule::getPositionType));

        List<AdMatchResult.MatchedAd> matchedAds = new ArrayList<>();
        int totalAdDuration = 0;

        for (AdPlacementRule.PositionType positionType : positionTypes) {
            List<AdPlacementRule> rules = rulesByPosition.getOrDefault(positionType, Collections.emptyList());
            Set<Long> usedAdIds = new HashSet<>();

            for (AdPlacementRule rule : rules) {
                if (usedAdIds.contains(rule.getAdvertisement().getId())) {
                    continue;
                }
                usedAdIds.add(rule.getAdvertisement().getId());

                String positionLabel = switch (positionType) {
                    case PRE_ROLL -> "片头";
                    case MID_ROLL -> "中插";
                    case POST_ROLL -> "片尾";
                };

                int insertTime = calculateInsertTime(positionType, rule.getInsertTimeSeconds(), request.getEpisodeDuration());
                int h = insertTime / 3600;
                int m = (insertTime % 3600) / 60;
                int s = insertTime % 60;
                String timeFormatted = String.format("%02d:%02d:%02d", h, m, s);

                Advertisement ad = rule.getAdvertisement();
                AdMatchResult.MatchedAd matchedAd = AdMatchResult.MatchedAd.builder()
                        .adId(ad.getId())
                        .adName(ad.getName())
                        .audioUrl(ad.getAudioUrl())
                        .positionType(positionType)
                        .positionLabel(positionLabel)
                        .insertTimeSeconds(insertTime)
                        .insertTimeFormatted(timeFormatted)
                        .durationSeconds(ad.getDurationSeconds())
                        .priority(rule.getPriority())
                        .ruleId(rule.getId())
                        .build();

                matchedAds.add(matchedAd);
                totalAdDuration += ad.getDurationSeconds();
            }
        }

        matchedAds.sort(Comparator.comparingInt(AdMatchResult.MatchedAd::getInsertTimeSeconds));

        return AdMatchResult.builder()
                .episodeId(request.getEpisodeId())
                .platform(request.getPlatform())
                .region(request.getRegion())
                .audienceType(request.getAudienceType())
                .matchedAds(matchedAds)
                .totalAdDuration(totalAdDuration)
                .build();
    }

    private int calculateInsertTime(AdPlacementRule.PositionType positionType, int ruleInsertTime, Integer episodeDuration) {
        int duration = episodeDuration != null ? episodeDuration : 0;
        return switch (positionType) {
            case PRE_ROLL -> 0;
            case POST_ROLL -> Math.max(duration, 0);
            case MID_ROLL -> {
                if (ruleInsertTime > 0) {
                    yield ruleInsertTime;
                }
                yield duration / 2;
            }
        };
    }

    private boolean matchesPlatform(AdPlacementRule rule, String platform) {
        if (platform == null || platform.isEmpty()) {
            return true;
        }
        List<String> targets = rule.getTargetPlatforms();
        return targets == null || targets.isEmpty() || targets.contains(platform);
    }

    private boolean matchesRegion(AdPlacementRule rule, String region) {
        if (region == null || region.isEmpty()) {
            return true;
        }
        List<String> targets = rule.getTargetRegions();
        return targets == null || targets.isEmpty() || targets.contains(region);
    }

    private boolean matchesAudienceType(AdPlacementRule rule, String audienceType) {
        if (audienceType == null || audienceType.isEmpty()) {
            return true;
        }
        List<String> targets = rule.getTargetAudienceTypes();
        return targets == null || targets.isEmpty() || targets.contains(audienceType);
    }

    private boolean matchesProgram(AdPlacementRule rule, Long programId) {
        if (programId == null) {
            return true;
        }
        List<Long> targets = rule.getProgramIds();
        return targets == null || targets.isEmpty() || targets.contains(programId);
    }

    private boolean matchesEpisode(AdPlacementRule rule, Long episodeId) {
        if (episodeId == null) {
            return true;
        }
        List<Long> targets = rule.getEpisodeIds();
        return targets == null || targets.isEmpty() || targets.contains(episodeId);
    }

    private boolean matchesEpisodeDuration(AdPlacementRule rule, Integer episodeDuration) {
        if (episodeDuration == null) {
            return true;
        }
        int minDur = rule.getMinEpisodeDuration() != null ? rule.getMinEpisodeDuration() : 0;
        int maxDur = rule.getMaxEpisodeDuration() != null ? rule.getMaxEpisodeDuration() : 0;
        if (minDur > 0 && episodeDuration < minDur) {
            return false;
        }
        if (maxDur > 0 && episodeDuration > maxDur) {
            return false;
        }
        return true;
    }

    private void validateRule(AdPlacementRuleDTO dto, Advertisement ad) {
        if (dto.getPositionType() == null) {
            throw new IllegalArgumentException("必须指定广告位置类型");
        }
        if (dto.getPositionType() == AdPlacementRule.PositionType.MID_ROLL) {
            if (dto.getInsertTimeSeconds() != null && dto.getInsertTimeSeconds() < 0) {
                throw new IllegalArgumentException("中插时间点不能为负数");
            }
        }
        if (dto.getMinEpisodeDuration() != null && dto.getMaxEpisodeDuration() != null
                && dto.getMaxEpisodeDuration() > 0 && dto.getMinEpisodeDuration() > dto.getMaxEpisodeDuration()) {
            throw new IllegalArgumentException("最小时长不能大于最大时长");
        }
    }
}
