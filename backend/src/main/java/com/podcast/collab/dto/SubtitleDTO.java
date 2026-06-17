package com.podcast.collab.dto;

import com.podcast.collab.entity.Subtitle;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubtitleDTO {

    private Long id;

    private Long audioVersionId;

    private Integer audioVersion;

    private Long episodeId;

    private String episodeTitle;

    private String language;

    private String title;

    private Subtitle.Status status;

    private Boolean speakerDetectionEnabled;

    private Long createdById;

    private String createdByName;

    private List<SubtitleCueDTO> cues;

    private Integer cueCount;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public static SubtitleDTO fromEntity(Subtitle subtitle) {
        return fromEntity(subtitle, false);
    }

    public static SubtitleDTO fromEntity(Subtitle subtitle, boolean includeCues) {
        SubtitleDTOBuilder builder = SubtitleDTO.builder()
                .id(subtitle.getId())
                .audioVersionId(subtitle.getAudioVersion() != null ? subtitle.getAudioVersion().getId() : null)
                .audioVersion(subtitle.getAudioVersion() != null ? subtitle.getAudioVersion().getVersion() : null)
                .episodeId(subtitle.getAudioVersion() != null && subtitle.getAudioVersion().getEpisode() != null
                        ? subtitle.getAudioVersion().getEpisode().getId() : null)
                .episodeTitle(subtitle.getAudioVersion() != null && subtitle.getAudioVersion().getEpisode() != null
                        ? subtitle.getAudioVersion().getEpisode().getTitle() : null)
                .language(subtitle.getLanguage())
                .title(subtitle.getTitle())
                .status(subtitle.getStatus())
                .speakerDetectionEnabled(subtitle.getSpeakerDetectionEnabled())
                .createdById(subtitle.getCreatedBy() != null ? subtitle.getCreatedBy().getId() : null)
                .createdByName(subtitle.getCreatedBy() != null ? subtitle.getCreatedBy().getName() : null)
                .cueCount(subtitle.getCues() != null ? subtitle.getCues().size() : 0)
                .createdAt(subtitle.getCreatedAt())
                .updatedAt(subtitle.getUpdatedAt());

        if (includeCues && subtitle.getCues() != null) {
            builder.cues(subtitle.getCues().stream()
                    .map(SubtitleCueDTO::fromEntity)
                    .collect(Collectors.toList()));
        }

        return builder.build();
    }
}
