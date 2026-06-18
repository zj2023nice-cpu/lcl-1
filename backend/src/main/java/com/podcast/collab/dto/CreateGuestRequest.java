package com.podcast.collab.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateGuestRequest {

    @NotBlank(message = "嘉宾姓名不能为空")
    @Size(max = 100, message = "姓名长度不能超过100个字符")
    private String name;

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    @Size(max = 255, message = "邮箱长度不能超过255个字符")
    private String email;

    @Size(max = 20, message = "电话号码长度不能超过20个字符")
    private String phoneNumber;

    @Size(max = 500, message = "话题领域长度不能超过500个字符")
    private String topicAreas;

    @Size(max = 500, message = "微博链接长度不能超过500个字符")
    private String weiboUrl;

    @Size(max = 100, message = "微信号长度不能超过100个字符")
    private String wechatId;

    @Size(max = 500, message = "知乎链接长度不能超过500个字符")
    private String zhihuUrl;

    @Size(max = 500, message = "B站链接长度不能超过500个字符")
    private String bilibiliUrl;

    @Size(max = 1000, message = "其他链接长度不能超过1000个字符")
    private String otherLinks;

    @Size(max = 2000, message = "简介长度不能超过2000个字符")
    private String bio;
}
