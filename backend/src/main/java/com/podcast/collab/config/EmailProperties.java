package com.podcast.collab.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "mail")
public class EmailProperties {

    private boolean enabled = false;

    private String fromAddress = "noreply@example.com";

    private String fromName = "播客协作系统";

    private Retry retry = new Retry();

    private int batchSize = 10;

    @Data
    public static class Retry {
        private int maxRetries = 3;
        private int initialDelaySeconds = 60;
        private double multiplier = 2.0;
    }
}
