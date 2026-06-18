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
@Table(name = "guests")
public class Guest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "topic_areas", length = 500)
    private String topicAreas;

    @Column(name = "weibo_url", length = 500)
    private String weiboUrl;

    @Column(name = "wechat_id", length = 100)
    private String wechatId;

    @Column(name = "zhihu_url", length = 500)
    private String zhihuUrl;

    @Column(name = "bilibili_url", length = 500)
    private String bilibiliUrl;

    @Column(name = "other_links", length = 1000)
    private String otherLinks;

    @Column(name = "bio", length = 2000)
    private String bio;

    @Builder.Default
    @Column(name = "participation_count", nullable = false)
    private Integer participationCount = 0;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
