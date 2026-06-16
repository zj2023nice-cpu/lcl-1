package com.podcast.collab.controller;

import com.podcast.collab.dto.ApiResponse;
import com.podcast.collab.entity.AudioVersion;
import com.podcast.collab.entity.Episode;
import com.podcast.collab.entity.ShareLink;
import com.podcast.collab.entity.User;
import com.podcast.collab.security.SecurityUtil;
import com.podcast.collab.service.AuditService;
import com.podcast.collab.service.MinioService;
import com.podcast.collab.service.ShareService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/share")
@RequiredArgsConstructor
public class ShareController {

    private final ShareService shareService;
    private final SecurityUtil securityUtil;
    private final AuditService auditService;
    private final MinioService minioService;

    @Value("${app.share.base-url:http://localhost:8080}")
    private String shareBaseUrl;

    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createShareLink(
            @RequestParam Long teamId,
            @RequestParam Long episodeId,
            @RequestParam(defaultValue = "7") Integer daysValid) {

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }

        User currentUser = securityUtil.getCurrentUser();

        ShareLink shareLink = shareService.createShareLink(teamId, episodeId, currentUser.getId(), daysValid);

        String fullUrl = shareBaseUrl + "/share/" + shareLink.getToken();

        Map<String, Object> result = new HashMap<>();
        result.put("id", shareLink.getId());
        result.put("token", shareLink.getToken());
        result.put("url", fullUrl);
        result.put("expiresAt", shareLink.getExpiresAt());
        result.put("teamId", shareLink.getTeam().getId());
        result.put("episodeId", shareLink.getEpisode().getId());

        return ResponseEntity.ok(ApiResponse.success(result, "分享链接创建成功"));
    }

    @GetMapping("/{token}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getShareInfo(
            @PathVariable String token,
            HttpServletRequest request) {

        try {
            ShareLink shareLink = shareService.validateAndAccess(
                    token,
                    getClientIp(request),
                    request.getHeader("User-Agent")
            );

            Episode episode = shareLink.getEpisode();
            AudioVersion currentAudio = shareService.getCurrentAudioVersionForShare(shareLink);

            Map<String, Object> result = new HashMap<>();

            Map<String, Object> episodeInfo = new HashMap<>();
            episodeInfo.put("id", episode.getId());
            episodeInfo.put("title", episode.getTitle());
            episodeInfo.put("description", episode.getDescription());
            episodeInfo.put("duration", episode.getDuration());
            episodeInfo.put("currentVersion", episode.getCurrentVersion());
            episodeInfo.put("status", episode.getStatus());
            result.put("episode", episodeInfo);

            if (currentAudio != null) {
                Map<String, Object> audioInfo = new HashMap<>();
                audioInfo.put("id", currentAudio.getId());
                audioInfo.put("version", currentAudio.getVersion());
                audioInfo.put("fileName", currentAudio.getFileName());
                audioInfo.put("fileSize", currentAudio.getFileSize());
                audioInfo.put("duration", currentAudio.getDuration());
                audioInfo.put("mimeType", currentAudio.getMimeType());
                audioInfo.put("note", currentAudio.getNote());
                audioInfo.put("createdAt", currentAudio.getCreatedAt());
                result.put("audioVersion", audioInfo);
            }

            result.put("share", Map.of(
                    "expiresAt", shareLink.getExpiresAt(),
                    "accessCount", shareLink.getAccessCount(),
                    "createdAt", shareLink.getCreatedAt()
            ));

            return ResponseEntity.ok(ApiResponse.success(result));

        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.GONE)
                    .body(ApiResponse.error("分享链接已过期"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("分享链接不存在"));
        }
    }

    @GetMapping("/{token}/waveform")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getWaveform(
            @PathVariable String token,
            HttpServletRequest request) {

        try {
            ShareLink shareLink = shareService.validateAndAccess(
                    token,
                    getClientIp(request),
                    request.getHeader("User-Agent")
            );

            AudioVersion currentAudio = shareService.getCurrentAudioVersionForShare(shareLink);
            if (currentAudio == null || currentAudio.getWaveformData() == null) {
                return ResponseEntity.ok(ApiResponse.success(Map.of(
                        "peaks", List.of(),
                        "rms", List.of(),
                        "samples", 0
                )));
            }

            return ResponseEntity.ok(ApiResponse.success(currentAudio.getWaveformData()));

        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.GONE)
                    .body(ApiResponse.error("分享链接已过期"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("分享链接不存在"));
        }
    }

    @GetMapping("/{token}/audio")
    public ResponseEntity<?> getAudioStream(
            @PathVariable String token,
            HttpServletRequest request) {

        try {
            ShareLink shareLink = shareService.validateAndAccess(
                    token,
                    getClientIp(request),
                    request.getHeader("User-Agent")
            );

            AudioVersion currentAudio = shareService.getCurrentAudioVersionForShare(shareLink);
            if (currentAudio == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("音频文件不存在"));
            }

            String presignedUrl = minioService.getPresignedUrl(currentAudio.getFilePath(), 3600);

            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(presignedUrl))
                    .build();

        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.GONE)
                    .body(ApiResponse.error("分享链接已过期"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("分享链接不存在"));
        }
    }

    @GetMapping("/list")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getShareLinks(
            @RequestParam Long teamId,
            @RequestParam(required = false) Long episodeId) {

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }

        List<ShareLink> shareLinks = shareService.getShareLinks(teamId, episodeId);

        List<Map<String, Object>> result = shareLinks.stream().map(sl -> {
            Map<String, Object> item = new HashMap<>();
            item.put("id", sl.getId());
            item.put("token", sl.getToken());
            item.put("url", shareBaseUrl + "/share/" + sl.getToken());
            item.put("expiresAt", sl.getExpiresAt());
            item.put("accessCount", sl.getAccessCount());
            item.put("createdAt", sl.getCreatedAt());
            item.put("isExpired", sl.isExpired());
            item.put("episodeId", sl.getEpisode().getId());
            item.put("episodeTitle", sl.getEpisode().getTitle());
            if (sl.getCreatedBy() != null) {
                item.put("createdBy", Map.of(
                        "id", sl.getCreatedBy().getId(),
                        "name", sl.getCreatedBy().getName(),
                        "email", sl.getCreatedBy().getEmail()
                ));
            }
            return item;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<Void>> revokeShareLink(
            @PathVariable Long id,
            @RequestParam Long teamId) {

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }

        User currentUser = securityUtil.getCurrentUser();

        try {
            shareService.revokeShareLink(teamId, id, currentUser.getId());
            return ResponseEntity.ok(ApiResponse.success(null, "分享链接已撤销"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    private String getClientIp(HttpServletRequest request) {
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
