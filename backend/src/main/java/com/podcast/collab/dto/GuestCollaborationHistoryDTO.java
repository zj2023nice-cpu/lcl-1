package com.podcast.collab.dto;

import com.podcast.collab.entity.GuestCollaborationHistory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuestCollaborationHistoryDTO {

    private Long id;
    private Long teamId;
    private Long guestId;
    private Long episodeId;
    private String episodeTitle;
    private GuestCollaborationHistory.CollaborationType collaborationType;
    private String topic;
    private LocalDateTime recordingDate;
    private LocalDateTime publishDate;
    private String feedback;
    private Integer rating;
    private String notes;
    private Long createdBy;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
