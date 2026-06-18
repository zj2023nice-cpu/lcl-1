package com.podcast.collab.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuestEmailResponse {

    private Long emailLogId;
    private String recipientEmail;
    private String recipientName;
    private String subject;
    private String status;
    private LocalDateTime createdAt;
}
