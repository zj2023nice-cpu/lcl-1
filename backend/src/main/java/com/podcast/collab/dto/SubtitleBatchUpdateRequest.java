package com.podcast.collab.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubtitleBatchUpdateRequest {

    @NotEmpty(message = "字幕条目不能为空")
    @Valid
    private List<SubtitleCueUpdateRequest> cues;
}
