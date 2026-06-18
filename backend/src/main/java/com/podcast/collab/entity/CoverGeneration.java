package com.podcast.collab.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "cover_generations")
public class CoverGeneration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "episode_id")
    private Episode episode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "program_id")
    private Program program;

    @Column(length = 200)
    private String title;

    @Column(length = 500)
    private String subtitle;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "style_id")
    private CoverStyle style;

    @Column(name = "style_key", length = 50)
    private String styleKey;

    @Column(name = "primary_color", length = 20)
    private String primaryColor;

    @Column(name = "secondary_color", length = 20)
    private String secondaryColor;

    @Column(name = "accent_color", length = 20)
    private String accentColor;

    @Column(name = "font_family", length = 100)
    private String fontFamily;

    @Column(name = "reference_image_url", length = 500)
    private String referenceImageUrl;

    @Column(name = "hd_image_url", length = 500)
    private String hdImageUrl;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "generation_status", nullable = false, length = 20)
    @Builder.Default
    private GenerationStatus generationStatus = GenerationStatus.PENDING;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "generated_by")
    private Long generatedBy;

    @Column(name = "is_selected", nullable = false)
    @Builder.Default
    private Boolean isSelected = false;

    @Column(columnDefinition = "TEXT")
    private String prompt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum GenerationStatus {
        PENDING,
        GENERATING,
        COMPLETED,
        FAILED
    }
}
