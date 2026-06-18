package com.podcast.collab.dto;

import com.podcast.collab.entity.Episode;
import com.podcast.collab.entity.Task;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleItemDTO {
    
    private Long id;
    
    private String itemType;
    
    private String title;
    
    private String description;
    
    private LocalDate date;
    
    private String status;
    
    private String priority;
    
    private Long programId;
    
    private String programName;
    
    private Long assigneeId;
    
    private String assigneeName;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    public static ScheduleItemDTO fromEpisode(Episode episode) {
        return ScheduleItemDTO.builder()
                .id(episode.getId())
                .itemType("EPISODE")
                .title(episode.getTitle())
                .description(episode.getDescription())
                .date(episode.getPublishDate())
                .status(episode.getStatus() != null ? episode.getStatus().name() : null)
                .programId(episode.getProgram() != null ? episode.getProgram().getId() : null)
                .programName(episode.getProgram() != null ? episode.getProgram().getName() : null)
                .createdAt(episode.getCreatedAt())
                .updatedAt(episode.getUpdatedAt())
                .build();
    }
    
    public static ScheduleItemDTO fromTask(Task task) {
        return ScheduleItemDTO.builder()
                .id(task.getId())
                .itemType("TASK")
                .title(task.getTitle())
                .description(task.getDescription())
                .date(task.getDueDate())
                .status(task.getStatus() != null ? task.getStatus().name() : null)
                .priority(task.getPriority() != null ? task.getPriority().name() : null)
                .assigneeId(task.getAssignee() != null ? task.getAssignee().getId() : null)
                .assigneeName(task.getAssignee() != null ? task.getAssignee().getName() : null)
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }
}
