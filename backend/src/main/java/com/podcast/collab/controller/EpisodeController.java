package com.podcast.collab.controller;

import com.podcast.collab.dto.ApiResponse;
import com.podcast.collab.dto.EpisodeDTO;
import com.podcast.collab.dto.EpisodeSortRequest;
import com.podcast.collab.dto.EpisodeSortResultDTO;
import com.podcast.collab.dto.EpisodeSortUndoRequest;
import com.podcast.collab.entity.Episode;
import com.podcast.collab.entity.Program;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.EpisodeRepository;
import com.podcast.collab.repository.ProgramRepository;
import com.podcast.collab.security.SecurityUtil;
import com.podcast.collab.service.AuditService;
import com.podcast.collab.service.EpisodeSortService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class EpisodeController {
    
    private final EpisodeRepository episodeRepository;
    private final ProgramRepository programRepository;
    private final SecurityUtil securityUtil;
    private final AuditService auditService;
    private final EpisodeSortService episodeSortService;
    
    @GetMapping("/api/programs/{programId}/episodes")
    public ResponseEntity<ApiResponse<List<EpisodeDTO>>> getEpisodesByProgram(
            @PathVariable Long programId) {
        
        Long teamId = securityUtil.getCurrentTeamId();
        
        Program program = programRepository.findByIdAndTeamId(programId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("节目不存在"));
        
        List<Episode> episodes = episodeRepository.findByProgramIdAndTeamId(programId, teamId);
        List<EpisodeDTO> dtos = episodes.stream()
                .map(EpisodeDTO::fromEntity)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }
    
    @PostMapping("/api/programs/{programId}/episodes")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    @Transactional
    public ResponseEntity<ApiResponse<EpisodeDTO>> createEpisode(
            @PathVariable Long programId,
            @Valid @RequestBody Map<String, Object> request) {
        
        Long teamId = securityUtil.getCurrentTeamId();
        Program program = programRepository.findByIdAndTeamId(programId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("节目不存在"));
        
        User currentUser = securityUtil.getCurrentUser();
        
        List<Episode> existingEpisodes = episodeRepository.findByProgramIdAndTeamId(programId, teamId);
        int nextSortOrder = existingEpisodes.size();
        
        Episode episode = Episode.builder()
                .program(program)
                .title(request.get("title").toString())
                .description(request.get("description") != null ? request.get("description").toString() : null)
                .status(Episode.Status.DRAFT)
                .currentVersion(1)
                .duration(0)
                .sortOrder(nextSortOrder)
                .build();
        
        episode = episodeRepository.save(episode);
        programRepository.save(program);
        
        auditService.logAction(teamId, currentUser.getId(), "CREATE_EPISODE", 
                "EPISODE", episode.getId(), Map.of("programId", programId, "title", episode.getTitle()));
        
        return ResponseEntity.ok(ApiResponse.success(EpisodeDTO.fromEntity(episode), "集数创建成功"));
    }
    
    @GetMapping("/api/episodes/all")
    public ResponseEntity<ApiResponse<List<EpisodeDTO>>> getAllEpisodes() {
        Long teamId = securityUtil.getCurrentTeamId();
        List<Episode> episodes = episodeRepository.findByTeamId(teamId);
        List<EpisodeDTO> dtos = episodes.stream()
                .map(EpisodeDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/api/episodes/{id}")
    public ResponseEntity<ApiResponse<EpisodeDTO>> getEpisode(@PathVariable Long id) {
        Long teamId = securityUtil.getCurrentTeamId();
        
        Episode episode = episodeRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("集数不存在"));
        
        return ResponseEntity.ok(ApiResponse.success(EpisodeDTO.fromEntity(episode)));
    }
    
    @PutMapping("/api/episodes/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    public ResponseEntity<ApiResponse<EpisodeDTO>> updateEpisode(
            @PathVariable Long id,
            @Valid @RequestBody Map<String, Object> request) {
        
        Long teamId = securityUtil.getCurrentTeamId();
        Episode episode = episodeRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("集数不存在"));
        
        User currentUser = securityUtil.getCurrentUser();
        
        if (request.get("title") != null) {
            episode.setTitle(request.get("title").toString());
        }
        if (request.get("description") != null) {
            episode.setDescription(request.get("description").toString());
        }
        if (request.get("status") != null) {
            episode.setStatus(Episode.Status.valueOf(request.get("status").toString()));
        }
        if (request.get("publishDate") != null) {
            String dateStr = request.get("publishDate").toString();
            if (dateStr.isEmpty() || "null".equalsIgnoreCase(dateStr)) {
                episode.setPublishDate(null);
            } else {
                episode.setPublishDate(LocalDate.parse(dateStr));
            }
        }
        
        episode = episodeRepository.save(episode);
        
        auditService.logAction(teamId, currentUser.getId(), "UPDATE_EPISODE", 
                "EPISODE", id, null);
        
        return ResponseEntity.ok(ApiResponse.success(EpisodeDTO.fromEntity(episode), "集数更新成功"));
    }
    
    @PatchMapping("/api/episodes/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    public ResponseEntity<ApiResponse<EpisodeDTO>> updateEpisodeStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        
        Long teamId = securityUtil.getCurrentTeamId();
        Episode episode = episodeRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("集数不存在"));
        
        Episode.Status newStatus = Episode.Status.valueOf(request.get("status"));
        Episode.Status oldStatus = episode.getStatus();
        
        User currentUser = securityUtil.getCurrentUser();
        
        episode.setStatus(newStatus);
        episode = episodeRepository.save(episode);
        
        auditService.logAction(teamId, currentUser.getId(), "UPDATE_EPISODE_STATUS", 
                "EPISODE", id, Map.of("oldStatus", oldStatus.name(), "newStatus", newStatus.name()));
        
        return ResponseEntity.ok(ApiResponse.success(EpisodeDTO.fromEntity(episode), "状态更新成功"));
    }
    
    @DeleteMapping("/api/episodes/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteEpisode(@PathVariable Long id) {
        Long teamId = securityUtil.getCurrentTeamId();
        Episode episode = episodeRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("集数不存在"));
        
        User currentUser = securityUtil.getCurrentUser();
        Long programId = episode.getProgram().getId();
        int deletedSortOrder = episode.getSortOrder();
        
        episodeRepository.delete(episode);
        
        List<Episode> remainingEpisodes = episodeRepository.findByProgramIdAndTeamId(programId, teamId);
        for (Episode e : remainingEpisodes) {
            if (e.getSortOrder() > deletedSortOrder) {
                e.setSortOrder(e.getSortOrder() - 1);
            }
        }
        episodeRepository.saveAll(remainingEpisodes);
        
        Program program = programRepository.findByIdAndTeamId(programId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("节目不存在"));
        programRepository.save(program);
        
        auditService.logAction(teamId, currentUser.getId(), "DELETE_EPISODE", 
                "EPISODE", id, null);
        
        return ResponseEntity.ok(ApiResponse.success(null, "集数删除成功"));
    }
    
    @PutMapping("/api/programs/{programId}/episodes/sort")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    public ResponseEntity<ApiResponse<EpisodeSortResultDTO>> updateEpisodeSortOrder(
            @PathVariable Long programId,
            @Valid @RequestBody EpisodeSortRequest request) {
        
        try {
            EpisodeSortResultDTO result = episodeSortService.updateSortOrder(programId, request);
            
            if (result.isConflict()) {
                return ResponseEntity.ok()
                        .body(ApiResponse.<EpisodeSortResultDTO>builder()
                                .success(false)
                                .code(409)
                                .message(result.getMessage())
                                .data(result)
                                .build());
            }
            
            return ResponseEntity.ok(ApiResponse.success(result, result.getMessage()));
        } catch (OptimisticLockingFailureException e) {
            EpisodeSortResultDTO conflictResult = episodeSortService.getCurrentSortState(
                    programId, "排序已被其他人修改，请刷新后重试");
            return ResponseEntity.ok()
                    .body(ApiResponse.<EpisodeSortResultDTO>builder()
                            .success(false)
                            .code(409)
                            .message(conflictResult.getMessage())
                            .data(conflictResult)
                            .build());
        }
    }
    
    @PostMapping("/api/programs/{programId}/episodes/sort/undo")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    public ResponseEntity<ApiResponse<EpisodeSortResultDTO>> undoEpisodeSort(
            @PathVariable Long programId,
            @RequestBody(required = false) EpisodeSortUndoRequest request) {
        
        try {
            EpisodeSortResultDTO result = episodeSortService.undoLastSort(programId, request);
            
            if (result.isConflict()) {
                return ResponseEntity.ok()
                        .body(ApiResponse.<EpisodeSortResultDTO>builder()
                                .success(false)
                                .code(409)
                                .message(result.getMessage())
                                .data(result)
                                .build());
            }
            
            return ResponseEntity.ok(ApiResponse.success(result, result.getMessage()));
        } catch (OptimisticLockingFailureException e) {
            EpisodeSortResultDTO conflictResult = episodeSortService.getCurrentSortState(
                    programId, "排序已被其他人修改，无法撤销，请刷新后重试");
            return ResponseEntity.ok()
                    .body(ApiResponse.<EpisodeSortResultDTO>builder()
                            .success(false)
                            .code(409)
                            .message(conflictResult.getMessage())
                            .data(conflictResult)
                            .build());
        }
    }
    
    @GetMapping("/api/programs/{programId}/episodes/sort/can-undo")
    public ResponseEntity<ApiResponse<Boolean>> canUndoSort(@PathVariable Long programId) {
        boolean canUndo = episodeSortService.canUndo(programId);
        return ResponseEntity.ok(ApiResponse.success(canUndo));
    }
}
