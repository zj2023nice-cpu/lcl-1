CREATE TABLE IF NOT EXISTS guests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    avatar_url VARCHAR(500),
    topic_areas VARCHAR(500),
    weibo_url VARCHAR(500),
    wechat_id VARCHAR(100),
    zhihu_url VARCHAR(500),
    bilibili_url VARCHAR(500),
    other_links VARCHAR(1000),
    bio VARCHAR(2000),
    participation_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_guests_team_id (team_id),
    INDEX idx_guests_email (email),
    UNIQUE KEY uk_guests_team_email (team_id, email),
    CONSTRAINT fk_guests_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_guests_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS guest_collaboration_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id BIGINT NOT NULL,
    guest_id BIGINT NOT NULL,
    episode_id BIGINT,
    collaboration_type VARCHAR(50) NOT NULL,
    topic VARCHAR(500),
    recording_date DATETIME,
    publish_date DATETIME,
    feedback VARCHAR(2000),
    rating INT,
    notes VARCHAR(2000),
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_history_team_id (team_id),
    INDEX idx_history_guest_id (guest_id),
    INDEX idx_history_episode_id (episode_id),
    CONSTRAINT fk_history_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_history_guest FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE,
    CONSTRAINT fk_history_episode FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL,
    CONSTRAINT fk_history_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO email_templates (team_id, template_key, name, subject, content, description, is_html, is_enabled, created_at, updated_at)
VALUES (
    1,
    'GUEST_INVITATION',
    '嘉宾邀请邮件',
    '邀请您参与我们的播客节目录制',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>播客嘉宾邀请</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>播客嘉宾邀请</h2>
        </div>
        <div class="content">
            <p>尊敬的 <strong>{{guestName}}</strong>：</p>
            <p>您好！我们非常荣幸地邀请您作为嘉宾参与我们的播客节目录制。</p>
            
            <p><strong>节目信息：</strong></p>
            <p>节目名称：{{episodeTitle}}</p>
            <p>节目简介：{{episodeDescription}}</p>
            
            <p>我们相信您的专业见解和独特视角将为我们的节目增添巨大价值，也期待与您进行一次精彩的对话。</p>
            
            <p>如果您方便参加，请回复此邮件或联系我们的节目制作人。我们将与您沟通具体的录制时间和细节安排。</p>
            
            <p>再次感谢您的考虑，期待您的回复！</p>
            
            <p>此致<br>播客团队</p>
        </div>
        <div class="footer">
            <p>此邮件为自动发送，请勿直接回复。如有问题请联系节目制作人。</p>
        </div>
    </div>
</body>
</html>',
    '用于邀请嘉宾参与播客节目录制',
    TRUE,
    TRUE,
    NOW(),
    NOW()
);

INSERT IGNORE INTO email_templates (team_id, template_key, name, subject, content, description, is_html, is_enabled, created_at, updated_at)
VALUES (
    1,
    'GUEST_THANK_YOU',
    '嘉宾感谢邮件',
    '感谢您参与我们的播客节目录制',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>感谢参与播客录制</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>感谢您的参与！</h2>
        </div>
        <div class="content">
            <p>亲爱的 <strong>{{guestName}}</strong>：</p>
            
            <p>衷心感谢您参与我们的播客节目《{{episodeTitle}}》的录制！</p>
            
            <p>您的精彩分享和专业见解让这期节目增色不少，我们相信听众们一定会从您的分享中获益良多。</p>
            
            <p><strong>节目信息：</strong></p>
            <p>节目名称：{{episodeTitle}}</p>
            <p>节目简介：{{episodeDescription}}</p>
            
            <p>节目后期制作完成后，我们会第一时间将播出链接发送给您。同时也希望您能在您的社交平台上分享这期节目，让更多人听到您的声音。</p>
            
            <p>再次感谢您的宝贵时间和精彩分享，期待未来还有机会与您合作！</p>
            
            <p>如果您对这期节目有任何反馈或建议，欢迎随时告诉我们。</p>
            
            <p>此致<br>播客团队</p>
        </div>
        <div class="footer">
            <p>感谢您的支持与陪伴！</p>
        </div>
    </div>
</body>
</html>',
    '用于感谢嘉宾参与播客节目录制',
    TRUE,
    TRUE,
    NOW(),
    NOW()
);
