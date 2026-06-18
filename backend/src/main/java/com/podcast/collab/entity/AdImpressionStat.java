package com.podcast.collab.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "ad_impression_stats", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"ad_id", "episode_id", "platform", "region", "audience_type", "stat_date"})
})
public class AdImpressionStat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ad_id", nullable = false)
    private Advertisement advertisement;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "episode_id", nullable = false)
    private Episode episode;

    @Column(length = 50)
    private String platform;

    @Column(length = 100)
    private String region;

    @Column(name = "audience_type", length = 50)
    private String audienceType;

    @Column(name = "impression_count", nullable = false)
    @Builder.Default
    private Integer impressionCount = 0;

    @Column(name = "click_count", nullable = false)
    @Builder.Default
    private Integer clickCount = 0;

    @Column(name = "stat_date", nullable = false)
    private LocalDate statDate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
