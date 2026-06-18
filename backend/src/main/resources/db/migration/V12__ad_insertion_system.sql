-- 广告表
CREATE TABLE IF NOT EXISTS advertisements (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id BIGINT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    audio_url VARCHAR(500) NOT NULL,
    duration_seconds INT NOT NULL DEFAULT 30,
    advertiser VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    start_date DATE,
    end_date DATE,
    max_impressions INT DEFAULT 0,
    current_impressions INT DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ad_team (team_id),
    INDEX idx_ad_status (status),
    INDEX idx_ad_date (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 广告投放规则表
CREATE TABLE IF NOT EXISTS ad_placement_rules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id BIGINT NOT NULL,
    ad_id BIGINT NOT NULL,
    position_type VARCHAR(20) NOT NULL COMMENT 'PRE_ROLL:片头, MID_ROLL:中插, POST_ROLL:片尾',
    insert_time_seconds INT DEFAULT 0 COMMENT '中插时的具体时间点，片头片尾为0',
    priority INT NOT NULL DEFAULT 0 COMMENT '数值越大优先级越高',
    is_enabled TINYINT(1) NOT NULL DEFAULT 1,
    target_platforms JSON COMMENT '目标平台列表，空表示所有平台',
    target_regions JSON COMMENT '目标地区列表，空表示所有地区',
    target_audience_types JSON COMMENT '听众类型列表，空表示所有类型',
    program_ids JSON COMMENT '指定节目ID列表，空表示所有节目',
    episode_ids JSON COMMENT '指定单集ID列表，空表示所有单集',
    min_episode_duration INT DEFAULT 0 COMMENT '适用的最小节目时长(秒)',
    max_episode_duration INT DEFAULT 0 COMMENT '适用的最大节目时长(秒)，0表示无限制',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rule_team (team_id),
    INDEX idx_rule_ad (ad_id),
    INDEX idx_rule_position (position_type),
    INDEX idx_rule_enabled (is_enabled),
    CONSTRAINT fk_rule_ad FOREIGN KEY (ad_id) REFERENCES advertisements(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 节目广告插入记录表
CREATE TABLE IF NOT EXISTS episode_ad_insertions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    episode_id BIGINT NOT NULL,
    ad_id BIGINT NOT NULL,
    placement_rule_id BIGINT,
    platform VARCHAR(50) COMMENT '该版本对应的平台',
    position_type VARCHAR(20) NOT NULL,
    insert_time_seconds INT NOT NULL DEFAULT 0,
    duration_seconds INT NOT NULL DEFAULT 30,
    version_number INT NOT NULL DEFAULT 1 COMMENT '同一节目同一平台的版本号',
    is_generated TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已生成带广告的音频',
    generated_audio_url VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_insertion_episode (episode_id),
    INDEX idx_insertion_ad (ad_id),
    INDEX idx_insertion_platform (platform),
    INDEX idx_insertion_position (position_type),
    CONSTRAINT fk_insertion_episode FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
    CONSTRAINT fk_insertion_ad FOREIGN KEY (ad_id) REFERENCES advertisements(id) ON DELETE CASCADE,
    CONSTRAINT fk_insertion_rule FOREIGN KEY (placement_rule_id) REFERENCES ad_placement_rules(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 广告投放统计表
CREATE TABLE IF NOT EXISTS ad_impression_stats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ad_id BIGINT NOT NULL,
    episode_id BIGINT NOT NULL,
    platform VARCHAR(50),
    region VARCHAR(100),
    audience_type VARCHAR(50),
    impression_count INT NOT NULL DEFAULT 0,
    click_count INT NOT NULL DEFAULT 0,
    stat_date DATE NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_stat_unique (ad_id, episode_id, platform, region, audience_type, stat_date),
    INDEX idx_stat_ad (ad_id),
    INDEX idx_stat_date (stat_date),
    CONSTRAINT fk_stat_ad FOREIGN KEY (ad_id) REFERENCES advertisements(id) ON DELETE CASCADE,
    CONSTRAINT fk_stat_episode FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
