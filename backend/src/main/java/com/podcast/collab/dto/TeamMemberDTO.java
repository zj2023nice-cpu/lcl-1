package com.podcast.collab.dto;

import com.podcast.collab.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamMemberDTO {
    
    private Long id;
    
    private String email;
    
    private String name;
    
    private String avatar;
    
    private User.Role role;
    
    private Boolean isActive;
    
    private LocalDateTime createdAt;
    
    public static TeamMemberDTO fromEntity(User user) {
        return TeamMemberDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .avatar(user.getAvatarUrl())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
