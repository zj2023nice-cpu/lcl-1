package com.podcast.collab.controller;

import com.podcast.collab.dto.ApiResponse;
import com.podcast.collab.dto.EmailLogDTO;
import com.podcast.collab.entity.EmailLog;
import com.podcast.collab.service.EmailLogService;
import com.podcast.collab.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/email/logs")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class EmailLogController {

    private final EmailLogService emailLogService;
    private final EmailService emailService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<EmailLogDTO>>> getEmailLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String templateKey) {
        try {
            Page<EmailLogDTO> logs = emailLogService.getEmailLogs(page, size, status, templateKey);
            return ResponseEntity.ok(ApiResponse.success(logs));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EmailLogDTO>> getEmailLog(@PathVariable Long id) {
        try {
            EmailLogDTO log = emailLogService.getEmailLog(id);
            return ResponseEntity.ok(ApiResponse.success(log));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/{id}/retry")
    public ResponseEntity<ApiResponse<Void>> retryEmail(@PathVariable Long id) {
        try {
            emailService.retryEmail(id);
            return ResponseEntity.ok(ApiResponse.success(null, "邮件已加入重试队列"));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getEmailStats() {
        try {
            Map<String, Long> stats = new HashMap<>();
            stats.put("pending", emailLogService.getEmailCountByStatus(EmailLog.EmailStatus.PENDING));
            stats.put("sent", emailLogService.getEmailCountByStatus(EmailLog.EmailStatus.SENT));
            stats.put("failed", emailLogService.getEmailCountByStatus(EmailLog.EmailStatus.FAILED));
            stats.put("retrying", emailLogService.getEmailCountByStatus(EmailLog.EmailStatus.RETRYING));
            return ResponseEntity.ok(ApiResponse.success(stats));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
