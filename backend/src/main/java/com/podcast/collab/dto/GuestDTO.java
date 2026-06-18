package com.podcast.collab.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuestDTO {

    private Long id;
    private Long teamId;
    private String name;
    private String email;
    private String phoneNumber;
    private String avatarUrl;
    private String topicAreas;
    private String weiboUrl;
    private String wechatId;
    private String zhihuUrl;
    private String bilibiliUrl;
    private String otherLinks;
    private String bio;
    private Integer participationCount;
    private Boolean isActive;
    private Long createdBy;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<GuestCollaborationHistoryDTO> collaborationHistory;
}
