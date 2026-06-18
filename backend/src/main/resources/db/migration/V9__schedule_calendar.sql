ALTER TABLE episodes ADD COLUMN publish_date DATE;

ALTER TABLE notifications MODIFY COLUMN type VARCHAR(30);
