package com.podcast.collab.dto;

import com.podcast.collab.entity.SubtitleCue;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubtitleCueDTO {

    private Long id;

    private Long subtitleId;

    private BigDecimal startTime;

    private BigDecimal endTime;

    private String text;

    private String speakerId;

    private String speakerName;

    private BigDecimal confidence;

    private Integer order;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public static SubtitleCueDTO fromEntity(SubtitleCue cue) {
        return SubtitleCueDTO.builder()
                .id(cue.getId())
                .subtitleId(cue.getSubtitle() != null ? cue.getSubtitle().getId() : null)
                .startTime(cue.getStartTime())
                .endTime(cue.getEndTime())
                .text(cue.getText())
                .speakerId(cue.getSpeakerId())
                .speakerName(cue.getSpeakerName())
                .confidence(cue.getConfidence())
                .order(cue.getOrder())
                .createdAt(cue.getCreatedAt())
                .updatedAt(cue.getUpdatedAt())
                .build();
    }
}
