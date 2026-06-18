package com.podcast.collab.dto;

import com.podcast.collab.entity.AdPlacementRule;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdMatchResult {

    private Long episodeId;
    private String platform;
    private String region;
    private String audienceType;
    private List<MatchedAd> matchedAds;
    private Integer totalAdDuration;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatchedAd {
        private Long adId;
        private String adName;
        private String audioUrl;
        private AdPlacementRule.PositionType positionType;
        private String positionLabel;
        private Integer insertTimeSeconds;
        private String insertTimeFormatted;
        private Integer durationSeconds;
        private Integer priority;
        private Long ruleId;
    }
}
