CREATE TABLE annotation_replies (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    annotation_id BIGINT NOT NULL,
    parent_id BIGINT,
    quoted_reply_id BIGINT,
    content TEXT NOT NULL,
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES annotation_replies(id) ON DELETE CASCADE,
    FOREIGN KEY (quoted_reply_id) REFERENCES annotation_replies(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_annotation_id (annotation_id),
    INDEX idx_parent_id (parent_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
