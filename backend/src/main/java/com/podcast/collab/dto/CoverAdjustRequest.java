package com.podcast.collab.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoverAdjustRequest {

    private Long coverGenerationId;
    private String title;
    private String subtitle;
    private String primaryColor;
    private String secondaryColor;
    private String accentColor;
    private String fontFamily;
    private Long newStyleId;
    private String referenceImageUrl;
}
