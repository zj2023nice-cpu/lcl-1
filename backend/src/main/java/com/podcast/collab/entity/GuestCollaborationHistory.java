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
@Table(name = "guest_collaboration_history")
public class GuestCollaborationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guest_id", nullable = false)
    private Guest guest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "episode_id")
    private Episode episode;

    @Column(name = "collaboration_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private CollaborationType collaborationType;

    @Column(name = "topic", length = 500)
    private String topic;

    @Column(name = "recording_date")
    private LocalDateTime recordingDate;

    @Column(name = "publish_date")
    private LocalDateTime publishDate;

    @Column(name = "feedback", length = 2000)
    private String feedback;

    @Column(name = "rating")
    private Integer rating;

    @Column(name = "notes", length = 2000)
    private String notes;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum CollaborationType {
        RECORDING,
        INTERVIEW,
        GUEST_SPEAKER,
        CO_HOST,
        OTHER
    }
}
