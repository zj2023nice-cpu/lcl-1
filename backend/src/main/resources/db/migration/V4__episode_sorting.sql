-- 为 episodes 表添加排序字段
ALTER TABLE episodes 
ADD COLUMN sort_order INT NOT NULL DEFAULT 0,
ADD COLUMN sort_version BIGINT NOT NULL DEFAULT 0;

-- 为已有数据设置初始排序（按 id 升序）
UPDATE episodes e
JOIN (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY program_id ORDER BY id ASC) - 1 as row_num
    FROM episodes
) r ON e.id = r.id
SET e.sort_order = r.row_num;

-- 创建排序历史表（用于撤销功能）
CREATE TABLE episode_sort_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    program_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    before_order JSON NOT NULL,
    after_order JSON NOT NULL,
    sort_version BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_program_id (program_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
