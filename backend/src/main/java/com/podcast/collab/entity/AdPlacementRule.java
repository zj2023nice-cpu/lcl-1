package com.podcast.collab.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "ad_placement_rules")
public class AdPlacementRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ad_id", nullable = false)
    private Advertisement advertisement;

    @Enumerated(EnumType.STRING)
    @Column(name = "position_type", nullable = false, length = 20)
    private PositionType positionType;

    @Column(name = "insert_time_seconds")
    @Builder.Default
    private Integer insertTimeSeconds = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer priority = 0;

    @Column(name = "is_enabled", nullable = false)
    @Builder.Default
    private Boolean isEnabled = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "target_platforms", columnDefinition = "json")
    private List<String> targetPlatforms;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "target_regions", columnDefinition = "json")
    private List<String> targetRegions;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "target_audience_types", columnDefinition = "json")
    private List<String> targetAudienceTypes;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "program_ids", columnDefinition = "json")
    private List<Long> programIds;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "episode_ids", columnDefinition = "json")
    private List<Long> episodeIds;

    @Column(name = "min_episode_duration")
    @Builder.Default
    private Integer minEpisodeDuration = 0;

    @Column(name = "max_episode_duration")
    @Builder.Default
    private Integer maxEpisodeDuration = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum PositionType {
        PRE_ROLL, MID_ROLL, POST_ROLL
    }
}
