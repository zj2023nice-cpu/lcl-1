package com.podcast.collab.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubtitleGenerateRequest {

    @NotNull(message = "音频版本ID不能为空")
    private Long audioVersionId;

    private String language;

    private Boolean speakerDetectionEnabled;

    private String title;
}
