package com.podcast.collab.service;

import com.podcast.collab.entity.AuditLog;
import com.podcast.collab.entity.Team;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.AuditLogRepository;
import com.podcast.collab.repository.TeamRepository;
import com.podcast.collab.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {
    
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final HttpServletRequest request;
    
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAction(Team team, User user, String action, String entityType, Long entityId, Map<String, Object> details) {
        try {
            AuditLog auditLog = AuditLog.builder()
                    .team(team)
                    .user(user)
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .details(details)
                    .ipAddress(getClientIp())
                    .build();
            
            auditLogRepository.save(auditLog);
            
            log.debug("审计日志: 用户={}, 动作={}, 实体={}:{}", 
                    user != null ? user.getEmail() : "system", 
                    action, entityType, entityId);
            
        } catch (Exception e) {
            log.error("保存审计日志失败: {}", e.getMessage());
        }
    }
    
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAction(Long teamId, Long userId, String action, String entityType, Long entityId, Map<String, Object> details) {
        Team team = null;
        User user = null;
        
        try {
            if (teamId != null) {
                team = teamRepository.findById(teamId).orElse(null);
            }
            if (userId != null) {
                user = userRepository.findById(userId).orElse(null);
            }
        } catch (Exception e) {
            log.warn("获取团队或用户信息失败: {}", e.getMessage());
        }
        
        logAction(team, user, action, entityType, entityId, details);
    }
    
    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogs(Long teamId, int page, int size) {
        List<AuditLog> logs = auditLogRepository.findByTeamId(teamId);
        int start = page * size;
        int end = Math.min(start + size, logs.size());
        return start < logs.size() ? logs.subList(start, end) : List.of();
    }
    
    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsByUser(Long teamId, Long userId) {
        return auditLogRepository.findByUserIdAndTeamId(userId, teamId);
    }
    
    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsByEntity(Long teamId, String entityType, Long entityId) {
        return auditLogRepository.findByEntityTypeAndEntityIdAndTeamId(entityType, entityId, teamId);
    }
    
    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsByDateRange(Long teamId, LocalDateTime start, LocalDateTime end) {
        return auditLogRepository.findByTeamIdAndCreatedAtBetween(teamId, start, end);
    }
    
    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsByAction(Long teamId, String action) {
        return auditLogRepository.findByTeamIdAndAction(teamId, action);
    }
    
    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsFiltered(Long teamId, String action, Long userId,
                                                 LocalDateTime startTime, LocalDateTime endTime) {
        return auditLogRepository.findByTeamIdWithFilters(teamId, action, userId, startTime, endTime);
    }
    
    private String getClientIp() {
        if (request == null) {
            return "unknown";
        }
        
        try {
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
                return xForwardedFor.split(",")[0].trim();
            }
            
            String xRealIp = request.getHeader("X-Real-IP");
            if (xRealIp != null && !xRealIp.isEmpty()) {
                return xRealIp;
            }
            
            return request.getRemoteAddr();
        } catch (Exception e) {
            return "unknown";
        }
    }
}
