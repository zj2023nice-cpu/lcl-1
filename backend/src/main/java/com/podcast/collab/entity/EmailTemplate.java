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
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "email_templates", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"team_id", "template_key"})
})
public class EmailTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(name = "template_key", nullable = false, length = 100)
    private String templateKey;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 500)
    private String subject;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(length = 500)
    private String description;

    @Column(name = "is_html", nullable = false)
    @Builder.Default
    private Boolean isHtml = true;

    @Column(name = "is_enabled", nullable = false)
    @Builder.Default
    private Boolean isEnabled = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "json")
    private Map<String, Object> variables;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum TemplateType {
        NEW_MESSAGE("new_message", "新消息通知"),
        TASK_ASSIGNED("task_assigned", "任务分配通知"),
        TASK_COMPLETED("task_completed", "任务完成通知"),
        INVITATION("invitation", "团队邀请通知"),
        DISTRIBUTION_STARTED("distribution_started", "分发开始通知"),
        DISTRIBUTION_COMPLETED("distribution_completed", "分发完成通知"),
        DISTRIBUTION_FAILED("distribution_failed", "分发失败通知"),
        PASSWORD_RESET("password_reset", "密码重置通知"),
        WELCOME("welcome", "欢迎邮件");

        private final String key;
        private final String displayName;

        TemplateType(String key, String displayName) {
            this.key = key;
            this.displayName = displayName;
        }

        public String getKey() {
            return key;
        }

        public String getDisplayName() {
            return displayName;
        }
    }
}
