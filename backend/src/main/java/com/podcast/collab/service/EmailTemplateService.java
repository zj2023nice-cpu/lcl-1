package com.podcast.collab.service;

import com.podcast.collab.dto.EmailTemplateDTO;
import com.podcast.collab.entity.EmailTemplate;
import com.podcast.collab.repository.EmailTemplateRepository;
import com.podcast.collab.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
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

        List<EmailTemplate> globalTemplates = emailTemplateRepository.findByTeamIdIsNull();
        List<EmailTemplate> teamTemplates = emailTemplateRepository.findByTeamId(teamId);

        Map<String, EmailTemplate> merged = new LinkedHashMap<>();
        for (EmailTemplate gt : globalTemplates) {
            merged.put(gt.getTemplateKey(), gt);
        }
        for (EmailTemplate tt : teamTemplates) {
            merged.put(tt.getTemplateKey(), tt);
        }

        return merged.values().stream()
                .map(EmailTemplateDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public EmailTemplateDTO getTemplate(Long id) {
        Long teamId = securityUtil.getCurrentTeamId();
        Optional<EmailTemplate> teamTemplate = emailTemplateRepository.findByIdAndTeamId(id, teamId);
        if (teamTemplate.isPresent()) {
            return EmailTemplateDTO.fromEntity(teamTemplate.get());
        }
        Optional<EmailTemplate> globalTemplate = emailTemplateRepository.findById(id);
        if (globalTemplate.isPresent() && globalTemplate.get().getTeamId() == null) {
            return EmailTemplateDTO.fromEntity(globalTemplate.get());
        }
        throw new IllegalArgumentException("邮件模板不存在");
    }

    @Transactional(readOnly = true)
    public EmailTemplateDTO getTemplateByKey(String templateKey) {
        Long teamId = securityUtil.getCurrentTeamId();
        Optional<EmailTemplate> teamTemplate = emailTemplateRepository.findByTeamIdAndTemplateKey(teamId, templateKey);
        if (teamTemplate.isPresent()) {
            return EmailTemplateDTO.fromEntity(teamTemplate.get());
        }
        EmailTemplate globalTemplate = emailTemplateRepository.findByTeamIdIsNullAndTemplateKey(templateKey)
                .orElseThrow(() -> new IllegalArgumentException("邮件模板不存在"));
        return EmailTemplateDTO.fromEntity(globalTemplate);
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
        Optional<EmailTemplate> teamTemplate = emailTemplateRepository.findByIdAndTeamId(id, teamId);

        EmailTemplate template;
        if (teamTemplate.isPresent()) {
            template = teamTemplate.get();
        } else {
            Optional<EmailTemplate> globalOpt = emailTemplateRepository.findById(id);
            if (globalOpt.isPresent() && globalOpt.get().getTeamId() == null) {
                template = createTeamOverrideFromGlobal(teamId, globalOpt.get(), dto);
                template = emailTemplateRepository.save(template);
                return EmailTemplateDTO.fromEntity(template);
            }
            throw new IllegalArgumentException("邮件模板不存在");
        }

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
        Optional<EmailTemplate> teamTemplate = emailTemplateRepository.findByIdAndTeamId(id, teamId);
        if (teamTemplate.isPresent()) {
            emailTemplateRepository.delete(teamTemplate.get());
            return;
        }
        Optional<EmailTemplate> globalOpt = emailTemplateRepository.findById(id);
        if (globalOpt.isPresent() && globalOpt.get().getTeamId() == null) {
            throw new IllegalArgumentException("全局模板不可删除，仅可创建团队覆盖版本");
        }
        throw new IllegalArgumentException("邮件模板不存在");
    }

    private EmailTemplate createTeamOverrideFromGlobal(Long teamId, EmailTemplate globalTemplate, EmailTemplateDTO dto) {
        Map<String, Object> variables = new HashMap<>();
        if (globalTemplate.getVariables() != null) {
            variables.putAll(globalTemplate.getVariables());
        }

        String subject = dto.getSubject() != null ? dto.getSubject() : globalTemplate.getSubject();
        String content = dto.getContent() != null ? dto.getContent() : globalTemplate.getContent();

        List<String> extractedVariables = emailService.extractVariablesFromTemplate(subject + content);
        for (String var : extractedVariables) {
            variables.putIfAbsent(var, "");
        }

        return EmailTemplate.builder()
                .teamId(teamId)
                .templateKey(globalTemplate.getTemplateKey())
                .name(dto.getName() != null ? dto.getName() : globalTemplate.getName())
                .subject(subject)
                .content(content)
                .description(dto.getDescription() != null ? dto.getDescription() : globalTemplate.getDescription())
                .isHtml(dto.getIsHtml() != null ? dto.getIsHtml() : globalTemplate.getIsHtml())
                .isEnabled(dto.getIsEnabled() != null ? dto.getIsEnabled() : globalTemplate.getIsEnabled())
                .variables(variables)
                .build();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void initializeGlobalTemplatesIfNeeded() {
        if (emailTemplateRepository.existsByTeamIdIsNullAndTemplateKey(
                EmailTemplate.TemplateType.NEW_MESSAGE.getKey())) {
            return;
        }

        for (EmailTemplate.TemplateType type : EmailTemplate.TemplateType.values()) {
            if (!emailTemplateRepository.existsByTeamIdIsNullAndTemplateKey(type.getKey())) {
                createDefaultTemplate(null, type);
            }
        }
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

            case GUEST_INVITATION:
                subject = "邀请您参与节目录制 - {{episodeTitle}}";
                content = "<html><body><h2>节目录制邀请</h2><p>您好 {{guestName}}，</p><p>我们诚挚地邀请您参与播客节目的录制。</p><div style=\"background:#f5f5f5;padding:15px;border-radius:8px;\"><h3>{{episodeTitle}}</h3><p>{{episodeDescription}}</p></div><p>如果您有意参与，请回复此邮件或通过以下方式联系我们。</p><p>期待您的回复！</p><br><p>此致</p><p>播客协作系统</p></body></html>";
                description = "邀请嘉宾参与节目录制的邮件";
                variables.put("guestName", "嘉宾姓名");
                variables.put("guestEmail", "嘉宾邮箱");
                variables.put("episodeTitle", "节目标题");
                variables.put("episodeDescription", "节目描述");
                break;

            case GUEST_THANK_YOU:
                subject = "感谢您参与节目录制 - {{episodeTitle}}";
                content = "<html><body><h2>感谢参与</h2><p>您好 {{guestName}}，</p><p>非常感谢您参与播客节目的录制！</p><div style=\"background:#f5f5f5;padding:15px;border-radius:8px;\"><h3>{{episodeTitle}}</h3><p>您的精彩分享为节目增色不少。</p></div><p>我们期待未来有更多合作机会！</p><br><p>此致</p><p>播客协作系统</p></body></html>";
                description = "感谢嘉宾参与节目录制的邮件";
                variables.put("guestName", "嘉宾姓名");
                variables.put("guestEmail", "嘉宾邮箱");
                variables.put("episodeTitle", "节目标题");
                variables.put("episodeDescription", "节目描述");
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
