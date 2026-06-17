package com.podcast.collab.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchRecordIdsRequest {
    
    @NotEmpty(message = "至少选择一条记录")
    private List<Long> recordIds;
}
