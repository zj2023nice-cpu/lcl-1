package com.podcast.collab.dto;

import com.podcast.collab.entity.Annotation;
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
public class AnnotationDTO {
    
    private Long id;
    
    private Long episodeId;
    
    private String episodeTitle;
    
    private Long audioVersionId;
    
    private Integer audioVersion;
    
    private BigDecimal startTime;
    
    private BigDecimal endTime;
    
    private String content;
    
    private Annotation.Type type;
    
    private Annotation.Status status;
    
    private Annotation.Priority priority;
    
    private Long assigneeId;
    
    private String assigneeName;
    
    private Long createdById;
    
    private String createdByName;
    
    private Long resolvedById;
    
    private String resolvedByName;
    
    private LocalDateTime resolvedAt;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    public static AnnotationDTO fromEntity(Annotation annotation) {
        AnnotationDTO dto = AnnotationDTO.builder()
                .id(annotation.getId())
                .episodeId(annotation.getEpisode() != null ? annotation.getEpisode().getId() : null)
                .episodeTitle(annotation.getEpisode() != null ? annotation.getEpisode().getTitle() : null)
                .audioVersionId(annotation.getAudioVersion() != null ? annotation.getAudioVersion().getId() : null)
                .audioVersion(annotation.getAudioVersion() != null ? annotation.getAudioVersion().getVersion() : null)
                .startTime(annotation.getStartTime())
                .endTime(annotation.getEndTime())
                .content(annotation.getContent())
                .type(annotation.getType())
                .status(annotation.getStatus())
                .priority(annotation.getPriority())
                .resolvedAt(annotation.getResolvedAt())
                .createdAt(annotation.getCreatedAt())
                .updatedAt(annotation.getUpdatedAt())
                .build();
        
        if (annotation.getAssignee() != null) {
            dto.setAssigneeId(annotation.getAssignee().getId());
            dto.setAssigneeName(annotation.getAssignee().getName());
        }
        
        if (annotation.getCreatedBy() != null) {
            dto.setCreatedById(annotation.getCreatedBy().getId());
            dto.setCreatedByName(annotation.getCreatedBy().getName());
        }
        
        if (annotation.getResolvedBy() != null) {
            dto.setResolvedById(annotation.getResolvedBy().getId());
            dto.setResolvedByName(annotation.getResolvedBy().getName());
        }
        
        return dto;
    }
}
