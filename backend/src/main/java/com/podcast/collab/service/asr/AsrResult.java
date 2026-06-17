package com.podcast.collab.service.asr;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AsrResult {

    private String language;

    private List<AsrCue> cues;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AsrCue {
        private BigDecimal startTime;
        private BigDecimal endTime;
        private String text;
        private String speakerId;
        private String speakerName;
        private BigDecimal confidence;
    }
}
