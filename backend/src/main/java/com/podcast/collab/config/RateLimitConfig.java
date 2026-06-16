package com.podcast.collab.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.local.LocalBucketBuilder;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

@Slf4j
@Configuration
public class RateLimitConfig {

    public static final String DEFAULT_BUCKET = "DEFAULT_BUCKET";
    public static final String LOGIN_BUCKET = "LOGIN_BUCKET";
    public static final String UPLOAD_BUCKET = "UPLOAD_BUCKET";

    private static final long DEFAULT_CAPACITY = 100;
    private static final long LOGIN_CAPACITY = 5;
    private static final long UPLOAD_CAPACITY = 10;

    private static final Duration DEFAULT_PERIOD = Duration.ofMinutes(1);
    private static final Duration LOGIN_PERIOD = Duration.ofMinutes(1);
    private static final Duration UPLOAD_PERIOD = Duration.ofMinutes(1);

    private final Map<String, Bucket> bucketCache = new ConcurrentHashMap<>();

    @Bean
    public BucketResolver bucketResolver() {
        return new BucketResolver() {
            @Override
            public Bucket resolveBucket(HttpServletRequest request) {
                String bucketType = determineBucketType(request);
                String clientIp = extractClientIp(request);
                String cacheKey = bucketType + ":" + clientIp;

                return bucketCache.computeIfAbsent(cacheKey, key -> createBucket(bucketType));
            }

            @Override
            public String getBucketType(HttpServletRequest request) {
                return determineBucketType(request);
            }

            @Override
            public Duration getBucketPeriod(String bucketType) {
                return switch (bucketType) {
                    case LOGIN_BUCKET -> LOGIN_PERIOD;
                    case UPLOAD_BUCKET -> UPLOAD_PERIOD;
                    default -> DEFAULT_PERIOD;
                };
            }
        };
    }

    private Bucket createBucket(String bucketType) {
        Bandwidth bandwidth = switch (bucketType) {
            case LOGIN_BUCKET -> Bandwidth.builder()
                    .capacity(LOGIN_CAPACITY)
                    .refillIntervally(LOGIN_CAPACITY, LOGIN_PERIOD)
                    .build();
            case UPLOAD_BUCKET -> Bandwidth.builder()
                    .capacity(UPLOAD_CAPACITY)
                    .refillIntervally(UPLOAD_CAPACITY, UPLOAD_PERIOD)
                    .build();
            default -> Bandwidth.builder()
                    .capacity(DEFAULT_CAPACITY)
                    .refillIntervally(DEFAULT_CAPACITY, DEFAULT_PERIOD)
                    .build();
        };

        Bucket bucket = Bucket.builder()
                .addLimit(bandwidth)
                .build();

        log.debug("创建限流桶: type={}, capacity={}, period={}",
                bucketType,
                bandwidth.getCapacity(),
                bandwidth.getRefillPeriodNanos() / 1_000_000_000 + "s");

        return bucket;
    }

    private String determineBucketType(HttpServletRequest request) {
        String path = request.getRequestURI();
        String contentType = request.getContentType();

        if (path.contains("/api/auth/login")) {
            return LOGIN_BUCKET;
        }

        if (path.contains("/api/audio/upload") ||
                (contentType != null && contentType.startsWith("multipart/"))) {
            return UPLOAD_BUCKET;
        }

        return DEFAULT_BUCKET;
    }

    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }

        return request.getRemoteAddr();
    }

    public interface BucketResolver {
        Bucket resolveBucket(HttpServletRequest request);
        String getBucketType(HttpServletRequest request);
        Duration getBucketPeriod(String bucketType);
    }
}
