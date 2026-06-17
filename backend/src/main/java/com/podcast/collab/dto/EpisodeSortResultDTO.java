package com.podcast.collab.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EpisodeSortResultDTO {
    
    private boolean success;
    
    private boolean conflict;
    
    private String message;
    
    private Long sortVersion;
    
    private List<EpisodeDTO> episodes;
    
    private Long historyId;
}
