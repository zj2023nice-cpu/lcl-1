package com.podcast.collab.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendGuestEmailRequest {

    @NotNull(message = "邮件类型不能为空")
    private EmailType emailType;

    private Map<String, Object> variables;

    private Long episodeId;

    public enum EmailType {
        INVITATION,
        THANK_YOU
    }
}
