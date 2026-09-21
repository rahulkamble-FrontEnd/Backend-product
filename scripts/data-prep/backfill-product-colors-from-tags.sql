-- One-time backfill: copy tag name + hex onto products that already have tags
-- but missing color_name / color_hex (Option A).
-- Rule: last linked tag wins (highest product_tags.id).
-- Only updates rows where color is currently empty/null.
-- Run in MySQL Workbench against the target database.

USE dev;

-- Preview: how many tagged products are missing color
SELECT COUNT(DISTINCT pt.product_id) AS products_missing_color
FROM product_tags pt
INNER JOIN products p ON p.id = pt.product_id
WHERE (p.color_name IS NULL OR TRIM(p.color_name) = '')
   OR (p.color_hex IS NULL OR TRIM(p.color_hex) = '');

-- Preview sample rows that will be updated
SELECT
  p.id AS product_id,
  p.sku,
  p.color_name AS old_color_name,
  p.color_hex AS old_color_hex,
  t.name AS tag_name,
  t.hex_code AS tag_hex
FROM products p
INNER JOIN product_tags pt ON pt.product_id = p.id
INNER JOIN tags t ON t.id = pt.tag_id
INNER JOIN (
  SELECT product_id, MAX(id) AS latest_link_id
  FROM product_tags
  GROUP BY product_id
) latest ON latest.product_id = pt.product_id AND latest.latest_link_id = pt.id
WHERE (p.color_name IS NULL OR TRIM(p.color_name) = '')
   OR (p.color_hex IS NULL OR TRIM(p.color_hex) = '')
LIMIT 50;

SET SQL_SAFE_UPDATES = 0;

UPDATE products p
INNER JOIN product_tags pt ON pt.product_id = p.id
INNER JOIN tags t ON t.id = pt.tag_id
INNER JOIN (
  SELECT product_id, MAX(id) AS latest_link_id
  FROM product_tags
  GROUP BY product_id
) latest ON latest.product_id = pt.product_id AND latest.latest_link_id = pt.id
SET
  p.color_name = t.name,
  p.color_hex = UPPER(t.hex_code)
WHERE (p.color_name IS NULL OR TRIM(p.color_name) = '')
   OR (p.color_hex IS NULL OR TRIM(p.color_hex) = '');

SET SQL_SAFE_UPDATES = 1;

-- Verify: remaining tagged products still missing color (should be 0)
SELECT COUNT(DISTINCT pt.product_id) AS still_missing_color
FROM product_tags pt
INNER JOIN products p ON p.id = pt.product_id
WHERE (p.color_name IS NULL OR TRIM(p.color_name) = '')
   OR (p.color_hex IS NULL OR TRIM(p.color_hex) = '');
