package com.podcast.collab.dto;

import com.podcast.collab.entity.AudioEnhancementTask;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class AudioEnhancementRequest {
    private Long teamId;
    private Long episodeId;
    private List<Long> audioVersionIds;
    private AudioEnhancementTask.TaskType taskType;
    private Map<String, Object> settings;
    private String note;
}
