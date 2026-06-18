package com.podcast.collab.config;

import com.podcast.collab.service.EmailTemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class GlobalEmailTemplateInitializer implements ApplicationRunner {

    private final EmailTemplateService emailTemplateService;

    @Override
    public void run(ApplicationArguments args) {
        try {
            emailTemplateService.initializeGlobalTemplatesIfNeeded();
            log.info("全局邮件模板初始化完成");
        } catch (Exception e) {
            log.warn("全局邮件模板初始化失败，将在首次使用时重试: {}", e.getMessage());
        }
    }
}
