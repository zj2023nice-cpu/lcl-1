-- 字幕表
CREATE TABLE subtitles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    audio_version_id BIGINT NOT NULL,
    language VARCHAR(10) NOT NULL DEFAULT 'zh-CN',
    title VARCHAR(200),
    status ENUM('GENERATING', 'DRAFT', 'REVIEW', 'FINALIZED') NOT NULL DEFAULT 'GENERATING',
    speaker_detection_enabled TINYINT(1) NOT NULL DEFAULT 1,
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (audio_version_id) REFERENCES audio_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_audio_version_id (audio_version_id),
    INDEX idx_language (language),
    INDEX idx_status (status),
    UNIQUE KEY uk_audio_version_language (audio_version_id, language)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 字幕条目表
CREATE TABLE subtitle_cues (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    subtitle_id BIGINT NOT NULL,
    start_time DECIMAL(10,3) NOT NULL,
    end_time DECIMAL(10,3) NOT NULL,
    text TEXT NOT NULL,
    speaker_id VARCHAR(50),
    speaker_name VARCHAR(100),
    confidence DECIMAL(5,4),
    `order` INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subtitle_id) REFERENCES subtitles(id) ON DELETE CASCADE,
    INDEX idx_subtitle_id (subtitle_id),
    INDEX idx_start_time (start_time),
    INDEX idx_speaker_id (speaker_id),
    INDEX idx_order (subtitle_id, `order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
