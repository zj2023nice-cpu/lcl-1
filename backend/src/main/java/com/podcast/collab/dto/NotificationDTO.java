package com.podcast.collab.dto;

import com.podcast.collab.entity.Notification;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {
    
    private Long id;
    
    private Long userId;
    
    private String userName;
    
    private Notification.NotificationType type;
    
    private String title;
    
    private String content;
    
    private String relatedEntityType;
    
    private Long relatedEntityId;
    
    private Boolean isRead;
    
    private LocalDateTime createdAt;
    
    public static NotificationDTO fromEntity(Notification notification) {
        return NotificationDTO.builder()
                .id(notification.getId())
                .userId(notification.getUser() != null ? notification.getUser().getId() : null)
                .userName(notification.getUser() != null ? notification.getUser().getName() : null)
                .type(notification.getType())
                .title(notification.getTitle())
                .content(notification.getContent())
                .relatedEntityType(notification.getRelatedEntityType())
                .relatedEntityId(notification.getRelatedEntityId())
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
