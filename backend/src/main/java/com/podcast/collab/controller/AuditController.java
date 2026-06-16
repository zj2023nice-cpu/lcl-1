package com.podcast.collab.controller;

import com.podcast.collab.dto.ApiResponse;
import com.podcast.collab.dto.AuditLogDTO;
import com.podcast.collab.entity.AuditLog;
import com.podcast.collab.security.SecurityUtil;
import com.podcast.collab.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class AuditController {

    private final AuditService auditService;
    private final SecurityUtil securityUtil;

    @GetMapping("/logs")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<List<AuditLogDTO>>> getAuditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) LocalDateTime startTime,
            @RequestParam(required = false) LocalDateTime endTime) {

        Long teamId = securityUtil.getCurrentTeamId();

        List<AuditLog> logs;
        if (action != null || userId != null || startTime != null || endTime != null) {
            logs = auditService.getAuditLogsFiltered(teamId, action, userId, startTime, endTime);
        } else {
            logs = auditService.getAuditLogs(teamId, 0, 100);
        }

        List<AuditLogDTO> result = logs.stream()
                .map(AuditLogDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
