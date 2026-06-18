package com.podcast.collab.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.podcast.collab.entity.AdPlacementRule;
import com.podcast.collab.entity.EpisodeAdInsertion;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class EpisodeAdInsertionDTO {

    private Long id;
    private Long episodeId;
    private String episodeTitle;
    private Long adId;
    private String adName;
    private Long placementRuleId;
    private String platform;
    private AdPlacementRule.PositionType positionType;
    private String positionTypeLabel;
    private Integer insertTimeSeconds;
    private String insertTimeFormatted;
    private Integer durationSeconds;
    private Integer versionNumber;
    private Boolean isGenerated;
    private String generatedAudioUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static EpisodeAdInsertionDTO fromEntity(EpisodeAdInsertion entity) {
        String positionLabel = switch (entity.getPositionType()) {
            case PRE_ROLL -> "片头";
            case MID_ROLL -> "中插";
            case POST_ROLL -> "片尾";
        };

        int seconds = entity.getInsertTimeSeconds();
        int h = seconds / 3600;
        int m = (seconds % 3600) / 60;
        int s = seconds % 60;
        String timeFormatted = String.format("%02d:%02d:%02d", h, m, s);

        return EpisodeAdInsertionDTO.builder()
                .id(entity.getId())
                .episodeId(entity.getEpisode() != null ? entity.getEpisode().getId() : null)
                .episodeTitle(entity.getEpisode() != null ? entity.getEpisode().getTitle() : null)
                .adId(entity.getAdvertisement() != null ? entity.getAdvertisement().getId() : null)
                .adName(entity.getAdvertisement() != null ? entity.getAdvertisement().getName() : null)
                .placementRuleId(entity.getPlacementRule() != null ? entity.getPlacementRule().getId() : null)
                .platform(entity.getPlatform())
                .positionType(entity.getPositionType())
                .positionTypeLabel(positionLabel)
                .insertTimeSeconds(entity.getInsertTimeSeconds())
                .insertTimeFormatted(timeFormatted)
                .durationSeconds(entity.getDurationSeconds())
                .versionNumber(entity.getVersionNumber())
                .isGenerated(entity.getIsGenerated())
                .generatedAudioUrl(entity.getGeneratedAudioUrl())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
