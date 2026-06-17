package com.podcast.collab.dto;

import com.podcast.collab.entity.EmailTemplate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailTemplateDTO {

    private Long id;

    private Long teamId;

    private String templateKey;

    private String name;

    private String subject;

    private String content;

    private String description;

    private Boolean isHtml;

    private Boolean isEnabled;

    private Map<String, Object> variables;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public static EmailTemplateDTO fromEntity(EmailTemplate template) {
        return EmailTemplateDTO.builder()
                .id(template.getId())
                .teamId(template.getTeamId())
                .templateKey(template.getTemplateKey())
                .name(template.getName())
                .subject(template.getSubject())
                .content(template.getContent())
                .description(template.getDescription())
                .isHtml(template.getIsHtml())
                .isEnabled(template.getIsEnabled())
                .variables(template.getVariables())
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .build();
    }
}
