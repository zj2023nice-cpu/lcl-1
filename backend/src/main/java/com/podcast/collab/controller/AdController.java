package com.podcast.collab.controller;

import com.podcast.collab.dto.*;
import com.podcast.collab.entity.AdPlacementRule;
import com.podcast.collab.entity.Advertisement;
import com.podcast.collab.security.SecurityUtil;
import com.podcast.collab.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ads")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class AdController {

    private final AdvertisementService advertisementService;
    private final AdPlacementRuleService placementRuleService;
    private final EpisodeAdInsertionService insertionService;
    private final AdImpressionService impressionService;
    private final AuditService auditService;
    private final SecurityUtil securityUtil;

    // ==================== 广告管理 ====================

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdvertisementDTO>>> getAdvertisements(
            @RequestParam(required = false, defaultValue = "false") boolean activeOnly) {
        List<AdvertisementDTO> result = activeOnly
                ? advertisementService.getActiveAdvertisements()
                : advertisementService.getAllAdvertisements();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdvertisementDTO>> getAdvertisement(@PathVariable Long id) {
        try {
            AdvertisementDTO result = advertisementService.getAdvertisement(id);
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<AdvertisementDTO>> createAdvertisement(
            @Valid @RequestBody AdvertisementDTO dto) {
        try {
            AdvertisementDTO result = advertisementService.createAdvertisement(dto);
            Long teamId = securityUtil.getCurrentTeamId();
            Long userId = securityUtil.getCurrentUserId();
            auditService.logAction(teamId, userId, "CREATE_ADVERTISEMENT",
                    "ADVERTISEMENT", result.getId(),
                    Map.of("name", result.getName(), "duration", result.getDurationSeconds()));
            return ResponseEntity.ok(ApiResponse.success(result, "广告创建成功"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<AdvertisementDTO>> updateAdvertisement(
            @PathVariable Long id,
            @Valid @RequestBody AdvertisementDTO dto) {
        try {
            AdvertisementDTO result = advertisementService.updateAdvertisement(id, dto);
            Long teamId = securityUtil.getCurrentTeamId();
            Long userId = securityUtil.getCurrentUserId();
            auditService.logAction(teamId, userId, "UPDATE_ADVERTISEMENT",
                    "ADVERTISEMENT", id, null);
            return ResponseEntity.ok(ApiResponse.success(result, "广告更新成功"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<Void>> deleteAdvertisement(@PathVariable Long id) {
        try {
            advertisementService.deleteAdvertisement(id);
            Long teamId = securityUtil.getCurrentTeamId();
            Long userId = securityUtil.getCurrentUserId();
            auditService.logAction(teamId, userId, "DELETE_ADVERTISEMENT",
                    "ADVERTISEMENT", id, null);
            return ResponseEntity.ok(ApiResponse.success(null, "广告删除成功"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<AdvertisementDTO>> updateAdStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        try {
            Advertisement.AdStatus status = Advertisement.AdStatus.valueOf(request.get("status"));
            AdvertisementDTO result = advertisementService.updateStatus(id, status);
            return ResponseEntity.ok(ApiResponse.success(result, "广告状态更新成功"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // ==================== 投放规则管理 ====================

    @GetMapping("/rules")
    public ResponseEntity<ApiResponse<List<AdPlacementRuleDTO>>> getPlacementRules() {
        List<AdPlacementRuleDTO> result = placementRuleService.getAllRules();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/rules/{id}")
    public ResponseEntity<ApiResponse<AdPlacementRuleDTO>> getPlacementRule(@PathVariable Long id) {
        try {
            AdPlacementRuleDTO result = placementRuleService.getRule(id);
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/rules/by-ad/{adId}")
    public ResponseEntity<ApiResponse<List<AdPlacementRuleDTO>>> getRulesByAd(@PathVariable Long adId) {
        try {
            List<AdPlacementRuleDTO> result = placementRuleService.getRulesByAd(adId);
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/rules")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<AdPlacementRuleDTO>> createPlacementRule(
            @Valid @RequestBody AdPlacementRuleDTO dto) {
        try {
            AdPlacementRuleDTO result = placementRuleService.createRule(dto);
            Long teamId = securityUtil.getCurrentTeamId();
            Long userId = securityUtil.getCurrentUserId();
            auditService.logAction(teamId, userId, "CREATE_AD_RULE",
                    "AD_PLACEMENT_RULE", result.getId(),
                    Map.of("positionType", result.getPositionType().name(), "adId", result.getAdId()));
            return ResponseEntity.ok(ApiResponse.success(result, "投放规则创建成功"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/rules/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<AdPlacementRuleDTO>> updatePlacementRule(
            @PathVariable Long id,
            @Valid @RequestBody AdPlacementRuleDTO dto) {
        try {
            AdPlacementRuleDTO result = placementRuleService.updateRule(id, dto);
            Long teamId = securityUtil.getCurrentTeamId();
            Long userId = securityUtil.getCurrentUserId();
            auditService.logAction(teamId, userId, "UPDATE_AD_RULE",
                    "AD_PLACEMENT_RULE", id, null);
            return ResponseEntity.ok(ApiResponse.success(result, "投放规则更新成功"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/rules/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<Void>> deletePlacementRule(@PathVariable Long id) {
        try {
            placementRuleService.deleteRule(id);
            Long teamId = securityUtil.getCurrentTeamId();
            Long userId = securityUtil.getCurrentUserId();
            auditService.logAction(teamId, userId, "DELETE_AD_RULE",
                    "AD_PLACEMENT_RULE", id, null);
            return ResponseEntity.ok(ApiResponse.success(null, "投放规则删除成功"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PatchMapping("/rules/{id}/toggle")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<AdPlacementRuleDTO>> toggleRuleEnabled(@PathVariable Long id) {
        try {
            AdPlacementRuleDTO result = placementRuleService.toggleRuleEnabled(id);
            return ResponseEntity.ok(ApiResponse.success(result, "规则状态切换成功"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // ==================== 广告匹配 ====================

    @PostMapping("/match")
    public ResponseEntity<ApiResponse<AdMatchResult>> matchAdvertisements(
            @Valid @RequestBody AdMatchRequest request) {
        try {
            AdMatchResult result = placementRuleService.matchAdvertisements(request);
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // ==================== 节目广告插入管理 ====================

    @GetMapping("/insertions/episode/{episodeId}")
    public ResponseEntity<ApiResponse<List<EpisodeAdInsertionDTO>>> getInsertionsByEpisode(
            @PathVariable Long episodeId,
            @RequestParam(required = false) String platform,
            @RequestParam(required = false) Integer versionNumber) {
        try {
            List<EpisodeAdInsertionDTO> result;
            if (platform != null && versionNumber != null) {
                result = insertionService.getInsertionsByEpisodePlatformVersion(episodeId, platform, versionNumber);
            } else if (platform != null) {
                result = insertionService.getInsertionsByEpisodeAndPlatform(episodeId, platform);
            } else {
                result = insertionService.getInsertionsByEpisode(episodeId);
            }
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/insertions/episode/{episodeId}/platforms")
    public ResponseEntity<ApiResponse<List<String>>> getPlatformsForEpisode(@PathVariable Long episodeId) {
        try {
            List<String> result = insertionService.getPlatformsForEpisode(episodeId);
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/insertions/episode/{episodeId}/platform/{platform}/versions")
    public ResponseEntity<ApiResponse<List<Integer>>> getVersionsForEpisodePlatform(
            @PathVariable Long episodeId,
            @PathVariable String platform) {
        try {
            List<Integer> result = insertionService.getVersionsForEpisodeAndPlatform(episodeId, platform);
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/insertions/generate")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<List<EpisodeAdInsertionDTO>>> generateInsertions(
            @Valid @RequestBody AdGenerationRequest request) {
        try {
            List<EpisodeAdInsertionDTO> result = insertionService.generateInsertions(request);
            Long teamId = securityUtil.getCurrentTeamId();
            Long userId = securityUtil.getCurrentUserId();
            auditService.logAction(teamId, userId, "GENERATE_AD_INSERTIONS",
                    "EPISODE", request.getEpisodeId(),
                    Map.of("platforms", request.getPlatforms(), "count", result.size()));
            return ResponseEntity.ok(ApiResponse.success(result, String.format("已生成 %d 条广告插入记录", result.size())));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/insertions/episode/{episodeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<EpisodeAdInsertionDTO>> createManualInsertion(
            @PathVariable Long episodeId,
            @Valid @RequestBody EpisodeAdInsertionDTO dto) {
        try {
            EpisodeAdInsertionDTO result = insertionService.createManualInsertion(episodeId, dto);
            return ResponseEntity.ok(ApiResponse.success(result, "广告插入创建成功"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/insertions/{insertionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<EpisodeAdInsertionDTO>> updateInsertion(
            @PathVariable Long insertionId,
            @Valid @RequestBody EpisodeAdInsertionDTO dto) {
        try {
            EpisodeAdInsertionDTO result = insertionService.updateInsertion(insertionId, dto);
            return ResponseEntity.ok(ApiResponse.success(result, "广告插入更新成功"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/insertions/{insertionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<Void>> deleteInsertion(@PathVariable Long insertionId) {
        try {
            insertionService.deleteInsertion(insertionId);
            return ResponseEntity.ok(ApiResponse.success(null, "广告插入删除成功"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/insertions/episode/{episodeId}/platform/{platform}/version/{version}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<Void>> deleteInsertionsByVersion(
            @PathVariable Long episodeId,
            @PathVariable String platform,
            @PathVariable Integer version) {
        try {
            insertionService.deleteInsertionsByEpisodeAndPlatformAndVersion(episodeId, platform, version);
            return ResponseEntity.ok(ApiResponse.success(null, "版本删除成功"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/insertions/episode/{episodeId}/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getInsertionSummary(@PathVariable Long episodeId) {
        try {
            Map<String, Object> result = insertionService.getInsertionSummary(episodeId);
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // ==================== 广告统计 ====================

    @PostMapping("/impressions")
    public ResponseEntity<ApiResponse<Void>> recordImpression(
            @Valid @RequestBody AdImpressionRecordRequest request) {
        try {
            impressionService.recordImpression(request);
            return ResponseEntity.ok(ApiResponse.success(null, "曝光记录成功"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/stats/ad/{adId}")
    public ResponseEntity<ApiResponse<List<AdImpressionStatDTO>>> getAdStats(
            @PathVariable Long adId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            List<AdImpressionStatDTO> result = impressionService.getStatsByAd(adId, startDate, endDate);
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/stats/episode/{episodeId}")
    public ResponseEntity<ApiResponse<List<AdImpressionStatDTO>>> getEpisodeStats(
            @PathVariable Long episodeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            List<AdImpressionStatDTO> result = impressionService.getStatsByEpisode(episodeId, startDate, endDate);
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/stats/ad/{adId}/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAdSummary(@PathVariable Long adId) {
        try {
            Map<String, Object> result = impressionService.getAdSummary(adId);
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
