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
public class CoverGenerateRequest {

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
    private List<String> styleKeys;
    private Integer variationCount;
}
