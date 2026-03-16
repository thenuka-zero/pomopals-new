ALTER TABLE `intentions` ADD `session_group_id` text;
CREATE INDEX IF NOT EXISTS `idx_intentions_session_group` ON `intentions` (`session_group_id`);
