package com.podcast.collab.controller;

import com.podcast.collab.dto.ApiResponse;
import com.podcast.collab.dto.BatchDistributionRequest;
import com.podcast.collab.dto.BatchRecordIdsRequest;
import com.podcast.collab.dto.DistributionDTO;
import com.podcast.collab.entity.DistributionPlatform;
import com.podcast.collab.entity.DistributionRecord;
import com.podcast.collab.entity.Episode;
import com.podcast.collab.entity.Team;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.DistributionPlatformRepository;
import com.podcast.collab.repository.DistributionRecordRepository;
import com.podcast.collab.repository.EpisodeRepository;
import com.podcast.collab.repository.TeamRepository;
import com.podcast.collab.security.SecurityUtil;
import com.podcast.collab.service.AuditService;
import com.podcast.collab.service.DistributionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/distribution")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class DistributionController {
    
    private final DistributionPlatformRepository platformRepository;
    private final DistributionRecordRepository recordRepository;
    private final EpisodeRepository episodeRepository;
    private final TeamRepository teamRepository;
    private final SecurityUtil securityUtil;
    private final AuditService auditService;
    private final DistributionService distributionService;
    
    @GetMapping("/platforms")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<DistributionDTO>>> getPlatforms(
            @RequestParam Long teamId) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }
        
        List<DistributionPlatform> platforms = platformRepository.findByTeamId(teamId);
        List<DistributionDTO> dtos = platforms.stream()
                .map(DistributionDTO::fromPlatform)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }
    
    @PostMapping("/platforms")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<DistributionDTO>> createPlatform(
            @RequestParam Long teamId,
            @Valid @RequestBody Map<String, Object> request) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }
        
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("团队不存在"));
        
        User currentUser = securityUtil.getCurrentUser();
        
        DistributionPlatform platform = DistributionPlatform.builder()
                .team(team)
                .name(request.get("name").toString())
                .type(DistributionPlatform.PlatformType.valueOf(request.get("type").toString()))
                .config(request.get("config") != null ? 
                        (Map<String, Object>) request.get("config") : Map.of())
                .build();
        
        platform = platformRepository.save(platform);
        
        auditService.logAction(teamId, currentUser.getId(), "CREATE_DISTRIBUTION_PLATFORM", 
                "DISTRIBUTION_PLATFORM", platform.getId(), 
                Map.of("name", platform.getName(), "type", platform.getType().name()));
        
        return ResponseEntity.ok(ApiResponse.success(DistributionDTO.fromPlatform(platform), "平台创建成功"));
    }
    
    @PutMapping("/platforms/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<DistributionDTO>> updatePlatform(
            @PathVariable Long id,
            @RequestParam Long teamId,
            @Valid @RequestBody Map<String, Object> request) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }
        
        DistributionPlatform platform = platformRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("平台不存在"));
        
        User currentUser = securityUtil.getCurrentUser();
        
        if (request.get("name") != null) {
            platform.setName(request.get("name").toString());
        }
        if (request.get("config") != null) {
            platform.setConfig((Map<String, Object>) request.get("config"));
        }
        
        platform = platformRepository.save(platform);
        
        auditService.logAction(teamId, currentUser.getId(), "UPDATE_DISTRIBUTION_PLATFORM", 
                "DISTRIBUTION_PLATFORM", id, null);
        
        return ResponseEntity.ok(ApiResponse.success(DistributionDTO.fromPlatform(platform), "平台更新成功"));
    }
    
    @DeleteMapping("/platforms/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<Void>> deletePlatform(
            @PathVariable Long id,
            @RequestParam Long teamId) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }
        
        DistributionPlatform platform = platformRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("平台不存在"));
        
        User currentUser = securityUtil.getCurrentUser();
        
        platformRepository.delete(platform);
        
        auditService.logAction(teamId, currentUser.getId(), "DELETE_DISTRIBUTION_PLATFORM", 
                "DISTRIBUTION_PLATFORM", id, null);
        
        return ResponseEntity.ok(ApiResponse.success(null, "平台删除成功"));
    }
    
    @GetMapping("/records")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<DistributionDTO>>> getDistributionRecords(
            @RequestParam Long teamId,
            @RequestParam(required = false) Long episodeId,
            @RequestParam(required = false) Long platformId,
            @RequestParam(required = false) DistributionRecord.Status status) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }
        
        List<DistributionRecord> records;
        
        if (episodeId != null) {
            records = recordRepository.findByEpisodeIdAndTeamId(episodeId, teamId);
        } else if (platformId != null) {
            records = recordRepository.findByPlatformIdAndTeamId(platformId, teamId);
        } else if (status != null) {
            records = recordRepository.findByStatusAndTeamId(status, teamId);
        } else {
            records = recordRepository.findByTeamId(teamId);
        }
        
        List<DistributionDTO> dtos = records.stream()
                .map(DistributionDTO::fromRecord)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }
    
    @GetMapping("/records/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<DistributionDTO>> getDistributionRecord(
            @PathVariable Long id,
            @RequestParam Long teamId) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }
        
        DistributionRecord record = recordRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("分发记录不存在"));
        
        return ResponseEntity.ok(ApiResponse.success(DistributionDTO.fromRecord(record)));
    }
    
    @PostMapping("/records")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<DistributionDTO>> createDistributionRecord(
            @RequestParam Long teamId,
            @Valid @RequestBody Map<String, Object> request) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }
        
        Long episodeId = Long.valueOf(request.get("episodeId").toString());
        Long platformId = Long.valueOf(request.get("platformId").toString());
        
        Episode episode = episodeRepository.findByIdAndTeamId(episodeId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("节目不存在"));
        
        DistributionPlatform platform = platformRepository.findByIdAndTeamId(platformId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("平台不存在"));
        
        User currentUser = securityUtil.getCurrentUser();
        
        DistributionRecord record = DistributionRecord.builder()
                .episode(episode)
                .platform(platform)
                .status(DistributionRecord.Status.PENDING)
                .metadata(request.get("metadata") != null ? 
                        (Map<String, Object>) request.get("metadata") : null)
                .build();
        
        record = recordRepository.save(record);
        
        auditService.logAction(teamId, currentUser.getId(), "CREATE_DISTRIBUTION_RECORD", 
                "DISTRIBUTION_RECORD", record.getId(), 
                Map.of("episodeId", episodeId, "platformId", platformId));
        
        return ResponseEntity.ok(ApiResponse.success(DistributionDTO.fromRecord(record), "分发任务创建成功"));
    }
    
    @PatchMapping("/records/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<DistributionDTO>> updateDistributionStatus(
            @PathVariable Long id,
            @RequestParam Long teamId,
            @RequestBody Map<String, Object> request) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }
        
        DistributionRecord record = recordRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("分发记录不存在"));
        
        DistributionRecord.Status newStatus = DistributionRecord.Status.valueOf(request.get("status").toString());
        DistributionRecord.Status oldStatus = record.getStatus();
        
        User currentUser = securityUtil.getCurrentUser();
        
        record.setStatus(newStatus);
        
        if (request.get("publishUrl") != null) {
            record.setPublishUrl(request.get("publishUrl").toString());
        }
        if (request.get("errorMessage") != null) {
            record.setErrorMessage(request.get("errorMessage").toString());
        }
        if (newStatus == DistributionRecord.Status.PUBLISHED && record.getPublishedAt() == null) {
            record.setPublishedAt(LocalDateTime.now());
        }
        
        record = recordRepository.save(record);
        
        auditService.logAction(teamId, currentUser.getId(), "UPDATE_DISTRIBUTION_STATUS", 
                "DISTRIBUTION_RECORD", id, 
                Map.of("oldStatus", oldStatus.name(), "newStatus", newStatus.name()));
        
        return ResponseEntity.ok(ApiResponse.success(DistributionDTO.fromRecord(record), "状态更新成功"));
    }
    
    @DeleteMapping("/records/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<Void>> deleteDistributionRecord(
            @PathVariable Long id,
            @RequestParam Long teamId) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }
        
        DistributionRecord record = recordRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("分发记录不存在"));
        
        User currentUser = securityUtil.getCurrentUser();
        
        recordRepository.delete(record);
        
        auditService.logAction(teamId, currentUser.getId(), "DELETE_DISTRIBUTION_RECORD", 
                "DISTRIBUTION_RECORD", id, null);
        
        return ResponseEntity.ok(ApiResponse.success(null, "分发记录删除成功"));
    }
    
    @PostMapping("/batch")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<List<DistributionDTO>>> createBatchDistribution(
            @RequestParam Long teamId,
            @Valid @RequestBody BatchDistributionRequest request) {
        
        try {
            List<DistributionDTO> results = distributionService.createBatchDistribution(
                    teamId, request.getEpisodeId(), request.getPlatformIds(), request.getMetadata());
            
            return ResponseEntity.ok(ApiResponse.success(results, "批量分发任务创建成功"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
    
    @PostMapping("/records/{id}/retry")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<DistributionDTO>> retryDistribution(
            @PathVariable Long id,
            @RequestParam Long teamId) {
        
        try {
            DistributionDTO result = distributionService.retryDistribution(teamId, id);
            return ResponseEntity.ok(ApiResponse.success(result, "重试分发成功"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
    
    @PostMapping("/batch/retry")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<List<DistributionDTO>>> retryBatchDistribution(
            @RequestParam Long teamId,
            @Valid @RequestBody BatchRecordIdsRequest request) {
        
        List<DistributionDTO> results = distributionService.retryFailedDistributions(teamId, request.getRecordIds());
        return ResponseEntity.ok(ApiResponse.success(results, String.format("已重试 %d 个分发任务", results.size())));
    }
    
    @PostMapping("/records/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<DistributionDTO>> cancelDistribution(
            @PathVariable Long id,
            @RequestParam Long teamId) {
        
        try {
            DistributionDTO result = distributionService.cancelDistribution(teamId, id);
            return ResponseEntity.ok(ApiResponse.success(result, "取消分发成功，已退还队列"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
    
    @PostMapping("/batch/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<List<DistributionDTO>>> cancelBatchDistribution(
            @RequestParam Long teamId,
            @Valid @RequestBody BatchRecordIdsRequest request) {
        
        List<DistributionDTO> results = distributionService.cancelBatchDistributions(teamId, request.getRecordIds());
        return ResponseEntity.ok(ApiResponse.success(results, String.format("已取消 %d 个分发任务，已退还队列", results.size())));
    }
    
    @GetMapping("/records/{id}/progress")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<DistributionDTO>> getDistributionProgress(
            @PathVariable Long id,
            @RequestParam Long teamId) {
        
        try {
            DistributionDTO result = distributionService.getDistributionProgress(teamId, id);
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
    
    @GetMapping("/episode/{episodeId}/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<DistributionDTO>>> getDistributionStatus(
            @PathVariable Long episodeId,
            @RequestParam Long teamId) {
        
        try {
            List<DistributionDTO> results = distributionService.getDistributionStatus(teamId, episodeId);
            return ResponseEntity.ok(ApiResponse.success(results));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
    
    @GetMapping("/rss/{teamId}")
    public ResponseEntity<ApiResponse<String>> getRssFeed(@PathVariable Long teamId) {
        String rssUrl = "http://localhost:8080/rss/team/" + teamId + "/feed.xml";
        return ResponseEntity.ok(ApiResponse.success(rssUrl, "RSS订阅地址获取成功"));
    }
}
