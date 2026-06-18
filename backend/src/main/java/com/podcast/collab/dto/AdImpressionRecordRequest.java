package com.podcast.collab.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdImpressionRecordRequest {

    private Long adId;
    private Long episodeId;
    private String platform;
    private String region;
    private String audienceType;
    private LocalDate statDate;
    private Integer impressionIncrement;
    private Integer clickIncrement;
}
