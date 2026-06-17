package com.podcast.collab.controller;

import com.podcast.collab.dto.ApiResponse;
import com.podcast.collab.dto.NotificationDTO;
import com.podcast.collab.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class NotificationController {
    
    private final NotificationService notificationService;
    
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getMyNotifications(
            @RequestParam Long teamId) {
        
        try {
            List<NotificationDTO> notifications = notificationService.getMyNotifications(teamId);
            return ResponseEntity.ok(ApiResponse.success(notifications));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
    
    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(
            @RequestParam Long teamId) {
        
        try {
            Long count = notificationService.getUnreadCount(teamId);
            return ResponseEntity.ok(ApiResponse.success(count));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
    
    @PatchMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @PathVariable Long id,
            @RequestParam Long teamId) {
        
        try {
            notificationService.markAsRead(id, teamId);
            return ResponseEntity.ok(ApiResponse.success(null, "已标记为已读"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
    
    @PatchMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(
            @RequestParam Long teamId) {
        
        try {
            notificationService.markAllAsRead(teamId);
            return ResponseEntity.ok(ApiResponse.success(null, "全部标记为已读"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
