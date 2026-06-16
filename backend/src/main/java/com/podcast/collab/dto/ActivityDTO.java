package com.podcast.collab.dto;

import com.podcast.collab.entity.AuditLog;
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
public class ActivityDTO {
    
    private Long id;
    private String action;
    private String entityType;
    private Long entityId;
    private String userName;
    private Map<String, Object> details;
    private LocalDateTime createdAt;
    
    public static ActivityDTO fromEntity(AuditLog auditLog) {
        return ActivityDTO.builder()
                .id(auditLog.getId())
                .action(auditLog.getAction())
                .entityType(auditLog.getEntityType())
                .entityId(auditLog.getEntityId())
                .userName(auditLog.getUser() != null ? auditLog.getUser().getName() : null)
                .details(auditLog.getDetails())
                .createdAt(auditLog.getCreatedAt())
                .build();
    }
}
