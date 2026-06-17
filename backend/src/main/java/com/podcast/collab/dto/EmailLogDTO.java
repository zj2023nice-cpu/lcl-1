package com.podcast.collab.dto;

import com.podcast.collab.entity.EmailLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailLogDTO {

    private Long id;

    private Long teamId;

    private Long templateId;

    private String templateKey;

    private String recipientEmail;

    private String recipientName;

    private String subject;

    private String content;

    private EmailLog.EmailStatus status;

    private String errorMessage;

    private Integer retryCount;

    private Integer maxRetries;

    private LocalDateTime sentAt;

    private LocalDateTime nextRetryAt;

    private String relatedEntityType;

    private Long relatedEntityId;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public static EmailLogDTO fromEntity(EmailLog log) {
        return EmailLogDTO.builder()
                .id(log.getId())
                .teamId(log.getTeamId())
                .templateId(log.getTemplateId())
                .templateKey(log.getTemplateKey())
                .recipientEmail(log.getRecipientEmail())
                .recipientName(log.getRecipientName())
                .subject(log.getSubject())
                .content(log.getContent())
                .status(log.getStatus())
                .errorMessage(log.getErrorMessage())
                .retryCount(log.getRetryCount())
                .maxRetries(log.getMaxRetries())
                .sentAt(log.getSentAt())
                .nextRetryAt(log.getNextRetryAt())
                .relatedEntityType(log.getRelatedEntityType())
                .relatedEntityId(log.getRelatedEntityId())
                .createdAt(log.getCreatedAt())
                .updatedAt(log.getUpdatedAt())
                .build();
    }
}
