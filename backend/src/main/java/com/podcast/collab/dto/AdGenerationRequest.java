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
public class AdGenerationRequest {

    private Long episodeId;
    private List<String> platforms;
    private List<Long> adIds;
    private Boolean overwriteExisting;
}
