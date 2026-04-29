-- Add dataadmin to users.role enum
-- MySQL migration (safe to run once)

ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('customer', 'designer', 'admin', 'blogadmin', 'dataadmin') NOT NULL;

-- Optional rollback:
-- ALTER TABLE `users`
--   MODIFY COLUMN `role` ENUM('customer', 'designer', 'admin', 'blogadmin') NOT NULL;
