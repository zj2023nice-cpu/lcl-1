package com.podcast.collab.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchDistributionRequest {
    
    @NotNull(message = "节目ID不能为空")
    private Long episodeId;
    
    @NotEmpty(message = "至少选择一个分发平台")
    private List<Long> platformIds;
    
    private Map<String, Object> metadata;
}
