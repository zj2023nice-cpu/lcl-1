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
public class AdGenerationRequest {

    private Long episodeId;
    private List<String> platforms;
    private String region;
    private String audienceType;
    private List<Long> adIds;
    private AdPlacementRule.PositionType positionType;
    private Integer insertTimeSeconds;
    private Boolean overwriteExisting;
}
