-- Adds the 'useradmin' role (can only manage users: list, create, edit, deactivate).
-- Run once on staging (test) and once on production (dev-products), schema: dev.
-- Only appends a new value to the enum; existing users and roles are unchanged.

ALTER TABLE users
  MODIFY COLUMN role ENUM('customer', 'designer', 'admin', 'blogadmin', 'dataadmin', 'useradmin') NOT NULL;
