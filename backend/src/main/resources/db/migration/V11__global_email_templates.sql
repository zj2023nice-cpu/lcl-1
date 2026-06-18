ALTER TABLE email_templates MODIFY COLUMN team_id BIGINT NULL;

CREATE INDEX idx_email_templates_template_key_null_team ON email_templates (template_key);
