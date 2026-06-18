ALTER TABLE episodes ADD COLUMN publish_date DATE;

ALTER TABLE notifications ALTER COLUMN type TYPE VARCHAR(30);
