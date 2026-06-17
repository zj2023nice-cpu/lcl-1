package com.podcast.collab.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailPreviewRequest {

    @NotBlank(message = "主题不能为空")
    private String subject;

    @NotBlank(message = "内容不能为空")
    private String content;

    private Map<String, Object> variables;
}
