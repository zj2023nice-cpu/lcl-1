package com.podcast.collab.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.podcast.collab.entity.CoverGeneration;
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
public class CoverGenerationDTO {

    private Long id;
    private Long teamId;
    private Long episodeId;
    private Long programId;
    private String title;
    private String subtitle;
    private String description;
    private Long styleId;
    private String styleKey;
    private String primaryColor;
    private String secondaryColor;
    private String accentColor;
    private String fontFamily;
    private String referenceImageUrl;
    private String hdImageUrl;
    private String thumbnailUrl;
    private String generationStatus;
    private String errorMessage;
    private Long generatedBy;
    private Boolean isSelected;
    private String prompt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CoverGenerationDTO fromEntity(CoverGeneration entity) {
        if (entity == null) return null;
        return CoverGenerationDTO.builder()
                .id(entity.getId())
                .teamId(entity.getTeamId())
                .episodeId(entity.getEpisode() != null ? entity.getEpisode().getId() : null)
                .programId(entity.getProgram() != null ? entity.getProgram().getId() : null)
                .title(entity.getTitle())
                .subtitle(entity.getSubtitle())
                .description(entity.getDescription())
                .styleId(entity.getStyle() != null ? entity.getStyle().getId() : null)
                .styleKey(entity.getStyleKey())
                .primaryColor(entity.getPrimaryColor())
                .secondaryColor(entity.getSecondaryColor())
                .accentColor(entity.getAccentColor())
                .fontFamily(entity.getFontFamily())
                .referenceImageUrl(entity.getReferenceImageUrl())
                .hdImageUrl(entity.getHdImageUrl())
                .thumbnailUrl(entity.getThumbnailUrl())
                .generationStatus(entity.getGenerationStatus() != null ? entity.getGenerationStatus().name() : null)
                .errorMessage(entity.getErrorMessage())
                .generatedBy(entity.getGeneratedBy())
                .isSelected(entity.getIsSelected())
                .prompt(entity.getPrompt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
