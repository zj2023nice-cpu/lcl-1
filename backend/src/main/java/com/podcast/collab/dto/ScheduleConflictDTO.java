package com.podcast.collab.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleConflictDTO {
    
    private LocalDate date;
    
    private boolean hasConflict;
    
    private int conflictCount;
    
    private List<ScheduleItemDTO> conflictingItems;
    
    private String message;
}
