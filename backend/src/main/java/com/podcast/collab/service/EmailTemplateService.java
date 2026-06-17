package com.podcast.collab.service;

import com.podcast.collab.dto.EmailTemplateDTO;
import com.podcast.collab.entity.EmailTemplate;
import com.podcast.collab.repository.EmailTemplateRepository;
import com.podcast.collab.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmailTemplateService {

    private final EmailTemplateRepository emailTemplateRepository;
    private final SecurityUtil securityUtil;
    private final EmailService emailService;

    @Transactional(readOnly = true)
    public List<EmailTemplateDTO> getTemplates() {
        Long teamId = securityUtil.getCurrentTeamId();
        List<EmailTemplate> templates = emailTemplateRepository.findByTeamId(teamId);

        if (templates.isEmpty()) {
            initializeDefaultTemplates(teamId);
            templates = emailTemplateRepository.findByTeamId(teamId);
        }

        return templates.stream()
                .map(EmailTemplateDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public EmailTemplateDTO getTemplate(Long id) {
        Long teamId = securityUtil.getCurrentTeamId();
        EmailTemplate template = emailTemplateRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("邮件模板不存在"));
        return EmailTemplateDTO.fromEntity(template);
    }

    @Transactional(readOnly = true)
    public EmailTemplateDTO getTemplateByKey(String templateKey) {
        Long teamId = securityUtil.getCurrentTeamId();
        EmailTemplate template = emailTemplateRepository.findByTeamIdAndTemplateKey(teamId, templateKey)
                .orElseThrow(() -> new IllegalArgumentException("邮件模板不存在"));
        return EmailTemplateDTO.fromEntity(template);
    }

    @Transactional
    public EmailTemplateDTO createTemplate(EmailTemplateDTO dto) {
        Long teamId = securityUtil.getCurrentTeamId();

        if (emailTemplateRepository.existsByTeamIdAndTemplateKey(teamId, dto.getTemplateKey())) {
            throw new IllegalArgumentException("模板key已存在");
        }

        List<String> extractedVariables = emailService.extractVariablesFromTemplate(
                dto.getSubject() + dto.getContent()
        );

        Map<String, Object> variables = new HashMap<>();
        if (dto.getVariables() != null) {
            variables.putAll(dto.getVariables());
        }
        for (String var : extractedVariables) {
            variables.putIfAbsent(var, "");
        }

        EmailTemplate template = EmailTemplate.builder()
                .teamId(teamId)
                .templateKey(dto.getTemplateKey())
                .name(dto.getName())
                .subject(dto.getSubject())
                .content(dto.getContent())
                .description(dto.getDescription())
                .isHtml(dto.getIsHtml() != null ? dto.getIsHtml() : true)
                .isEnabled(dto.getIsEnabled() != null ? dto.getIsEnabled() : true)
                .variables(variables)
                .build();

        template = emailTemplateRepository.save(template);
        return EmailTemplateDTO.fromEntity(template);
    }

    @Transactional
    public EmailTemplateDTO updateTemplate(Long id, EmailTemplateDTO dto) {
        Long teamId = securityUtil.getCurrentTeamId();
        EmailTemplate template = emailTemplateRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("邮件模板不存在"));

        if (dto.getName() != null) {
            template.setName(dto.getName());
        }
        if (dto.getSubject() != null) {
            template.setSubject(dto.getSubject());
        }
        if (dto.getContent() != null) {
            template.setContent(dto.getContent());
        }
        if (dto.getDescription() != null) {
            template.setDescription(dto.getDescription());
        }
        if (dto.getIsHtml() != null) {
            template.setIsHtml(dto.getIsHtml());
        }
        if (dto.getIsEnabled() != null) {
            template.setIsEnabled(dto.getIsEnabled());
        }

        List<String> extractedVariables = emailService.extractVariablesFromTemplate(
                template.getSubject() + template.getContent()
        );
        Map<String, Object> variables = new HashMap<>();
        if (template.getVariables() != null) {
            variables.putAll(template.getVariables());
        }
        for (String var : extractedVariables) {
            variables.putIfAbsent(var, "");
        }
        template.setVariables(variables);

        template = emailTemplateRepository.save(template);
        return EmailTemplateDTO.fromEntity(template);
    }

    @Transactional
    public void deleteTemplate(Long id) {
        Long teamId = securityUtil.getCurrentTeamId();
        EmailTemplate template = emailTemplateRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("邮件模板不存在"));
        emailTemplateRepository.delete(template);
    }

    @Transactional
    public void initializeDefaultTemplates(Long teamId) {
        if (emailTemplateRepository.existsByTeamIdAndTemplateKey(teamId, EmailTemplate.TemplateType.NEW_MESSAGE.getKey())) {
            return;
        }

        for (EmailTemplate.TemplateType type : EmailTemplate.TemplateType.values()) {
            createDefaultTemplate(teamId, type);
        }
    }

    private void createDefaultTemplate(Long teamId, EmailTemplate.TemplateType type) {
        String subject = "";
        String content = "";
        String description = "";
        Map<String, Object> variables = new HashMap<>();

        switch (type) {
            case NEW_MESSAGE:
                subject = "您有一条新消息 - {{senderName}}";
                content = "<html><body><h2>新消息通知</h2><p>您好 {{recipientName}}，</p><p>{{senderName}} 给您发送了一条新消息：</p><div style=\"background:#f5f5f5;padding:15px;border-radius:8px;\">{{messageContent}}</div><p><a href=\"{{messageUrl}}\">点击查看详情</a></p><br><p>此致</p><p>播客协作系统</p></body></html>";
                description = "当用户收到新消息时发送的通知邮件";
                variables.put("senderName", "发送者名称");
                variables.put("recipientName", "接收者名称");
                variables.put("messageContent", "消息内容");
                variables.put("messageUrl", "消息链接");
                break;

            case TASK_ASSIGNED:
                subject = "新任务分配：{{taskTitle}}";
                content = "<html><body><h2>任务分配通知</h2><p>您好 {{assigneeName}}，</p><p>您被分配了一项新任务：</p><div style=\"background:#f5f5f5;padding:15px;border-radius:8px;\"><h3>{{taskTitle}}</h3><p>{{taskDescription}}</p><p>优先级：{{priority}}</p><p>截止日期：{{dueDate}}</p></div><p><a href=\"{{taskUrl}}\">点击查看任务</a></p><br><p>此致</p><p>播客协作系统</p></body></html>";
                description = "当有新任务分配给用户时发送的通知邮件";
                variables.put("taskTitle", "任务标题");
                variables.put("taskDescription", "任务描述");
                variables.put("assigneeName", "被分配人名称");
                variables.put("priority", "优先级");
                variables.put("dueDate", "截止日期");
                variables.put("taskUrl", "任务链接");
                break;

            case TASK_COMPLETED:
                subject = "任务已完成：{{taskTitle}}";
                content = "<html><body><h2>任务完成通知</h2><p>您好，</p><p>以下任务已完成：</p><div style=\"background:#f5f5f5;padding:15px;border-radius:8px;\"><h3>{{taskTitle}}</h3><p>完成人：{{completedBy}}</p><p>完成时间：{{completedAt}}</p></div><p><a href=\"{{taskUrl}}\">点击查看任务</a></p><br><p>此致</p><p>播客协作系统</p></body></html>";
                description = "当任务完成时发送的通知邮件";
                variables.put("taskTitle", "任务标题");
                variables.put("completedBy", "完成人");
                variables.put("completedAt", "完成时间");
                variables.put("taskUrl", "任务链接");
                break;

            case INVITATION:
                subject = "{{inviterName}} 邀请您加入 {{teamName}}";
                content = "<html><body><h2>团队邀请</h2><p>您好，</p><p>{{inviterName}} 邀请您加入团队「{{teamName}}」。</p><p>点击下方链接接受邀请：</p><p><a href=\"{{invitationUrl}}\">接受邀请</a></p><p>如果链接无法点击，请复制以下地址到浏览器：</p><p>{{invitationUrl}}</p><br><p>此致</p><p>播客协作系统</p></body></html>";
                description = "邀请用户加入团队时发送的邮件";
                variables.put("inviterName", "邀请人名称");
                variables.put("teamName", "团队名称");
                variables.put("invitationUrl", "邀请链接");
                break;

            case DISTRIBUTION_STARTED:
                subject = "开始分发：{{episodeTitle}} → {{platformName}}";
                content = "<html><body><h2>分发开始通知</h2><p>您好，</p><p>节目「{{episodeTitle}}」已开始分发至平台「{{platformName}}」。</p><p>请耐心等待分发完成，完成后您会收到通知。</p><p><a href=\"{{distributionUrl}}\">查看分发进度</a></p><br><p>此致</p><p>播客协作系统</p></body></html>";
                description = "节目分发开始时的通知邮件";
                variables.put("episodeTitle", "节目标题");
                variables.put("platformName", "平台名称");
                variables.put("distributionUrl", "分发详情链接");
                break;

            case DISTRIBUTION_COMPLETED:
                subject = "分发成功：{{episodeTitle}} → {{platformName}}";
                content = "<html><body><h2>分发成功通知</h2><p>您好，</p><p>节目「{{episodeTitle}}」已成功分发至平台「{{platformName}}」。</p><p>发布链接：<a href=\"{{publishUrl}}\">{{publishUrl}}</a></p><p><a href=\"{{distributionUrl}}\">查看详情</a></p><br><p>此致</p><p>播客协作系统</p></body></html>";
                description = "节目分发成功时的通知邮件";
                variables.put("episodeTitle", "节目标题");
                variables.put("platformName", "平台名称");
                variables.put("publishUrl", "发布链接");
                variables.put("distributionUrl", "分发详情链接");
                break;

            case DISTRIBUTION_FAILED:
                subject = "分发失败：{{episodeTitle}} → {{platformName}}";
                content = "<html><body><h2>分发失败通知</h2><p>您好，</p><p>节目「{{episodeTitle}}」分发至平台「{{platformName}}」失败。</p><p>错误信息：{{errorMessage}}</p><p>请检查配置后重试。</p><p><a href=\"{{distributionUrl}}\">查看详情</a></p><br><p>此致</p><p>播客协作系统</p></body></html>";
                description = "节目分发失败时的通知邮件";
                variables.put("episodeTitle", "节目标题");
                variables.put("platformName", "平台名称");
                variables.put("errorMessage", "错误信息");
                variables.put("distributionUrl", "分发详情链接");
                break;

            case DISTRIBUTION_CANCELLED:
                subject = "分发已取消：{{episodeTitle}} → {{platformName}}";
                content = "<html><body><h2>分发取消通知</h2><p>您好，</p><p>节目「{{episodeTitle}}」分发至平台「{{platformName}}」的任务已被取消。</p><p><a href=\"{{distributionUrl}}\">查看详情</a></p><br><p>此致</p><p>播客协作系统</p></body></html>";
                description = "节目分发取消时的通知邮件";
                variables.put("episodeTitle", "节目标题");
                variables.put("platformName", "平台名称");
                variables.put("distributionUrl", "分发详情链接");
                break;

            case PASSWORD_RESET:
                subject = "密码重置请求";
                content = "<html><body><h2>密码重置</h2><p>您好 {{username}}，</p><p>您请求重置密码。请点击下方链接重置密码：</p><p><a href=\"{{resetUrl}}\">重置密码</a></p><p>该链接将在 {{expiryTime}} 后失效。</p><p>如果您没有请求重置密码，请忽略此邮件。</p><br><p>此致</p><p>播客协作系统</p></body></html>";
                description = "用户请求重置密码时发送的邮件";
                variables.put("username", "用户名");
                variables.put("resetUrl", "重置链接");
                variables.put("expiryTime", "过期时间");
                break;

            case WELCOME:
                subject = "欢迎使用播客协作系统";
                content = "<html><body><h2>欢迎加入，{{username}}！</h2><p>感谢您注册播客协作系统。</p><p>您可以：</p><ul><li>创建和管理播客节目</li><li>与团队协作编辑音频</li><li>一键分发到多个平台</li></ul><p><a href=\"{{loginUrl}}\">立即登录开始使用</a></p><br><p>此致</p><p>播客协作系统</p></body></html>";
                description = "新用户注册后的欢迎邮件";
                variables.put("username", "用户名");
                variables.put("loginUrl", "登录链接");
                break;
        }

        EmailTemplate template = EmailTemplate.builder()
                .teamId(teamId)
                .templateKey(type.getKey())
                .name(type.getDisplayName())
                .subject(subject)
                .content(content)
                .description(description)
                .isHtml(true)
                .isEnabled(true)
                .variables(variables)
                .build();

        emailTemplateRepository.save(template);
    }
}
