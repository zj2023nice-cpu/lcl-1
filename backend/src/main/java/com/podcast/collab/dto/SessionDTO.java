package com.podcast.collab.dto;

import com.podcast.collab.entity.Session;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionDTO {

    private Long id;

    private String userAgent;

    private String ipAddress;

    private LocalDateTime createdAt;

    private LocalDateTime expiresAt;

    private Boolean isCurrent;

    public static SessionDTO fromEntity(Session session, String currentRefreshToken) {
        return SessionDTO.builder()
                .id(session.getId())
                .userAgent(session.getUserAgent())
                .ipAddress(session.getIpAddress())
                .createdAt(session.getCreatedAt())
                .expiresAt(session.getExpiresAt())
                .isCurrent(session.getRefreshToken().equals(currentRefreshToken))
                .build();
    }
}
