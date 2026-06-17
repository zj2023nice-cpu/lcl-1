-- 音频增强功能相关表

CREATE TABLE audio_enhancement_tasks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id BIGINT NOT NULL,
    episode_id BIGINT NOT NULL,
    created_by BIGINT NOT NULL,
    task_type VARCHAR(50) NOT NULL COMMENT '任务类型: NOISE_REDUCTION, VOLUME_BALANCE, VOICE_ENHANCE, FULL_ENHANCE',
    status VARCHAR(50) NOT NULL COMMENT '状态: PENDING, PROCESSING, COMPLETED, FAILED',
    progress INT DEFAULT 0 COMMENT '进度 0-100',
    total_audio_count INT DEFAULT 0 COMMENT '总音频数量',
    completed_audio_count INT DEFAULT 0 COMMENT '已完成音频数量',
    audio_version_ids JSON COMMENT '处理的音频版本ID列表',
    result_audio_version_ids JSON COMMENT '生成的新音频版本ID列表',
    error_message TEXT COMMENT '错误信息',
    settings JSON COMMENT '增强设置参数',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at DATETIME,
    INDEX idx_team_id (team_id),
    INDEX idx_episode_id (episode_id),
    INDEX idx_created_by (created_by),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='音频增强任务表';

CREATE TABLE audio_enhancement_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT NOT NULL,
    source_audio_version_id BIGINT NOT NULL,
    result_audio_version_id BIGINT,
    status VARCHAR(50) NOT NULL COMMENT '状态: PENDING, PROCESSING, COMPLETED, FAILED',
    progress INT DEFAULT 0 COMMENT '进度 0-100',
    error_message TEXT COMMENT '错误信息',
    started_at DATETIME,
    completed_at DATETIME,
    INDEX idx_task_id (task_id),
    INDEX idx_source_audio_version_id (source_audio_version_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='音频增强子项表';

ALTER TABLE audio_versions 
ADD COLUMN enhancement_type VARCHAR(50) DEFAULT NULL COMMENT '增强类型: NOISE_REDUCTION, VOLUME_BALANCE, VOICE_ENHANCE, FULL_ENHANCE',
ADD COLUMN source_version_id BIGINT DEFAULT NULL COMMENT '来源版本ID',
ADD COLUMN enhancement_settings JSON DEFAULT NULL COMMENT '增强设置参数',
ADD INDEX idx_enhancement_type (enhancement_type),
ADD INDEX idx_source_version_id (source_version_id);
