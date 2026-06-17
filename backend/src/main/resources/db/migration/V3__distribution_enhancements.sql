-- 修改分发记录表状态枚举，添加 CANCELLED
ALTER TABLE distribution_records 
MODIFY COLUMN status ENUM('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED') 
NOT NULL DEFAULT 'PENDING';

-- 添加进度字段
ALTER TABLE distribution_records 
ADD COLUMN progress INT NOT NULL DEFAULT 0 COMMENT '分发进度 0-100' AFTER status;

-- 添加重试次数字段
ALTER TABLE distribution_records 
ADD COLUMN retry_count INT NOT NULL DEFAULT 0 COMMENT '重试次数' AFTER progress;

-- 通知表
CREATE TABLE notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    team_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    type ENUM('DISTRIBUTION_STARTED', 'DISTRIBUTION_COMPLETED', 'DISTRIBUTION_FAILED', 'DISTRIBUTION_CANCELLED') NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    related_entity_type VARCHAR(50),
    related_entity_id BIGINT,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_team_id (team_id),
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
