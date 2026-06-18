package com.podcast.collab.controller;

import com.podcast.collab.dto.*;
import com.podcast.collab.security.SecurityUtil;
import com.podcast.collab.service.GuestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/guests")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class GuestController {

    private final GuestService guestService;
    private final SecurityUtil securityUtil;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getGuests(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        Long teamId = securityUtil.getCurrentTeamId();
        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<GuestDTO> guestPage = guestService.getAllGuests(teamId, keyword, pageable);

        Map<String, Object> result = new HashMap<>();
        result.put("content", guestPage.getContent());
        result.put("totalElements", guestPage.getTotalElements());
        result.put("totalPages", guestPage.getTotalPages());
        result.put("currentPage", guestPage.getNumber());
        result.put("pageSize", guestPage.getSize());

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<GuestDTO>>> getActiveGuests() {
        Long teamId = securityUtil.getCurrentTeamId();
        List<GuestDTO> guests = guestService.getAllActiveGuests(teamId);
        return ResponseEntity.ok(ApiResponse.success(guests));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getGuestStats() {
        Long teamId = securityUtil.getCurrentTeamId();
        Map<String, Object> stats = guestService.getGuestStats(teamId);
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<GuestDTO>> getGuestById(@PathVariable Long id) {
        Long teamId = securityUtil.getCurrentTeamId();
        GuestDTO guest = guestService.getGuestById(teamId, id);
        return ResponseEntity.ok(ApiResponse.success(guest));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'HOST')")
    public ResponseEntity<ApiResponse<GuestDTO>> createGuest(
            @Valid @RequestBody CreateGuestRequest request) {

        Long teamId = securityUtil.getCurrentTeamId();
        Long creatorId = securityUtil.getCurrentUserId();
        GuestDTO guest = guestService.createGuest(teamId, creatorId, request);
        return ResponseEntity.ok(ApiResponse.success(guest, "嘉宾创建成功"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'HOST')")
    public ResponseEntity<ApiResponse<GuestDTO>> updateGuest(
            @PathVariable Long id,
            @Valid @RequestBody UpdateGuestRequest request) {

        Long teamId = securityUtil.getCurrentTeamId();
        Long operatorId = securityUtil.getCurrentUserId();
        GuestDTO guest = guestService.updateGuest(teamId, id, operatorId, request);
        return ResponseEntity.ok(ApiResponse.success(guest, "嘉宾更新成功"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<Void>> deleteGuest(@PathVariable Long id) {
        Long teamId = securityUtil.getCurrentTeamId();
        Long operatorId = securityUtil.getCurrentUserId();
        guestService.deleteGuest(teamId, id, operatorId);
        return ResponseEntity.ok(ApiResponse.success(null, "嘉宾删除成功"));
    }

    @PostMapping("/{id}/avatar")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'HOST')")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadAvatar(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {

        try {
            Long teamId = securityUtil.getCurrentTeamId();
            String avatarUrl = guestService.uploadAvatar(teamId, id, file);

            Map<String, String> result = new HashMap<>();
            result.put("avatarUrl", avatarUrl);

            return ResponseEntity.ok(ApiResponse.success(result, "头像上传成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("头像上传失败: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/avatar")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'HOST')")
    public ResponseEntity<ApiResponse<Void>> deleteAvatar(@PathVariable Long id) {
        Long teamId = securityUtil.getCurrentTeamId();
        guestService.deleteAvatar(teamId, id);
        return ResponseEntity.ok(ApiResponse.success(null, "头像删除成功"));
    }

    @PostMapping("/{id}/send-email")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'HOST')")
    public ResponseEntity<ApiResponse<GuestEmailResponse>> sendEmail(
            @PathVariable Long id,
            @Valid @RequestBody SendGuestEmailRequest request) {

        Long teamId = securityUtil.getCurrentTeamId();
        Long operatorId = securityUtil.getCurrentUserId();
        GuestEmailResponse response = guestService.sendEmail(teamId, id, request, operatorId);
        return ResponseEntity.ok(ApiResponse.success(response, "邮件已加入发送队列"));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<ApiResponse<List<GuestCollaborationHistoryDTO>>> getCollaborationHistory(
            @PathVariable Long id) {

        Long teamId = securityUtil.getCurrentTeamId();
        List<GuestCollaborationHistoryDTO> history = guestService.getCollaborationHistory(teamId, id);
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    @PostMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'HOST')")
    public ResponseEntity<ApiResponse<GuestCollaborationHistoryDTO>> addCollaborationHistory(
            @PathVariable Long id,
            @Valid @RequestBody CreateCollaborationHistoryRequest request) {

        Long teamId = securityUtil.getCurrentTeamId();
        Long creatorId = securityUtil.getCurrentUserId();
        GuestCollaborationHistoryDTO history = guestService.addCollaborationHistory(
                teamId, id, creatorId, request);
        return ResponseEntity.ok(ApiResponse.success(history, "合作记录添加成功"));
    }

    @DeleteMapping("/history/{historyId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<Void>> deleteCollaborationHistory(
            @PathVariable Long historyId) {

        Long teamId = securityUtil.getCurrentTeamId();
        Long operatorId = securityUtil.getCurrentUserId();
        guestService.deleteCollaborationHistory(teamId, historyId, operatorId);
        return ResponseEntity.ok(ApiResponse.success(null, "合作记录删除成功"));
    }
}
