package com.podcast.collab.service;

import com.podcast.collab.config.EmailProperties;
import com.podcast.collab.dto.EmailPreviewResponse;
import com.podcast.collab.entity.EmailLog;
import com.podcast.collab.entity.EmailTemplate;
import com.podcast.collab.repository.EmailLogRepository;
import com.podcast.collab.repository.EmailTemplateRepository;
import com.podcast.collab.security.SecurityUtil;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.PageRequest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.UnsupportedEncodingException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final EmailProperties emailProperties;
    private final EmailTemplateRepository emailTemplateRepository;
    private final EmailLogRepository emailLogRepository;
    private final SecurityUtil securityUtil;

    @Lazy
    @Autowired
    private EmailTemplateService emailTemplateService;

    @Lazy
    @Autowired
    private EmailService self;

    private static final Pattern VARIABLE_PATTERN = Pattern.compile("\\{\\{(\\w+)\\}\\}");

    public String renderTemplate(String template, Map<String, Object> variables) {
        if (template == null || variables == null || variables.isEmpty()) {
            return template;
        }
        StringBuffer result = new StringBuffer();
        Matcher matcher = VARIABLE_PATTERN.matcher(template);
        while (matcher.find()) {
            String variableName = matcher.group(1);
            Object value = variables.get(variableName);
            String replacement = value != null ? value.toString() : "";
            matcher.appendReplacement(result, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    public EmailPreviewResponse previewEmail(String subject, String content, Map<String, Object> variables) {
        String renderedSubject = renderTemplate(subject, variables);
        String renderedContent = renderTemplate(content, variables);
        return EmailPreviewResponse.builder()
                .subject(renderedSubject)
                .content(renderedContent)
                .build();
    }

    @Transactional
    public EmailLog queueEmail(String templateKey, String recipientEmail, String recipientName,
                               Map<String, Object> variables, String relatedEntityType, Long relatedEntityId) {
        Long teamId = securityUtil.getCurrentTeamId();
        return queueEmail(teamId, templateKey, recipientEmail, recipientName, variables, relatedEntityType, relatedEntityId);
    }

    @Transactional
    public EmailLog queueEmail(Long teamId, String templateKey, String recipientEmail, String recipientName,
                               Map<String, Object> variables, String relatedEntityType, Long relatedEntityId) {
        Optional<EmailTemplate> teamTemplate = emailTemplateRepository.findByTeamIdAndTemplateKey(teamId, templateKey);
        EmailTemplate template;
        if (teamTemplate.isPresent()) {
            template = teamTemplate.get();
        } else {
            Optional<EmailTemplate> globalOpt = emailTemplateRepository.findByTeamIdIsNullAndTemplateKey(templateKey);
            if (globalOpt.isEmpty()) {
                emailTemplateService.initializeGlobalTemplatesIfNeeded();
                globalOpt = emailTemplateRepository.findByTeamIdIsNullAndTemplateKey(templateKey);
            }
            template = globalOpt.orElseThrow(() -> new IllegalArgumentException("邮件模板不存在: " + templateKey));
        }

        if (!template.getIsEnabled()) {
            throw new IllegalStateException("邮件模板已禁用: " + templateKey);
        }

        String renderedSubject = renderTemplate(template.getSubject(), variables);
        String renderedContent = renderTemplate(template.getContent(), variables);

        EmailLog emailLog = EmailLog.builder()
                .teamId(teamId)
                .templateId(template.getId())
                .templateKey(templateKey)
                .recipientEmail(recipientEmail)
                .recipientName(recipientName)
                .subject(renderedSubject)
                .content(renderedContent)
                .status(EmailLog.EmailStatus.PENDING)
                .retryCount(0)
                .maxRetries(emailProperties.getRetry().getMaxRetries())
                .relatedEntityType(relatedEntityType)
                .relatedEntityId(relatedEntityId)
                .build();

        emailLog = emailLogRepository.save(emailLog);

        self.sendEmailAsync(emailLog.getId());

        return emailLog;
    }

    @Async
    @Transactional
    public void sendEmailAsync(Long emailLogId) {
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        sendEmail(emailLogId);
    }

    @Transactional
    public void sendEmail(Long emailLogId) {
        EmailLog emailLog = emailLogRepository.findById(emailLogId)
                .orElseThrow(() -> new IllegalArgumentException("邮件记录不存在: " + emailLogId));

        if (emailLog.getStatus() == EmailLog.EmailStatus.SENT) {
            return;
        }

        if (!emailProperties.isEnabled()) {
            log.info("邮件功能已禁用，跳过发送: {}", emailLogId);
            emailLog.setStatus(EmailLog.EmailStatus.SENT);
            emailLog.setSentAt(LocalDateTime.now());
            emailLogRepository.save(emailLog);
            return;
        }

        emailLog.setStatus(EmailLog.EmailStatus.SENDING);
        emailLogRepository.save(emailLog);

        try {
            doSendEmail(emailLog);
            emailLog.setStatus(EmailLog.EmailStatus.SENT);
            emailLog.setSentAt(LocalDateTime.now());
            emailLog.setErrorMessage(null);
            log.info("邮件发送成功: {}", emailLogId);
        } catch (Exception e) {
            log.error("邮件发送失败: {}", emailLogId, e);
            handleSendFailure(emailLog, e.getMessage());
        }

        emailLogRepository.save(emailLog);
    }

    private void doSendEmail(EmailLog emailLog) throws MessagingException, UnsupportedEncodingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(emailProperties.getFromAddress(), emailProperties.getFromName());

        if (emailLog.getRecipientName() != null && !emailLog.getRecipientName().isEmpty()) {
            helper.setTo(emailLog.getRecipientEmail(), emailLog.getRecipientName());
        } else {
            helper.setTo(emailLog.getRecipientEmail());
        }

        helper.setSubject(emailLog.getSubject());
        helper.setText(emailLog.getContent(), true);

        mailSender.send(message);
    }

    private void handleSendFailure(EmailLog emailLog, String errorMessage) {
        emailLog.setErrorMessage(errorMessage);
        emailLog.setRetryCount(emailLog.getRetryCount() + 1);

        if (emailLog.getRetryCount() >= emailLog.getMaxRetries()) {
            emailLog.setStatus(EmailLog.EmailStatus.FAILED);
            emailLog.setNextRetryAt(null);
            log.warn("邮件已达到最大重试次数，标记为失败: {}", emailLog.getId());
        } else {
            emailLog.setStatus(EmailLog.EmailStatus.RETRYING);
            long delaySeconds = calculateRetryDelay(emailLog.getRetryCount());
            emailLog.setNextRetryAt(LocalDateTime.now().plusSeconds(delaySeconds));
            log.info("邮件将在 {} 秒后重试: {}", delaySeconds, emailLog.getId());
        }
    }

    private long calculateRetryDelay(int retryCount) {
        int initialDelay = emailProperties.getRetry().getInitialDelaySeconds();
        double multiplier = emailProperties.getRetry().getMultiplier();
        return (long) (initialDelay * Math.pow(multiplier, retryCount - 1));
    }

    @Transactional
    public int retryFailedEmails() {
        List<EmailLog.EmailStatus> retryStatuses = Arrays.asList(
                EmailLog.EmailStatus.PENDING,
                EmailLog.EmailStatus.RETRYING
        );

        List<EmailLog> emailsToRetry = emailLogRepository.findEmailsToRetry(
                retryStatuses,
                LocalDateTime.now(),
                PageRequest.of(0, emailProperties.getBatchSize())
        );

        int retriedCount = 0;
        for (EmailLog emailLog : emailsToRetry) {
            try {
                sendEmail(emailLog.getId());
                retriedCount++;
            } catch (Exception e) {
                log.error("重试邮件时发生异常: {}", emailLog.getId(), e);
            }
        }

        if (retriedCount > 0) {
            log.info("本次重试了 {} 封邮件", retriedCount);
        }

        return retriedCount;
    }

    @Transactional
    public boolean retryEmail(Long emailLogId) {
        EmailLog emailLog = emailLogRepository.findById(emailLogId)
                .orElseThrow(() -> new IllegalArgumentException("邮件记录不存在: " + emailLogId));

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!emailLog.getTeamId().equals(currentTeamId)) {
            throw new IllegalArgumentException("无权操作其他团队的邮件");
        }

        if (emailLog.getStatus() != EmailLog.EmailStatus.FAILED &&
                emailLog.getStatus() != EmailLog.EmailStatus.RETRYING) {
            throw new IllegalStateException("只有失败或重试中的邮件才能手动重试");
        }

        emailLog.setRetryCount(0);
        emailLog.setStatus(EmailLog.EmailStatus.PENDING);
        emailLog.setNextRetryAt(null);
        emailLog.setErrorMessage(null);
        emailLogRepository.save(emailLog);

        self.sendEmailAsync(emailLog.getId());

        return true;
    }

    public List<String> extractVariablesFromTemplate(String content) {
        Set<String> variables = new HashSet<>();
        if (content != null) {
            Matcher matcher = VARIABLE_PATTERN.matcher(content);
            while (matcher.find()) {
                variables.add(matcher.group(1));
            }
        }
        return new ArrayList<>(variables);
    }

    @Transactional
    public void sendTestEmail(Long templateId, String toEmail, String toName) {
        Long teamId = securityUtil.getCurrentTeamId();
        Optional<EmailTemplate> teamTemplate = emailTemplateRepository.findByIdAndTeamId(templateId, teamId);
        EmailTemplate template;
        if (teamTemplate.isPresent()) {
            template = teamTemplate.get();
        } else {
            template = emailTemplateRepository.findById(templateId)
                    .orElseThrow(() -> new IllegalArgumentException("邮件模板不存在"));
            if (template.getTeamId() != null) {
                throw new IllegalArgumentException("邮件模板不存在");
            }
        }

        Map<String, Object> testVariables = new HashMap<>();
        List<String> variables = extractVariablesFromTemplate(template.getSubject() + template.getContent());
        for (String var : variables) {
            testVariables.put(var, "[示例" + var + "]");
        }

        queueEmail(teamId, template.getTemplateKey(), toEmail, toName, testVariables, null, null);
    }
}
