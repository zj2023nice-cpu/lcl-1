package com.podcast.collab.dto;

import com.podcast.collab.entity.Program;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProgramDTO {
    
    private Long id;
    
    private Long teamId;
    
    private String name;
    
    private String description;
    
    private String coverImage;
    
    private Integer episodeCount;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    public static ProgramDTO fromEntity(Program program) {
        return ProgramDTO.builder()
                .id(program.getId())
                .teamId(program.getTeam() != null ? program.getTeam().getId() : null)
                .name(program.getName())
                .description(program.getDescription())
                .coverImage(program.getCoverImageUrl())
                .episodeCount(program.getEpisodeCount())
                .createdAt(program.getCreatedAt())
                .updatedAt(program.getUpdatedAt())
                .build();
    }
}
