package com.podcast.collab.controller;

import com.podcast.collab.dto.ApiResponse;
import com.podcast.collab.dto.SessionDTO;
import com.podcast.collab.entity.Session;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.SessionRepository;
import com.podcast.collab.security.SecurityUtil;
import com.podcast.collab.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class SessionController {

    private final SessionRepository sessionRepository;
    private final SecurityUtil securityUtil;
    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SessionDTO>>> getSessions() {
        Long userId = securityUtil.getCurrentUserId();
        List<Session> sessions = sessionRepository.findByUserId(userId);

        List<SessionDTO> result = sessions.stream()
                .filter(s -> !s.isExpired())
                .map(s -> SessionDTO.fromEntity(s, null))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(@PathVariable Long id) {
        Long currentUserId = securityUtil.getCurrentUserId();
        User currentUser = securityUtil.getCurrentUser();

        Session session = sessionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("会话不存在"));

        if (!session.getUser().getId().equals(currentUserId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权删除其他用户的会话"));
        }

        auditService.logAction(currentUser.getTeam(), currentUser, "FORCE_LOGOUT",
                "SESSION", session.getUser().getId(), null);

        sessionRepository.delete(session);

        return ResponseEntity.ok(ApiResponse.success(null, "会话已删除"));
    }
}
