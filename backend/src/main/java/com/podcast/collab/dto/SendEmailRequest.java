package com.podcast.collab.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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
public class SendEmailRequest {

    @NotBlank(message = "模板key不能为空")
    private String templateKey;

    @NotBlank(message = "收件人邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String recipientEmail;

    private String recipientName;

    private Map<String, Object> variables;

    private String relatedEntityType;

    private Long relatedEntityId;
}
