package com.podcast.collab.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubtitleExportRequest {

    private String format;

    private Boolean includeSpeaker;

    private String speakerSeparator;
}
