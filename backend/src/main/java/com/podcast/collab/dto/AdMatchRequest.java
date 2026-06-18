package com.podcast.collab.dto;

import com.podcast.collab.entity.AdPlacementRule;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdMatchRequest {

    private Long episodeId;
    private Long programId;
    private Integer episodeDuration;
    private String platform;
    private String region;
    private String audienceType;
    private List<AdPlacementRule.PositionType> positionTypes;
}
