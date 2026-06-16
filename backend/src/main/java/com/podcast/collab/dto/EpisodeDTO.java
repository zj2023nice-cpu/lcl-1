package com.podcast.collab.dto;

import com.podcast.collab.entity.Episode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EpisodeDTO {
    
    private Long id;
    
    private Long programId;
    
    private String programName;
    
    private String title;
    
    private String description;
    
    private Episode.Status status;
    
    private Integer currentVersion;
    
    private Integer duration;
    
    private Integer annotationCount;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    public static EpisodeDTO fromEntity(Episode episode) {
        return EpisodeDTO.builder()
                .id(episode.getId())
                .programId(episode.getProgram() != null ? episode.getProgram().getId() : null)
                .programName(episode.getProgram() != null ? episode.getProgram().getName() : null)
                .title(episode.getTitle())
                .description(episode.getDescription())
                .status(episode.getStatus())
                .currentVersion(episode.getCurrentVersion())
                .duration(episode.getDuration())
                .annotationCount(episode.getAnnotations() != null ? episode.getAnnotations().size() : 0)
                .createdAt(episode.getCreatedAt())
                .updatedAt(episode.getUpdatedAt())
                .build();
    }
}
