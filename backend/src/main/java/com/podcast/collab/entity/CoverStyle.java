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
@Table(name = "cover_styles")
public class CoverStyle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "style_key", nullable = false, length = 50)
    private String styleKey;

    @Column(name = "primary_color", length = 20)
    private String primaryColor;

    @Column(name = "secondary_color", length = 20)
    private String secondaryColor;

    @Column(name = "accent_color", length = 20)
    private String accentColor;

    @Column(name = "font_family", length = 100)
    private String fontFamily;

    @Column(name = "layout_type", length = 50)
    private String layoutType;

    @Column(name = "is_system", nullable = false)
    @Builder.Default
    private Boolean isSystem = true;

    @Column(name = "team_id")
    private Long teamId;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum LayoutType {
        CENTERED,
        LEFT_ALIGNED,
        OVERLAY
    }
}
