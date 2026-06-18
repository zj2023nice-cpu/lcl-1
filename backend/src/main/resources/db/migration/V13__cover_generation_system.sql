-- 封面生成风格预设表
CREATE TABLE IF NOT EXISTS cover_styles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '风格名称',
    description TEXT COMMENT '风格描述',
    style_key VARCHAR(50) NOT NULL COMMENT '风格唯一标识',
    primary_color VARCHAR(20) COMMENT '主色调',
    secondary_color VARCHAR(20) COMMENT '辅助色',
    accent_color VARCHAR(20) COMMENT '强调色',
    font_family VARCHAR(100) COMMENT '字体',
    layout_type VARCHAR(50) COMMENT '布局类型: CENTERED, LEFT_ALIGNED, OVERLAY等',
    is_system TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否为系统预设',
    team_id BIGINT COMMENT '自定义风格所属团队ID',
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_style_team (team_id),
    INDEX idx_style_key (style_key),
    INDEX idx_style_system (is_system)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 封面生成任务表
CREATE TABLE IF NOT EXISTS cover_generations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id BIGINT NOT NULL,
    episode_id BIGINT COMMENT '关联的节目单集ID',
    program_id BIGINT COMMENT '关联的节目ID',
    title VARCHAR(200) COMMENT '封面标题',
    subtitle VARCHAR(500) COMMENT '封面副标题',
    description TEXT COMMENT '节目描述，用于AI生成',
    style_id BIGINT COMMENT '使用的风格ID',
    style_key VARCHAR(50) COMMENT '风格key冗余存储',
    primary_color VARCHAR(20),
    secondary_color VARCHAR(20),
    accent_color VARCHAR(20),
    font_family VARCHAR(100),
    reference_image_url VARCHAR(500) COMMENT '参考图URL',
    hd_image_url VARCHAR(500) COMMENT '高清图URL',
    thumbnail_url VARCHAR(500) COMMENT '缩略图URL',
    generation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, GENERATING, COMPLETED, FAILED',
    error_message TEXT,
    generated_by BIGINT COMMENT '生成者用户ID',
    is_selected TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否被选中使用',
    prompt TEXT COMMENT '实际用于生成的提示词',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cover_team (team_id),
    INDEX idx_cover_episode (episode_id),
    INDEX idx_cover_program (program_id),
    INDEX idx_cover_status (generation_status),
    INDEX idx_cover_style (style_id),
    CONSTRAINT fk_cover_episode FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL,
    CONSTRAINT fk_cover_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
    CONSTRAINT fk_cover_style FOREIGN KEY (style_id) REFERENCES cover_styles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入系统预设风格
INSERT INTO cover_styles (name, description, style_key, primary_color, secondary_color, accent_color, font_family, layout_type, is_system, sort_order) VALUES
('现代简约', '简洁现代的设计风格，适合科技、商业类播客', 'MODERN_MINIMAL', '#2563EB', '#F8FAFC', '#F59E0B', 'Inter, sans-serif', 'CENTERED', 1, 1),
('活力渐变', '动感渐变配色，适合年轻、娱乐类内容', 'VIBRANT_GRADIENT', '#EC4899', '#8B5CF6', '#FBBF24', 'Poppins, sans-serif', 'OVERLAY', 1, 2),
('温暖自然', '温暖大地色系，适合生活、教育类播客', 'WARM_NATURE', '#92400E', '#FEF3C7', '#10B981', 'Lora, serif', 'LEFT_ALIGNED', 1, 3),
('深色专业', '深色背景配亮色文字，适合访谈、新闻类', 'DARK_PROFESSIONAL', '#0F172A', '#334155', '#3B82F6', 'Roboto, sans-serif', 'CENTERED', 1, 4),
('创意插画', '手绘插画风，适合儿童、艺术类内容', 'CREATIVE_ILLUSTRATION', '#7C3AED', '#F472B6', '#22D3EE', 'Comic Sans MS, cursive', 'OVERLAY', 1, 5),
('商务正式', '稳重商务风，适合企业、投资类播客', 'BUSINESS_FORMAL', '#1E3A5F', '#E2E8F0', '#D4A017', 'Georgia, serif', 'LEFT_ALIGNED', 1, 6),
('文艺清新', '清新文艺风，适合阅读、旅行类', 'LITERARY_FRESH', '#059669', '#ECFDF5', '#F43F5E', 'Noto Serif SC, serif', 'CENTERED', 1, 7),
('动感运动', '活力运动风，适合健身、体育类内容', 'DYNAMIC_SPORTS', '#DC2626', '#1F2937', '#FBBF24', 'Oswald, sans-serif', 'OVERLAY', 1, 8);
