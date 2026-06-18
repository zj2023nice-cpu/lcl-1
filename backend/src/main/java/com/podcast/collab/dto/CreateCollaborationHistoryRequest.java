package com.podcast.collab.dto;

import com.podcast.collab.entity.GuestCollaborationHistory;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCollaborationHistoryRequest {

    @NotNull(message = "合作类型不能为空")
    private GuestCollaborationHistory.CollaborationType collaborationType;

    private Long episodeId;

    @Size(max = 500, message = "主题长度不能超过500个字符")
    private String topic;

    private LocalDateTime recordingDate;

    private LocalDateTime publishDate;

    @Size(max = 2000, message = "反馈长度不能超过2000个字符")
    private String feedback;

    private Integer rating;

    @Size(max = 2000, message = "备注长度不能超过2000个字符")
    private String notes;
}
