package com.podcast.collab.dto;

import com.podcast.collab.entity.DistributionPlatform;
import com.podcast.collab.entity.DistributionRecord;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DistributionDTO {
    
    private Long id;
    
    private Long episodeId;
    
    private String episodeTitle;
    
    private Long platformId;
    
    private String platformName;
    
    private DistributionPlatform.PlatformType platformType;
    
    private DistributionRecord.Status status;
    
    private String publishUrl;
    
    private LocalDateTime publishedAt;
    
    private String errorMessage;
    
    private Map<String, Object> metadata;
    
    private Map<String, Object> platformConfig;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    public static DistributionDTO fromRecord(DistributionRecord record) {
        DistributionDTO dto = DistributionDTO.builder()
                .id(record.getId())
                .episodeId(record.getEpisode() != null ? record.getEpisode().getId() : null)
                .episodeTitle(record.getEpisode() != null ? record.getEpisode().getTitle() : null)
                .platformId(record.getPlatform() != null ? record.getPlatform().getId() : null)
                .platformName(record.getPlatform() != null ? record.getPlatform().getName() : null)
                .platformType(record.getPlatform() != null ? record.getPlatform().getType() : null)
                .status(record.getStatus())
                .publishUrl(record.getPublishUrl())
                .publishedAt(record.getPublishedAt())
                .errorMessage(record.getErrorMessage())
                .metadata(record.getMetadata())
                .platformConfig(record.getPlatform() != null ? record.getPlatform().getConfig() : null)
                .createdAt(record.getCreatedAt())
                .updatedAt(record.getUpdatedAt())
                .build();
        
        return dto;
    }
    
    public static DistributionDTO fromPlatform(DistributionPlatform platform) {
        return DistributionDTO.builder()
                .id(platform.getId())
                .platformId(platform.getId())
                .platformName(platform.getName())
                .platformType(platform.getType())
                .platformConfig(platform.getConfig())
                .createdAt(platform.getCreatedAt())
                .updatedAt(platform.getUpdatedAt())
                .build();
    }
}
