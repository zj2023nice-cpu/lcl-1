package com.podcast.collab.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "audio_enhancement_tasks")
public class AudioEnhancementTask {

    public enum TaskType {
        NOISE_REDUCTION,
        VOLUME_BALANCE,
        VOICE_ENHANCE,
        FULL_ENHANCE
    }

    public enum TaskStatus {
        PENDING,
        PROCESSING,
        COMPLETED,
        FAILED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(name = "episode_id", nullable = false)
    private Long episodeId;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false, length = 50)
    private TaskType taskType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private TaskStatus status;

    @Builder.Default
    private Integer progress = 0;

    @Column(name = "total_audio_count")
    @Builder.Default
    private Integer totalAudioCount = 0;

    @Column(name = "completed_audio_count")
    @Builder.Default
    private Integer completedAudioCount = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "audio_version_ids", columnDefinition = "json")
    private List<Long> audioVersionIds;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "result_audio_version_ids", columnDefinition = "json")
    private List<Long> resultAudioVersionIds;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "json")
    private Map<String, Object> settings;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @CreationTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AudioEnhancementItem> items;
}
