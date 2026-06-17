package com.podcast.collab.controller;

import com.podcast.collab.dto.ApiResponse;
import com.podcast.collab.dto.AudioEnhancementRequest;
import com.podcast.collab.entity.AudioEnhancementItem;
import com.podcast.collab.entity.AudioEnhancementTask;
import com.podcast.collab.entity.AudioVersion;
import com.podcast.collab.security.SecurityUtil;
import com.podcast.collab.service.AudioEnhancementService;
import com.podcast.collab.service.AudioService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/audio")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class AudioController {
    
    private final AudioService audioService;
    private final AudioEnhancementService audioEnhancementService;
    private final SecurityUtil securityUtil;
    
    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadAudio(
            @RequestParam Long teamId,
            @RequestParam Long episodeId,
            @RequestParam(required = false) String note,
            @RequestParam("file") MultipartFile file) throws Exception {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }
        
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("文件不能为空"));
        }
        
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("audio/")) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请上传音频文件"));
        }
        
        Long userId = securityUtil.getCurrentUserId();
        AudioVersion audioVersion = audioService.uploadAudio(teamId, episodeId, userId, file, note);
        
        Map<String, Object> result = new HashMap<>();
        result.put("id", audioVersion.getId());
        result.put("version", audioVersion.getVersion());
        result.put("fileName", audioVersion.getFileName());
        result.put("fileSize", audioVersion.getFileSize());
        result.put("duration", audioVersion.getDuration());
        result.put("mimeType", audioVersion.getMimeType());
        result.put("note", audioVersion.getNote());
        result.put("waveformData", audioVersion.getWaveformData());
        result.put("createdAt", audioVersion.getCreatedAt());
        
        return ResponseEntity.ok(ApiResponse.success(result, "音频上传成功"));
    }
    
    @GetMapping("/versions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAudioVersions(
            @RequestParam Long teamId,
            @RequestParam Long episodeId) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }
        
        List<AudioVersion> versions = audioService.getAudioVersionsByEpisode(teamId, episodeId);
        List<Map<String, Object>> result = versions.stream()
                .map(v -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", v.getId());
                    map.put("version", v.getVersion());
                    map.put("fileName", v.getFileName());
                    map.put("fileSize", v.getFileSize());
                    map.put("duration", v.getDuration());
                    map.put("mimeType", v.getMimeType());
                    map.put("note", v.getNote());
                    map.put("isArchived", v.getIsArchived());
                    map.put("createdByName", v.getCreatedBy() != null ? v.getCreatedBy().getName() : null);
                    map.put("createdAt", v.getCreatedAt());
                    return map;
                })
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAudioVersion(
            @PathVariable Long id,
            @RequestParam Long teamId) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }
        
        AudioVersion audioVersion = audioService.getAudioVersionById(teamId, id);
        
        Map<String, Object> result = new HashMap<>();
        result.put("id", audioVersion.getId());
        result.put("episodeId", audioVersion.getEpisode() != null ? audioVersion.getEpisode().getId() : null);
        result.put("version", audioVersion.getVersion());
        result.put("fileName", audioVersion.getFileName());
        result.put("fileSize", audioVersion.getFileSize());
        result.put("duration", audioVersion.getDuration());
        result.put("mimeType", audioVersion.getMimeType());
        result.put("note", audioVersion.getNote());
        result.put("waveformData", audioVersion.getWaveformData());
        result.put("isArchived", audioVersion.getIsArchived());
        result.put("createdByName", audioVersion.getCreatedBy() != null ? audioVersion.getCreatedBy().getName() : null);
        result.put("createdAt", audioVersion.getCreatedAt());
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    @GetMapping("/{id}/waveform")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getWaveformData(
            @PathVariable Long id,
            @RequestParam Long teamId) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }
        
        Map<String, Object> waveformData = audioService.getWaveformData(teamId, id);
        return ResponseEntity.ok(ApiResponse.success(waveformData));
    }
    
    @GetMapping("/{id}/download")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<String>> getDownloadUrl(
            @PathVariable Long id,
            @RequestParam Long teamId) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }
        
        String downloadUrl = audioService.getAudioDownloadUrl(teamId, id);
        return ResponseEntity.ok(ApiResponse.success(downloadUrl));
    }
    
    @GetMapping("/{id}/stream")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InputStreamResource> streamAudio(
            @PathVariable Long id,
            @RequestParam Long teamId) throws Exception {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().build();
        }
        
        AudioVersion audioVersion = audioService.getAudioVersionById(teamId, id);
        
        String presignedUrl = audioService.getAudioDownloadUrl(teamId, id);
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(audioVersion.getMimeType()));
        headers.setContentLength(audioVersion.getFileSize());
        headers.setContentDispositionFormData("attachment", audioVersion.getFileName());
        
        java.net.URL url = new java.net.URL(presignedUrl);
        InputStream inputStream = url.openStream();
        
        return ResponseEntity.ok()
                .headers(headers)
                .body(new InputStreamResource(inputStream));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<Void>> deleteAudioVersion(
            @PathVariable Long id,
            @RequestParam Long teamId) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }
        
        Long userId = securityUtil.getCurrentUserId();
        audioService.deleteAudioVersion(teamId, id, userId);
        
        return ResponseEntity.ok(ApiResponse.success(null, "音频删除成功"));
    }

    @PostMapping("/enhance")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createEnhancementTask(
            @RequestBody AudioEnhancementRequest request) throws Exception {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(request.getTeamId())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }

        Long userId = securityUtil.getCurrentUserId();
        AudioEnhancementTask task = audioEnhancementService.createEnhancementTask(request, userId);
        
        return ResponseEntity.ok(ApiResponse.success(convertTaskToMap(task), "音频增强任务创建成功"));
    }

    @GetMapping("/enhance/{taskId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getEnhancementTask(
            @PathVariable Long taskId,
            @RequestParam Long teamId) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }
        
        AudioEnhancementTask task = audioEnhancementService.getTaskById(teamId, taskId);
        return ResponseEntity.ok(ApiResponse.success(convertTaskToMap(task)));
    }

    @GetMapping("/enhance/{taskId}/items")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getEnhancementTaskItems(
            @PathVariable Long taskId,
            @RequestParam Long teamId) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }
        
        List<AudioEnhancementItem> items = audioEnhancementService.getTaskItems(teamId, taskId);
        List<Map<String, Object>> result = items.stream()
                .map(this::convertItemToMap)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/episode/{episodeId}/enhance")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getEnhancementTasksByEpisode(
            @PathVariable Long episodeId,
            @RequestParam Long teamId) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }
        
        List<AudioEnhancementTask> tasks = audioEnhancementService.getTasksByEpisode(teamId, episodeId);
        List<Map<String, Object>> result = tasks.stream()
                .map(this::convertTaskToMap)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/enhance/team")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getEnhancementTasksByTeam(
            @RequestParam Long teamId) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }
        
        List<AudioEnhancementTask> tasks = audioEnhancementService.getTasksByTeam(teamId);
        List<Map<String, Object>> result = tasks.stream()
                .map(this::convertTaskToMap)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    private Map<String, Object> convertTaskToMap(AudioEnhancementTask task) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", task.getId());
        map.put("teamId", task.getTeamId());
        map.put("episodeId", task.getEpisodeId());
        map.put("createdBy", task.getCreatedBy());
        map.put("taskType", task.getTaskType() != null ? task.getTaskType().name() : null);
        map.put("status", task.getStatus() != null ? task.getStatus().name() : null);
        map.put("progress", task.getProgress());
        map.put("totalAudioCount", task.getTotalAudioCount());
        map.put("completedAudioCount", task.getCompletedAudioCount());
        map.put("audioVersionIds", task.getAudioVersionIds());
        map.put("resultAudioVersionIds", task.getResultAudioVersionIds());
        map.put("errorMessage", task.getErrorMessage());
        map.put("settings", task.getSettings());
        map.put("createdAt", task.getCreatedAt());
        map.put("updatedAt", task.getUpdatedAt());
        map.put("completedAt", task.getCompletedAt());
        return map;
    }

    private Map<String, Object> convertItemToMap(AudioEnhancementItem item) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", item.getId());
        map.put("taskId", item.getTask() != null ? item.getTask().getId() : null);
        map.put("sourceAudioVersionId", item.getSourceAudioVersionId());
        map.put("resultAudioVersionId", item.getResultAudioVersionId());
        map.put("status", item.getStatus() != null ? item.getStatus().name() : null);
        map.put("progress", item.getProgress());
        map.put("errorMessage", item.getErrorMessage());
        map.put("startedAt", item.getStartedAt());
        map.put("completedAt", item.getCompletedAt());
        return map;
    }
}
