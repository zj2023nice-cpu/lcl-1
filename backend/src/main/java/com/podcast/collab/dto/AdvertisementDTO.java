package com.podcast.collab.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.podcast.collab.entity.Advertisement;
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
public class AdvertisementDTO {

    private Long id;
    private Long teamId;
    private String name;
    private String description;
    private String audioUrl;
    private Integer durationSeconds;
    private String advertiser;
    private Advertisement.AdStatus status;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer maxImpressions;
    private Integer currentImpressions;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AdvertisementDTO fromEntity(Advertisement entity) {
        return AdvertisementDTO.builder()
                .id(entity.getId())
                .teamId(entity.getTeamId())
                .name(entity.getName())
                .description(entity.getDescription())
                .audioUrl(entity.getAudioUrl())
                .durationSeconds(entity.getDurationSeconds())
                .advertiser(entity.getAdvertiser())
                .status(entity.getStatus())
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .maxImpressions(entity.getMaxImpressions())
                .currentImpressions(entity.getCurrentImpressions())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
