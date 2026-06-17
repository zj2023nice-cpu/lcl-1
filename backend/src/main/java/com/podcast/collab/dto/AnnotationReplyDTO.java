package com.podcast.collab.dto;

import com.podcast.collab.entity.AnnotationReply;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnnotationReplyDTO {

    private Long id;

    private Long annotationId;

    private Long parentId;

    private Long quotedReplyId;

    private String quotedContent;

    private String quotedAuthorName;

    private String content;

    private Long createdById;

    private String createdByName;

    private String createdByAvatar;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private Long childCount;

    public static AnnotationReplyDTO fromEntity(AnnotationReply reply) {
        AnnotationReplyDTO dto = AnnotationReplyDTO.builder()
                .id(reply.getId())
                .annotationId(reply.getAnnotation() != null ? reply.getAnnotation().getId() : null)
                .parentId(reply.getParent() != null ? reply.getParent().getId() : null)
                .quotedReplyId(reply.getQuotedReply() != null ? reply.getQuotedReply().getId() : null)
                .content(reply.getContent())
                .createdAt(reply.getCreatedAt())
                .updatedAt(reply.getUpdatedAt())
                .build();

        if (reply.getParent() != null) {
            dto.setParentId(reply.getParent().getId());
        }

        if (reply.getQuotedReply() != null) {
            dto.setQuotedReplyId(reply.getQuotedReply().getId());
            dto.setQuotedContent(reply.getQuotedReply().getContent());
            if (reply.getQuotedReply().getCreatedBy() != null) {
                dto.setQuotedAuthorName(reply.getQuotedReply().getCreatedBy().getName());
            }
        }

        if (reply.getCreatedBy() != null) {
            dto.setCreatedById(reply.getCreatedBy().getId());
            dto.setCreatedByName(reply.getCreatedBy().getName());
        }

        return dto;
    }
}
