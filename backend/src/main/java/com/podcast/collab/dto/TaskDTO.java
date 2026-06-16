package com.podcast.collab.dto;

import com.podcast.collab.entity.Task;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskDTO {
    
    private Long id;
    
    private Long teamId;
    
    private String title;
    
    private String description;
    
    private Task.Status status;
    
    private Task.Priority priority;
    
    private Long assigneeId;
    
    private String assigneeName;
    
    private String createdBy;
    
    private String createdByName;
    
    private LocalDate dueDate;
    
    private Set<Long> annotationIds;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    public static TaskDTO fromEntity(Task task) {
        TaskDTO dto = TaskDTO.builder()
                .id(task.getId())
                .teamId(task.getTeam() != null ? task.getTeam().getId() : null)
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus())
                .priority(task.getPriority())
                .dueDate(task.getDueDate())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
        
        if (task.getAssignee() != null) {
            dto.setAssigneeId(task.getAssignee().getId());
            dto.setAssigneeName(task.getAssignee().getName());
        }
        
        if (task.getCreatedBy() != null) {
            dto.setCreatedBy(task.getCreatedBy().getId().toString());
            dto.setCreatedByName(task.getCreatedBy().getName());
        }
        
        if (task.getAnnotations() != null) {
            dto.setAnnotationIds(task.getAnnotations().stream()
                    .map(a -> a.getId())
                    .collect(Collectors.toSet()));
        }
        
        return dto;
    }
}
