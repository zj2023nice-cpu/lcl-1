package com.podcast.collab.controller;

import com.podcast.collab.dto.*;
import com.podcast.collab.entity.Subtitle;
import com.podcast.collab.security.SecurityUtil;
import com.podcast.collab.service.SubtitleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/subtitles")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class SubtitleController {

    private final SubtitleService subtitleService;
    private final SecurityUtil securityUtil;

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    public ResponseEntity<ApiResponse<SubtitleDTO>> generateSubtitle(
            @Valid @RequestBody SubtitleGenerateRequest request) throws Exception {

        Long teamId = securityUtil.getCurrentTeamId();
        Long userId = securityUtil.getCurrentUserId();

        SubtitleDTO subtitle = subtitleService.generateSubtitle(teamId, request, userId);
        return ResponseEntity.ok(ApiResponse.success(subtitle, "字幕生成任务已启动"));
    }

    @GetMapping("/audio-version/{audioVersionId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<SubtitleDTO>>> getSubtitlesByAudioVersion(
            @PathVariable Long audioVersionId,
            @RequestParam Long teamId) {

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }

        List<SubtitleDTO> subtitles = subtitleService.getSubtitlesByAudioVersion(teamId, audioVersionId);
        return ResponseEntity.ok(ApiResponse.success(subtitles));
    }

    @GetMapping("/episode/{episodeId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<SubtitleDTO>>> getSubtitlesByEpisode(
            @PathVariable Long episodeId,
            @RequestParam Long teamId) {

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }

        List<SubtitleDTO> subtitles = subtitleService.getSubtitlesByEpisode(teamId, episodeId);
        return ResponseEntity.ok(ApiResponse.success(subtitles));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<SubtitleDTO>> getSubtitleDetail(
            @PathVariable Long id,
            @RequestParam Long teamId,
            @RequestParam(defaultValue = "true") boolean includeCues) {

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }

        SubtitleDTO subtitle = subtitleService.getSubtitleDetail(teamId, id, includeCues);
        return ResponseEntity.ok(ApiResponse.success(subtitle));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    public ResponseEntity<ApiResponse<SubtitleDTO>> updateSubtitleStatus(
            @PathVariable Long id,
            @RequestParam Long teamId,
            @RequestParam Subtitle.Status status) {

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }

        Long userId = securityUtil.getCurrentUserId();
        SubtitleDTO subtitle = subtitleService.updateSubtitleStatus(teamId, id, status, userId);
        return ResponseEntity.ok(ApiResponse.success(subtitle, "字幕状态更新成功"));
    }

    @PutMapping("/cues/{cueId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    public ResponseEntity<ApiResponse<SubtitleCueDTO>> updateCue(
            @PathVariable Long cueId,
            @RequestParam Long teamId,
            @Valid @RequestBody SubtitleCueUpdateRequest request) {

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }

        Long userId = securityUtil.getCurrentUserId();
        SubtitleCueDTO cue = subtitleService.updateCue(teamId, cueId, request, userId);
        return ResponseEntity.ok(ApiResponse.success(cue, "字幕条目更新成功"));
    }

    @PutMapping("/{subtitleId}/cues/batch")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    public ResponseEntity<ApiResponse<List<SubtitleCueDTO>>> batchUpdateCues(
            @PathVariable Long subtitleId,
            @RequestParam Long teamId,
            @Valid @RequestBody SubtitleBatchUpdateRequest request) {

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }

        Long userId = securityUtil.getCurrentUserId();
        List<SubtitleCueDTO> cues = subtitleService.batchUpdateCues(teamId, subtitleId, request.getCues(), userId);
        return ResponseEntity.ok(ApiResponse.success(cues, "批量更新成功"));
    }

    @PostMapping("/{subtitleId}/cues")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    public ResponseEntity<ApiResponse<SubtitleCueDTO>> addCue(
            @PathVariable Long subtitleId,
            @RequestParam Long teamId,
            @Valid @RequestBody SubtitleCueUpdateRequest request) {

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }

        Long userId = securityUtil.getCurrentUserId();
        SubtitleCueDTO cue = subtitleService.addCue(teamId, subtitleId, request, userId);
        return ResponseEntity.ok(ApiResponse.success(cue, "字幕条目添加成功"));
    }

    @DeleteMapping("/cues/{cueId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    public ResponseEntity<ApiResponse<Void>> deleteCue(
            @PathVariable Long cueId,
            @RequestParam Long teamId) {

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }

        Long userId = securityUtil.getCurrentUserId();
        subtitleService.deleteCue(teamId, cueId, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "字幕条目删除成功"));
    }

    @PostMapping("/cues/merge")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    public ResponseEntity<ApiResponse<List<SubtitleCueDTO>>> mergeCues(
            @RequestParam Long teamId,
            @RequestBody List<Long> cueIds) {

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }

        Long userId = securityUtil.getCurrentUserId();
        List<SubtitleCueDTO> cues = subtitleService.mergeCues(teamId, cueIds, userId);
        return ResponseEntity.ok(ApiResponse.success(cues, "字幕合并成功"));
    }

    @PostMapping("/cues/{cueId}/split")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    public ResponseEntity<ApiResponse<List<SubtitleCueDTO>>> splitCue(
            @PathVariable Long cueId,
            @RequestParam Long teamId,
            @RequestParam BigDecimal splitTime) {

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }

        Long userId = securityUtil.getCurrentUserId();
        List<SubtitleCueDTO> cues = subtitleService.splitCue(teamId, cueId, splitTime, userId);
        return ResponseEntity.ok(ApiResponse.success(cues, "字幕拆分成功"));
    }

    @GetMapping("/{id}/export")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<String> exportSubtitle(
            @PathVariable Long id,
            @RequestParam Long teamId,
            @RequestParam(defaultValue = "SRT") String format,
            @RequestParam(defaultValue = "true") boolean includeSpeaker,
            @RequestParam(defaultValue = ": ") String speakerSeparator) {

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().build();
        }

        SubtitleExportRequest request = SubtitleExportRequest.builder()
                .format(format)
                .includeSpeaker(includeSpeaker)
                .speakerSeparator(speakerSeparator)
                .build();

        String content = subtitleService.exportSubtitle(teamId, id, request);

        MediaType mediaType = "VTT".equalsIgnoreCase(format)
                ? MediaType.parseMediaType("text/vtt; charset=utf-8")
                : MediaType.parseMediaType("application/x-subrip; charset=utf-8");

        String fileExtension = "VTT".equalsIgnoreCase(format) ? "vtt" : "srt";
        String fileName = "subtitle_" + id + "." + fileExtension;

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(mediaType)
                .body(content);
    }

    @GetMapping("/languages")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Set<String>>> getSupportedLanguages() {
        Set<String> languages = subtitleService.getSupportedLanguages();
        return ResponseEntity.ok(ApiResponse.success(languages));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<Void>> deleteSubtitle(
            @PathVariable Long id,
            @RequestParam Long teamId) {

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }

        Long userId = securityUtil.getCurrentUserId();
        subtitleService.deleteSubtitle(teamId, id, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "字幕删除成功"));
    }

    @GetMapping("/{id}/cues/by-time")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<SubtitleCueDTO>>> getCuesByTime(
            @PathVariable Long id,
            @RequestParam Long teamId,
            @RequestParam BigDecimal time) {

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }

        List<SubtitleCueDTO> cues = subtitleService.getCuesByTime(teamId, id, time);
        return ResponseEntity.ok(ApiResponse.success(cues));
    }
}
