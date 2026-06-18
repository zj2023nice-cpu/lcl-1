package com.podcast.collab.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.podcast.collab.entity.CoverStyle;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CoverStyleDTO {

    private Long id;
    private String name;
    private String description;
    private String styleKey;
    private String primaryColor;
    private String secondaryColor;
    private String accentColor;
    private String fontFamily;
    private String layoutType;
    private Boolean isSystem;
    private Long teamId;
    private Integer sortOrder;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CoverStyleDTO fromEntity(CoverStyle entity) {
        if (entity == null) return null;
        return CoverStyleDTO.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .styleKey(entity.getStyleKey())
                .primaryColor(entity.getPrimaryColor())
                .secondaryColor(entity.getSecondaryColor())
                .accentColor(entity.getAccentColor())
                .fontFamily(entity.getFontFamily())
                .layoutType(entity.getLayoutType())
                .isSystem(entity.getIsSystem())
                .teamId(entity.getTeamId())
                .sortOrder(entity.getSortOrder())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
