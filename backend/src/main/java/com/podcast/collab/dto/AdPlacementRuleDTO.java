package com.podcast.collab.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.podcast.collab.entity.AdPlacementRule;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdPlacementRuleDTO {

    private Long id;
    private Long teamId;
    private Long adId;
    private String adName;
    private AdPlacementRule.PositionType positionType;
    private Integer insertTimeSeconds;
    private Integer priority;
    private Boolean isEnabled;
    private List<String> targetPlatforms;
    private List<String> targetRegions;
    private List<String> targetAudienceTypes;
    private List<Long> programIds;
    private List<Long> episodeIds;
    private Integer minEpisodeDuration;
    private Integer maxEpisodeDuration;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AdPlacementRuleDTO fromEntity(AdPlacementRule entity) {
        return AdPlacementRuleDTO.builder()
                .id(entity.getId())
                .teamId(entity.getTeamId())
                .adId(entity.getAdvertisement() != null ? entity.getAdvertisement().getId() : null)
                .adName(entity.getAdvertisement() != null ? entity.getAdvertisement().getName() : null)
                .positionType(entity.getPositionType())
                .insertTimeSeconds(entity.getInsertTimeSeconds())
                .priority(entity.getPriority())
                .isEnabled(entity.getIsEnabled())
                .targetPlatforms(entity.getTargetPlatforms())
                .targetRegions(entity.getTargetRegions())
                .targetAudienceTypes(entity.getTargetAudienceTypes())
                .programIds(entity.getProgramIds())
                .episodeIds(entity.getEpisodeIds())
                .minEpisodeDuration(entity.getMinEpisodeDuration())
                .maxEpisodeDuration(entity.getMaxEpisodeDuration())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
