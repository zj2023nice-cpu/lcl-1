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

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "episode_sort_history")
public class EpisodeSortHistory {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "program_id", nullable = false)
    private Long programId;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "before_order", nullable = false, columnDefinition = "json")
    private List<Long> beforeOrder;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "after_order", nullable = false, columnDefinition = "json")
    private List<Long> afterOrder;
    
    @Column(name = "sort_version", nullable = false)
    private Long sortVersion;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
