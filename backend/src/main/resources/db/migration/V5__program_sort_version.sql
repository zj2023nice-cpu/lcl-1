-- 为 programs 表添加排序版本号
ALTER TABLE programs 
ADD COLUMN sort_version BIGINT NOT NULL DEFAULT 0;
