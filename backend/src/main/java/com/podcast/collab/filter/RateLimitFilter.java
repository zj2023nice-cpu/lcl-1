package com.podcast.collab.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.podcast.collab.config.RateLimitConfig;
import com.podcast.collab.dto.ApiResponse;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

@Slf4j
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitConfig.BucketResolver bucketResolver;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        Bucket bucket = bucketResolver.resolveBucket(request);
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            String bucketType = bucketResolver.getBucketType(request);
            long remainingTokens = probe.getRemainingTokens();

            response.addHeader("X-RateLimit-Limit", getLimitHeader(bucketType));
            response.addHeader("X-RateLimit-Remaining", String.valueOf(remainingTokens));

            filterChain.doFilter(request, response);
        } else {
            long nanosToWait = probe.getNanosToWaitForRefill();
            long secondsToWait = (long) Math.ceil(nanosToWait / 1_000_000_000.0);

            String bucketType = bucketResolver.getBucketType(request);
            String clientIp = extractClientIp(request);

            log.warn("请求被限流: bucket={}, ip={}, path={}, waitTime={}s",
                    bucketType, clientIp, request.getRequestURI(), secondsToWait);

            response.setStatus(429);
            response.addHeader("Retry-After", String.valueOf(secondsToWait));
            response.addHeader("X-RateLimit-Limit", getLimitHeader(bucketType));
            response.addHeader("X-RateLimit-Remaining", "0");
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");

            String message;
            if (bucketType.equals(RateLimitConfig.LOGIN_BUCKET)) {
                message = "登录请求过于频繁，请在 " + secondsToWait + " 秒后重试";
            } else if (bucketType.equals(RateLimitConfig.UPLOAD_BUCKET)) {
                message = "上传请求过于频繁，请在 " + secondsToWait + " 秒后重试";
            } else {
                message = "请求过于频繁，请在 " + secondsToWait + " 秒后重试";
            }

            ApiResponse<Void> errorResponse = ApiResponse.error(message);
            response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
        }
    }

    private String getLimitHeader(String bucketType) {
        Duration period = bucketResolver.getBucketPeriod(bucketType);
        long minutes = period.toMinutes();
        return switch (bucketType) {
            case RateLimitConfig.LOGIN_BUCKET -> "5/" + minutes + "min";
            case RateLimitConfig.UPLOAD_BUCKET -> "10/" + minutes + "min";
            default -> "100/" + minutes + "min";
        };
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
}
