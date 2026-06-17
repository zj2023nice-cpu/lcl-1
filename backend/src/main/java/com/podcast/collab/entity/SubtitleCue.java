package com.podcast.collab.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "subtitle_cues", indexes = {
    @Index(name = "idx_subtitle_id", columnList = "subtitle_id"),
    @Index(name = "idx_start_time", columnList = "start_time"),
    @Index(name = "idx_speaker_id", columnList = "speaker_id"),
    @Index(name = "idx_order", columnList = "subtitle_id, `order`")
})
public class SubtitleCue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subtitle_id", nullable = false)
    private Subtitle subtitle;

    @Column(name = "start_time", nullable = false, precision = 10, scale = 3)
    private BigDecimal startTime;

    @Column(name = "end_time", nullable = false, precision = 10, scale = 3)
    private BigDecimal endTime;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(name = "speaker_id", length = 50)
    private String speakerId;

    @Column(name = "speaker_name", length = 100)
    private String speakerName;

    @Column(precision = 5, scale = 4)
    private BigDecimal confidence;

    @Column(name = "`order`", nullable = false)
    private Integer order;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
