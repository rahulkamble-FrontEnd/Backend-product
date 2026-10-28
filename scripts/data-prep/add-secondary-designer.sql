-- Adds an optional second designer per customer (primary stays in assigned_designer_id).
-- Run ONCE on each environment (staging, then production) BEFORE deploying the backend.
-- Safe for existing data: new column is NULL for everyone, so current assignments are unchanged.

ALTER TABLE users
  ADD COLUMN secondary_designer_id varchar(36) NULL DEFAULT NULL AFTER assigned_designer_id,
  ADD KEY IDX_users_secondary_designer_id (secondary_designer_id),
  ADD CONSTRAINT FK_users_secondary_designer_id
    FOREIGN KEY (secondary_designer_id) REFERENCES users (id);

-- Verify:
-- SHOW COLUMNS FROM users LIKE 'secondary_designer_id';
