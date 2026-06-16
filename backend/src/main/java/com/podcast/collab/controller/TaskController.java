package com.podcast.collab.controller;

import com.podcast.collab.dto.ApiResponse;
import com.podcast.collab.dto.TaskDTO;
import com.podcast.collab.entity.Annotation;
import com.podcast.collab.entity.Task;
import com.podcast.collab.entity.Team;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.AnnotationRepository;
import com.podcast.collab.repository.TaskRepository;
import com.podcast.collab.repository.TeamRepository;
import com.podcast.collab.repository.UserRepository;
import com.podcast.collab.security.SecurityUtil;
import com.podcast.collab.service.AuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class TaskController {
    
    private final TaskRepository taskRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final AnnotationRepository annotationRepository;
    private final SecurityUtil securityUtil;
    private final AuditService auditService;
    
    @GetMapping
    public ResponseEntity<ApiResponse<List<TaskDTO>>> getTasks(
            @RequestParam(required = false) Task.Status status,
            @RequestParam(required = false) Task.Priority priority,
            @RequestParam(required = false) Long assigneeId) {
        
        Long teamId = securityUtil.getCurrentTeamId();
        
        List<Task> tasks = taskRepository.findByTeamIdWithFilters(teamId, status, priority, assigneeId);
        
        List<TaskDTO> dtos = tasks.stream()
                .map(TaskDTO::fromEntity)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TaskDTO>> getTask(@PathVariable Long id) {
        Long teamId = securityUtil.getCurrentTeamId();
        
        Task task = taskRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));
        
        return ResponseEntity.ok(ApiResponse.success(TaskDTO.fromEntity(task)));
    }
    
    @PostMapping
    public ResponseEntity<ApiResponse<TaskDTO>> createTask(
            @Valid @RequestBody Map<String, Object> request) {
        
        Long teamId = securityUtil.getCurrentTeamId();
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("团队不存在"));
        
        User currentUser = securityUtil.getCurrentUser();
        
        Task task = Task.builder()
                .team(team)
                .title(request.get("title").toString())
                .description(request.get("description") != null ? request.get("description").toString() : null)
                .priority(request.get("priority") != null ? 
                        Task.Priority.valueOf(request.get("priority").toString()) : 
                        Task.Priority.MEDIUM)
                .createdBy(currentUser)
                .build();
        
        if (request.get("assigneeId") != null) {
            Long assigneeId = Long.valueOf(request.get("assigneeId").toString());
            User assignee = userRepository.findById(assigneeId)
                    .orElseThrow(() -> new IllegalArgumentException("被分配用户不存在"));
            task.setAssignee(assignee);
        }
        
        if (request.get("dueDate") != null) {
            task.setDueDate(LocalDate.parse(request.get("dueDate").toString()));
        }
        
        if (request.get("annotationIds") != null) {
            @SuppressWarnings("unchecked")
            List<Number> annotationIdNumbers = (List<Number>) request.get("annotationIds");
            Set<Annotation> annotations = new HashSet<>();
            for (Number annId : annotationIdNumbers) {
                annotationRepository.findByIdAndTeamId(annId.longValue(), teamId)
                        .ifPresent(annotations::add);
            }
            task.setAnnotations(annotations);
        }
        
        task = taskRepository.save(task);
        
        auditService.logAction(teamId, currentUser.getId(), "CREATE_TASK", 
                "TASK", task.getId(), null);
        
        return ResponseEntity.ok(ApiResponse.success(TaskDTO.fromEntity(task), "任务创建成功"));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TaskDTO>> updateTask(
            @PathVariable Long id,
            @Valid @RequestBody Map<String, Object> request) {
        
        Long teamId = securityUtil.getCurrentTeamId();
        Task task = taskRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));
        
        User currentUser = securityUtil.getCurrentUser();
        
        if (request.get("title") != null) {
            task.setTitle(request.get("title").toString());
        }
        if (request.get("description") != null) {
            task.setDescription(request.get("description").toString());
        }
        if (request.get("status") != null) {
            task.setStatus(Task.Status.valueOf(request.get("status").toString()));
        }
        if (request.get("priority") != null) {
            task.setPriority(Task.Priority.valueOf(request.get("priority").toString()));
        }
        if (request.get("assigneeId") != null) {
            Long assigneeId = Long.valueOf(request.get("assigneeId").toString());
            if (assigneeId == 0) {
                task.setAssignee(null);
            } else {
                User assignee = userRepository.findById(assigneeId)
                        .orElseThrow(() -> new IllegalArgumentException("被分配用户不存在"));
                task.setAssignee(assignee);
            }
        }
        if (request.get("dueDate") != null) {
            String dueDateStr = request.get("dueDate").toString();
            task.setDueDate(dueDateStr.isEmpty() ? null : LocalDate.parse(dueDateStr));
        }
        if (request.get("annotationIds") != null) {
            @SuppressWarnings("unchecked")
            List<Number> annotationIdNumbers = (List<Number>) request.get("annotationIds");
            Set<Annotation> annotations = new HashSet<>();
            for (Number annId : annotationIdNumbers) {
                annotationRepository.findByIdAndTeamId(annId.longValue(), teamId)
                        .ifPresent(annotations::add);
            }
            task.setAnnotations(annotations);
        }
        
        task = taskRepository.save(task);
        
        auditService.logAction(teamId, currentUser.getId(), "UPDATE_TASK", 
                "TASK", id, null);
        
        return ResponseEntity.ok(ApiResponse.success(TaskDTO.fromEntity(task), "任务更新成功"));
    }
    
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<TaskDTO>> updateTaskStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        
        Long teamId = securityUtil.getCurrentTeamId();
        Task task = taskRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));
        
        Task.Status newStatus = Task.Status.valueOf(request.get("status"));
        Task.Status oldStatus = task.getStatus();
        
        User currentUser = securityUtil.getCurrentUser();
        
        task.setStatus(newStatus);
        task = taskRepository.save(task);
        
        auditService.logAction(teamId, currentUser.getId(), "UPDATE_TASK_STATUS", 
                "TASK", id, Map.of("oldStatus", oldStatus.name(), "newStatus", newStatus.name()));
        
        return ResponseEntity.ok(ApiResponse.success(TaskDTO.fromEntity(task), "状态更新成功"));
    }
    
    @PatchMapping("/{id}/assign")
    public ResponseEntity<ApiResponse<TaskDTO>> assignTask(
            @PathVariable Long id,
            @RequestBody Map<String, Long> request) {
        
        Long teamId = securityUtil.getCurrentTeamId();
        Task task = taskRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));
        
        Long assigneeId = request.get("assigneeId");
        User currentUser = securityUtil.getCurrentUser();
        
        if (assigneeId == null || assigneeId == 0) {
            task.setAssignee(null);
        } else {
            User assignee = userRepository.findById(assigneeId)
                    .orElseThrow(() -> new IllegalArgumentException("用户不存在"));
            task.setAssignee(assignee);
        }
        
        task = taskRepository.save(task);
        
        auditService.logAction(teamId, currentUser.getId(), "ASSIGN_TASK", 
                "TASK", id, Map.of("assigneeId", assigneeId));
        
        return ResponseEntity.ok(ApiResponse.success(TaskDTO.fromEntity(task), "任务分配成功"));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<Void>> deleteTask(@PathVariable Long id) {
        Long teamId = securityUtil.getCurrentTeamId();
        Task task = taskRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));
        
        User currentUser = securityUtil.getCurrentUser();
        
        taskRepository.delete(task);
        
        auditService.logAction(teamId, currentUser.getId(), "DELETE_TASK", 
                "TASK", id, null);
        
        return ResponseEntity.ok(ApiResponse.success(null, "任务删除成功"));
    }
}
