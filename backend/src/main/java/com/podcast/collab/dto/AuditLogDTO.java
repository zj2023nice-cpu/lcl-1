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
public class AuditLogDTO {

    private Long id;

    private Long teamId;

    private Long userId;

    private String userEmail;

    private String userName;

    private String action;

    private String entityType;

    private Long entityId;

    private Map<String, Object> details;

    private String ipAddress;

    private LocalDateTime createdAt;

    public static AuditLogDTO fromEntity(AuditLog auditLog) {
        AuditLogDTO dto = AuditLogDTO.builder()
                .id(auditLog.getId())
                .action(auditLog.getAction())
                .entityType(auditLog.getEntityType())
                .entityId(auditLog.getEntityId())
                .details(auditLog.getDetails())
                .ipAddress(auditLog.getIpAddress())
                .createdAt(auditLog.getCreatedAt())
                .build();

        if (auditLog.getTeam() != null) {
            dto.setTeamId(auditLog.getTeam().getId());
        }
        if (auditLog.getUser() != null) {
            dto.setUserId(auditLog.getUser().getId());
            dto.setUserEmail(auditLog.getUser().getEmail());
            dto.setUserName(auditLog.getUser().getName());
        }

        return dto;
    }
}
