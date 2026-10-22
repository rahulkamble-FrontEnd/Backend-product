-- Creates the delete_logs table used by the admin "Delete Logs" page (src/delete-log).
-- Run once on staging (test) and once on production (dev-products), schema: dev.
-- Safe to re-run: does nothing if the table already exists.

CREATE TABLE IF NOT EXISTS delete_logs (
  id VARCHAR(36) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  action VARCHAR(20) NOT NULL,
  entity_id VARCHAR(36) NULL,
  entity_name VARCHAR(500) NULL,
  parent_name VARCHAR(500) NULL,
  deleted_by_id VARCHAR(36) NULL,
  deleted_by_name VARCHAR(150) NULL,
  deleted_by_email VARCHAR(255) NULL,
  deleted_by_role VARCHAR(20) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_delete_logs_entity_type (entity_type),
  KEY idx_delete_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
