package com.podcast.collab.controller;

import com.podcast.collab.dto.AnnotationDTO;
import com.podcast.collab.dto.ApiResponse;
import com.podcast.collab.entity.Annotation;
import com.podcast.collab.entity.AudioVersion;
import com.podcast.collab.entity.Episode;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.AnnotationRepository;
import com.podcast.collab.repository.AudioVersionRepository;
import com.podcast.collab.repository.EpisodeRepository;
import com.podcast.collab.repository.UserRepository;
import com.podcast.collab.security.SecurityUtil;
import com.podcast.collab.service.AuditService;
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
@RequestMapping("/api/annotations")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class AnnotationController {
    
    private final AnnotationRepository annotationRepository;
    private final EpisodeRepository episodeRepository;
    private final AudioVersionRepository audioVersionRepository;
    private final UserRepository userRepository;
    private final SecurityUtil securityUtil;
    private final AuditService auditService;
    
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<AnnotationDTO>>> getAnnotations(
            @RequestParam Long teamId,
            @RequestParam(required = false) Long episodeId,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Annotation.Status status) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }
        
        List<Annotation> annotations;
        
        if (episodeId != null) {
            annotations = annotationRepository.findByEpisodeIdAndTeamId(episodeId, teamId);
        } else if (assigneeId != null) {
            annotations = annotationRepository.findByAssigneeIdAndTeamId(assigneeId, teamId);
        } else if (status != null) {
            annotations = annotationRepository.findByStatusAndTeamId(status, teamId);
        } else {
            annotations = annotationRepository.findByTeamId(teamId);
        }
        
        List<AnnotationDTO> dtos = annotations.stream()
                .map(AnnotationDTO::fromEntity)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }
    
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AnnotationDTO>> getAnnotation(
            @PathVariable Long id,
            @RequestParam Long teamId) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }
        
        Annotation annotation = annotationRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("标注不存在"));
        
        return ResponseEntity.ok(ApiResponse.success(AnnotationDTO.fromEntity(annotation)));
    }
    
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AnnotationDTO>> createAnnotation(
            @RequestParam Long teamId,
            @Valid @RequestBody Map<String, Object> request) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }
        
        Long episodeId = Long.valueOf(request.get("episodeId").toString());
        Long audioVersionId = Long.valueOf(request.get("audioVersionId").toString());
        
        Episode episode = episodeRepository.findByIdAndTeamId(episodeId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("节目不存在"));
        
        AudioVersion audioVersion = audioVersionRepository.findByIdAndTeamId(audioVersionId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("音频版本不存在"));
        
        User currentUser = securityUtil.getCurrentUser();
        
        Annotation annotation = Annotation.builder()
                .episode(episode)
                .audioVersion(audioVersion)
                .startTime(new java.math.BigDecimal(request.get("startTime").toString()))
                .endTime(request.get("endTime") != null ? 
                        new java.math.BigDecimal(request.get("endTime").toString()) : null)
                .content(request.get("content").toString())
                .type(Annotation.Type.valueOf(request.get("type").toString()))
                .priority(request.get("priority") != null ? 
                        Annotation.Priority.valueOf(request.get("priority").toString()) : 
                        Annotation.Priority.MEDIUM)
                .createdBy(currentUser)
                .build();
        
        if (request.get("assigneeId") != null) {
            Long assigneeId = Long.valueOf(request.get("assigneeId").toString());
            User assignee = userRepository.findById(assigneeId)
                    .orElseThrow(() -> new IllegalArgumentException("被分配用户不存在"));
            annotation.setAssignee(assignee);
        }
        
        annotation = annotationRepository.save(annotation);
        
        auditService.logAction(teamId, currentUser.getId(), "CREATE_ANNOTATION", 
                "ANNOTATION", annotation.getId(), Map.of("episodeId", episodeId));
        
        return ResponseEntity.ok(ApiResponse.success(AnnotationDTO.fromEntity(annotation), "标注创建成功"));
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AnnotationDTO>> updateAnnotation(
            @PathVariable Long id,
            @RequestParam Long teamId,
            @Valid @RequestBody Map<String, Object> request) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }
        
        Annotation annotation = annotationRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("标注不存在"));
        
        User currentUser = securityUtil.getCurrentUser();
        
        if (request.get("content") != null) {
            annotation.setContent(request.get("content").toString());
        }
        if (request.get("type") != null) {
            annotation.setType(Annotation.Type.valueOf(request.get("type").toString()));
        }
        if (request.get("priority") != null) {
            annotation.setPriority(Annotation.Priority.valueOf(request.get("priority").toString()));
        }
        if (request.get("startTime") != null) {
            annotation.setStartTime(new java.math.BigDecimal(request.get("startTime").toString()));
        }
        if (request.get("endTime") != null) {
            annotation.setEndTime(new java.math.BigDecimal(request.get("endTime").toString()));
        }
        if (request.get("assigneeId") != null) {
            Long assigneeId = Long.valueOf(request.get("assigneeId").toString());
            if (assigneeId == 0) {
                annotation.setAssignee(null);
            } else {
                User assignee = userRepository.findById(assigneeId)
                        .orElseThrow(() -> new IllegalArgumentException("被分配用户不存在"));
                annotation.setAssignee(assignee);
            }
        }
        
        annotation = annotationRepository.save(annotation);
        
        auditService.logAction(teamId, currentUser.getId(), "UPDATE_ANNOTATION", 
                "ANNOTATION", id, null);
        
        return ResponseEntity.ok(ApiResponse.success(AnnotationDTO.fromEntity(annotation), "标注更新成功"));
    }
    
    @PatchMapping("/{id}/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AnnotationDTO>> updateAnnotationStatus(
            @PathVariable Long id,
            @RequestParam Long teamId,
            @RequestBody Map<String, String> request) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }
        
        Annotation annotation = annotationRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("标注不存在"));
        
        Annotation.Status newStatus = Annotation.Status.valueOf(request.get("status"));
        Annotation.Status oldStatus = annotation.getStatus();
        
        User currentUser = securityUtil.getCurrentUser();
        
        annotation.setStatus(newStatus);
        
        if (newStatus == Annotation.Status.RESOLVED) {
            annotation.setResolvedBy(currentUser);
            annotation.setResolvedAt(LocalDateTime.now());
        } else if (oldStatus == Annotation.Status.RESOLVED) {
            annotation.setResolvedBy(null);
            annotation.setResolvedAt(null);
        }
        
        annotation = annotationRepository.save(annotation);
        
        auditService.logAction(teamId, currentUser.getId(), "UPDATE_ANNOTATION_STATUS", 
                "ANNOTATION", id, Map.of("oldStatus", oldStatus.name(), "newStatus", newStatus.name()));
        
        return ResponseEntity.ok(ApiResponse.success(AnnotationDTO.fromEntity(annotation), "状态更新成功"));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR')")
    public ResponseEntity<ApiResponse<Void>> deleteAnnotation(
            @PathVariable Long id,
            @RequestParam Long teamId) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }
        
        Annotation annotation = annotationRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("标注不存在"));
        
        User currentUser = securityUtil.getCurrentUser();
        
        annotationRepository.delete(annotation);
        
        auditService.logAction(teamId, currentUser.getId(), "DELETE_ANNOTATION", 
                "ANNOTATION", id, null);
        
        return ResponseEntity.ok(ApiResponse.success(null, "标注删除成功"));
    }
}
