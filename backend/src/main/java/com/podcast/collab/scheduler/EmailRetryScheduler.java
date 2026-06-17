package com.podcast.collab.scheduler;

import com.podcast.collab.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class EmailRetryScheduler {

    private final EmailService emailService;

    @Scheduled(fixedDelayString = "${mail.retry.interval:60000}")
    public void retryFailedEmails() {
        try {
            int retried = emailService.retryFailedEmails();
            if (retried > 0) {
                log.info("定时任务：本次重试了 {} 封邮件", retried);
            }
        } catch (Exception e) {
            log.error("邮件重试定时任务执行失败", e);
        }
    }
}
