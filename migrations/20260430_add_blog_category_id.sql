-- Safe migration for blog category relation
-- Adds blog_posts.category_id and links it to categories.id
-- Compatible with MySQL (idempotent checks included)

SET @db_name = DATABASE();

-- 1) Add nullable category_id column if missing
SET @has_category_id = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'blog_posts'
    AND COLUMN_NAME = 'category_id'
);

SET @sql_add_category_id = IF(
  @has_category_id = 0,
  'ALTER TABLE blog_posts ADD COLUMN category_id char(36) NULL AFTER slug',
  'SELECT "blog_posts.category_id already exists"'
);
PREPARE stmt FROM @sql_add_category_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Add index for category_id if missing
SET @has_category_idx = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'blog_posts'
    AND INDEX_NAME = 'idx_blog_posts_category_id'
);

SET @sql_add_category_idx = IF(
  @has_category_idx = 0,
  'CREATE INDEX idx_blog_posts_category_id ON blog_posts (category_id)',
  'SELECT "idx_blog_posts_category_id already exists"'
);
PREPARE stmt FROM @sql_add_category_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) Add foreign key if missing
SET @has_category_fk = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'blog_posts'
    AND CONSTRAINT_NAME = 'fk_blog_posts_category'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @sql_add_category_fk = IF(
  @has_category_fk = 0,
  'ALTER TABLE blog_posts ADD CONSTRAINT fk_blog_posts_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE NO ACTION',
  'SELECT "fk_blog_posts_category already exists"'
);
PREPARE stmt FROM @sql_add_category_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Optional cleanup (manual decision):
-- If you no longer need old text tags, you can drop the legacy column:
-- ALTER TABLE blog_posts DROP COLUMN category_tag;
