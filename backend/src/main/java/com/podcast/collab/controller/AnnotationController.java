package com.podcast.collab.controller;

import com.podcast.collab.dto.AnnotationDTO;
import com.podcast.collab.dto.AnnotationReplyDTO;
import com.podcast.collab.dto.ApiResponse;
import com.podcast.collab.entity.Annotation;
import com.podcast.collab.entity.AnnotationReply;
import com.podcast.collab.entity.AudioVersion;
import com.podcast.collab.entity.Episode;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.AnnotationReplyRepository;
import com.podcast.collab.repository.AnnotationRepository;
import com.podcast.collab.repository.AudioVersionRepository;
import com.podcast.collab.repository.EpisodeRepository;
import com.podcast.collab.repository.UserRepository;
import com.podcast.collab.security.SecurityUtil;
import com.podcast.collab.service.AuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
    private final AnnotationReplyRepository annotationReplyRepository;
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

    @GetMapping("/{annotationId}/replies")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getReplies(
            @PathVariable Long annotationId,
            @RequestParam Long teamId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(defaultValue = "asc") String sort) {

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }

        Annotation annotation = annotationRepository.findByIdAndTeamId(annotationId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("标注不存在"));

        Sort.Direction direction = "desc".equalsIgnoreCase(sort) ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, "createdAt"));

        Page<AnnotationReply> replyPage = annotationReplyRepository.findRootRepliesByAnnotationId(annotationId, pageable);

        List<AnnotationReplyDTO> replyDtos = replyPage.getContent().stream()
                .map(reply -> {
                    AnnotationReplyDTO dto = AnnotationReplyDTO.fromEntity(reply);
                    dto.setChildCount(annotationReplyRepository.countByParentId(reply.getId()));
                    return dto;
                })
                .collect(Collectors.toList());

        long totalCount = annotationReplyRepository.countByAnnotationId(annotationId);

        Map<String, Object> response = Map.of(
                "items", replyDtos,
                "page", replyPage.getNumber(),
                "pageSize", replyPage.getSize(),
                "total", totalCount,
                "rootTotal", replyPage.getTotalElements(),
                "totalPages", replyPage.getTotalPages()
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/{annotationId}/replies")
    public ResponseEntity<ApiResponse<AnnotationReplyDTO>> createReply(
            @PathVariable Long annotationId,
            @RequestParam Long teamId,
            @RequestBody Map<String, Object> request) {

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }

        Annotation annotation = annotationRepository.findByIdAndTeamId(annotationId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("标注不存在"));

        User currentUser = securityUtil.getCurrentUser();

        AnnotationReply.AnnotationReplyBuilder builder = AnnotationReply.builder()
                .annotation(annotation)
                .content(request.get("content").toString())
                .createdBy(currentUser);

        if (request.get("parentId") != null) {
            Long parentId = Long.valueOf(request.get("parentId").toString());
            AnnotationReply parent = annotationReplyRepository.findById(parentId)
                    .orElseThrow(() -> new IllegalArgumentException("父级回复不存在"));
            builder.parent(parent);
        }

        if (request.get("quotedReplyId") != null) {
            Long quotedReplyId = Long.valueOf(request.get("quotedReplyId").toString());
            AnnotationReply quotedReply = annotationReplyRepository.findById(quotedReplyId)
                    .orElseThrow(() -> new IllegalArgumentException("引用的回复不存在"));
            builder.quotedReply(quotedReply);
        }

        AnnotationReply reply = builder.build();
        reply = annotationReplyRepository.save(reply);

        auditService.logAction(teamId, currentUser.getId(), "CREATE_ANNOTATION_REPLY",
                "ANNOTATION_REPLY", reply.getId(), Map.of("annotationId", annotationId));

        return ResponseEntity.ok(ApiResponse.success(AnnotationReplyDTO.fromEntity(reply), "回复创建成功"));
    }

    @GetMapping("/{annotationId}/replies/{parentId}/children")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getChildReplies(
            @PathVariable Long annotationId,
            @PathVariable Long parentId,
            @RequestParam Long teamId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "3") int size,
            @RequestParam(defaultValue = "asc") String sort) {

        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }

        annotationRepository.findByIdAndTeamId(annotationId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("标注不存在"));

        Sort.Direction direction = "desc".equalsIgnoreCase(sort) ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, "createdAt"));

        Page<AnnotationReply> childPage = annotationReplyRepository.findRepliesByParentIdPaged(parentId, pageable);

        List<AnnotationReplyDTO> dtos = childPage.getContent().stream()
                .map(reply -> {
                    AnnotationReplyDTO dto = AnnotationReplyDTO.fromEntity(reply);
                    dto.setChildCount(annotationReplyRepository.countByParentId(reply.getId()));
                    return dto;
                })
                .collect(Collectors.toList());

        Map<String, Object> response = Map.of(
                "items", dtos,
                "page", childPage.getNumber(),
                "pageSize", childPage.getSize(),
                "total", childPage.getTotalElements(),
                "totalPages", childPage.getTotalPages()
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
