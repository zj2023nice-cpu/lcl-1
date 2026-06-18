package com.podcast.collab.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.podcast.collab.entity.AdImpressionStat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdImpressionStatDTO {

    private Long id;
    private Long adId;
    private String adName;
    private Long episodeId;
    private String episodeTitle;
    private String platform;
    private String region;
    private String audienceType;
    private Integer impressionCount;
    private Integer clickCount;
    private Double clickRate;
    private LocalDate statDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AdImpressionStatDTO fromEntity(AdImpressionStat entity) {
        Double clickRate = entity.getImpressionCount() > 0
                ? Math.round(entity.getClickCount() * 10000.0 / entity.getImpressionCount()) / 100.0
                : 0.0;

        return AdImpressionStatDTO.builder()
                .id(entity.getId())
                .adId(entity.getAdvertisement() != null ? entity.getAdvertisement().getId() : null)
                .adName(entity.getAdvertisement() != null ? entity.getAdvertisement().getName() : null)
                .episodeId(entity.getEpisode() != null ? entity.getEpisode().getId() : null)
                .episodeTitle(entity.getEpisode() != null ? entity.getEpisode().getTitle() : null)
                .platform(entity.getPlatform())
                .region(entity.getRegion())
                .audienceType(entity.getAudienceType())
                .impressionCount(entity.getImpressionCount())
                .clickCount(entity.getClickCount())
                .clickRate(clickRate)
                .statDate(entity.getStatDate())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
