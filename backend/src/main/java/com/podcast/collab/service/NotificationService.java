package com.podcast.collab.service;

import com.podcast.collab.dto.NotificationDTO;
import com.podcast.collab.entity.DistributionRecord;
import com.podcast.collab.entity.Notification;
import com.podcast.collab.entity.Team;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.NotificationRepository;
import com.podcast.collab.repository.TeamRepository;
import com.podcast.collab.repository.UserRepository;
import com.podcast.collab.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {
    
    private final NotificationRepository notificationRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final SecurityUtil securityUtil;
    private final EmailService emailService;
    
    @Transactional
    public void sendDistributionNotification(
            Long teamId,
            Long userId,
            Notification.NotificationType type,
            DistributionRecord record) {
        
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("团队不存在"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));
        
        String title = buildNotificationTitle(type, record);
        String content = buildNotificationContent(type, record);
        
        Notification notification = Notification.builder()
                .team(team)
                .user(user)
                .type(type)
                .title(title)
                .content(content)
                .relatedEntityType("DISTRIBUTION_RECORD")
                .relatedEntityId(record.getId())
                .isRead(false)
                .build();
        
        notificationRepository.save(notification);
        
        sendDistributionNotificationEmail(teamId, user, type, record);
    }
    
    @Transactional
    public void notifyDistributionStarted(Long teamId, DistributionRecord record, List<Long> userIds) {
        for (Long userId : userIds) {
            sendDistributionNotification(teamId, userId, 
                    Notification.NotificationType.DISTRIBUTION_STARTED, record);
        }
    }
    
    @Transactional
    public void notifyDistributionCompleted(Long teamId, DistributionRecord record, List<Long> userIds) {
        for (Long userId : userIds) {
            sendDistributionNotification(teamId, userId, 
                    Notification.NotificationType.DISTRIBUTION_COMPLETED, record);
        }
    }
    
    @Transactional
    public void notifyDistributionFailed(Long teamId, DistributionRecord record, List<Long> userIds) {
        for (Long userId : userIds) {
            sendDistributionNotification(teamId, userId, 
                    Notification.NotificationType.DISTRIBUTION_FAILED, record);
        }
    }
    
    @Transactional
    public void notifyDistributionCancelled(Long teamId, DistributionRecord record, List<Long> userIds) {
        for (Long userId : userIds) {
            sendDistributionNotification(teamId, userId, 
                    Notification.NotificationType.DISTRIBUTION_CANCELLED, record);
        }
    }
    
    @Transactional(readOnly = true)
    public List<NotificationDTO> getMyNotifications(Long teamId) {
        Long currentUserId = securityUtil.getCurrentUser().getId();
        Long currentTeamId = securityUtil.getCurrentTeamId();
        
        if (!currentTeamId.equals(teamId)) {
            throw new IllegalArgumentException("无权访问其他团队数据");
        }
        
        List<Notification> notifications = notificationRepository
                .findByUserIdAndTeamId(currentUserId, teamId);
        
        return notifications.stream()
                .map(NotificationDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public Long getUnreadCount(Long teamId) {
        Long currentUserId = securityUtil.getCurrentUser().getId();
        Long currentTeamId = securityUtil.getCurrentTeamId();
        
        if (!currentTeamId.equals(teamId)) {
            throw new IllegalArgumentException("无权访问其他团队数据");
        }
        
        return notificationRepository.countUnreadByUserIdAndTeamId(currentUserId, teamId);
    }
    
    @Transactional
    public void markAsRead(Long id, Long teamId) {
        Long currentUserId = securityUtil.getCurrentUser().getId();
        Long currentTeamId = securityUtil.getCurrentTeamId();
        
        if (!currentTeamId.equals(teamId)) {
            throw new IllegalArgumentException("无权操作其他团队数据");
        }
        
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("通知不存在"));
        
        if (!notification.getUser().getId().equals(currentUserId)) {
            throw new IllegalArgumentException("无权操作他人通知");
        }
        
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }
    
    @Transactional
    public void markAllAsRead(Long teamId) {
        Long currentUserId = securityUtil.getCurrentUser().getId();
        Long currentTeamId = securityUtil.getCurrentTeamId();
        
        if (!currentTeamId.equals(teamId)) {
            throw new IllegalArgumentException("无权操作其他团队数据");
        }
        
        List<Notification> notifications = notificationRepository
                .findUnreadByUserIdAndTeamId(currentUserId, teamId);
        
        for (Notification notification : notifications) {
            notification.setIsRead(true);
        }
        
        notificationRepository.saveAll(notifications);
    }
    
    private String resolveTemplateKey(Notification.NotificationType type) {
        return switch (type) {
            case DISTRIBUTION_STARTED -> "distribution_started";
            case DISTRIBUTION_COMPLETED -> "distribution_completed";
            case DISTRIBUTION_FAILED -> "distribution_failed";
            case DISTRIBUTION_CANCELLED -> "distribution_cancelled";
        };
    }

    private void sendDistributionNotificationEmail(Long teamId, User recipient,
                                                    Notification.NotificationType type,
                                                    DistributionRecord record) {
        try {
            String templateKey = resolveTemplateKey(type);

            String episodeTitle = record.getEpisode() != null ? record.getEpisode().getTitle() : "未知节目";
            String platformName = record.getPlatform() != null ? record.getPlatform().getName() : "未知平台";
            String distributionUrl = "/distribution/" + record.getId();

            Map<String, Object> variables = new HashMap<>();
            variables.put("episodeTitle", episodeTitle);
            variables.put("platformName", platformName);
            variables.put("distributionUrl", distributionUrl);

            if (type == Notification.NotificationType.DISTRIBUTION_COMPLETED) {
                variables.put("publishUrl", record.getPublishUrl() != null ? record.getPublishUrl() : "暂无");
            }
            if (type == Notification.NotificationType.DISTRIBUTION_FAILED) {
                variables.put("errorMessage", record.getErrorMessage() != null ? record.getErrorMessage() : "未知错误");
            }

            emailService.queueEmail(teamId, templateKey, recipient.getEmail(),
                    recipient.getName(), variables, "DISTRIBUTION_RECORD", record.getId());

            log.info("分发通知邮件已排队: userId={}, type={}, recordId={}",
                    recipient.getId(), type, record.getId());
        } catch (Exception e) {
            log.warn("分发通知邮件排队失败，不影响通知创建: userId={}, type={}, error={}",
                    recipient.getId(), type, e.getMessage());
        }
    }

    private String buildNotificationTitle(Notification.NotificationType type, DistributionRecord record) {
        String episodeTitle = record.getEpisode() != null ? record.getEpisode().getTitle() : "未知节目";
        String platformName = record.getPlatform() != null ? record.getPlatform().getName() : "未知平台";
        
        return switch (type) {
            case DISTRIBUTION_STARTED -> String.format("开始分发：%s → %s", episodeTitle, platformName);
            case DISTRIBUTION_COMPLETED -> String.format("分发成功：%s → %s", episodeTitle, platformName);
            case DISTRIBUTION_FAILED -> String.format("分发失败：%s → %s", episodeTitle, platformName);
            case DISTRIBUTION_CANCELLED -> String.format("分发已取消：%s → %s", episodeTitle, platformName);
        };
    }
    
    private String buildNotificationContent(Notification.NotificationType type, DistributionRecord record) {
        String episodeTitle = record.getEpisode() != null ? record.getEpisode().getTitle() : "未知节目";
        String platformName = record.getPlatform() != null ? record.getPlatform().getName() : "未知平台";
        
        return switch (type) {
            case DISTRIBUTION_STARTED -> String.format("节目「%s」已开始分发至平台「%s」，请等待分发完成。", 
                    episodeTitle, platformName);
            case DISTRIBUTION_COMPLETED -> String.format("节目「%s」已成功分发至平台「%s」，发布链接：%s", 
                    episodeTitle, platformName, record.getPublishUrl() != null ? record.getPublishUrl() : "暂无");
            case DISTRIBUTION_FAILED -> String.format("节目「%s」分发至平台「%s」失败，错误信息：%s", 
                    episodeTitle, platformName, record.getErrorMessage() != null ? record.getErrorMessage() : "未知错误");
            case DISTRIBUTION_CANCELLED -> String.format("节目「%s」分发至平台「%s」的任务已被取消，已退还队列。", 
                    episodeTitle, platformName);
        };
    }
}
