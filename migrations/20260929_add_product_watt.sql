-- Adds products.watt for the Lighting category filter.
-- Stored as text (example: 12W). Nullable so existing products stay unchanged.

SET @db_name = DATABASE();

SET @has_watt = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'watt'
);

SET @sql_add_watt = IF(
  @has_watt = 0,
  'ALTER TABLE products ADD COLUMN watt varchar(100) NULL AFTER thickness',
  'SELECT "products.watt already exists"'
);

PREPARE stmt FROM @sql_add_watt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
