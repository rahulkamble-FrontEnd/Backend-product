-- Update description / pros / cons for ACRYLIC and PU PAINTS (all products in category).
-- Run in MySQL Workbench. Change USE <db> for stg/prod if needed.

USE dev;

-- Preview counts
SELECT c.slug, c.name, COUNT(*) AS cnt
FROM products p
INNER JOIN product_categories pc ON pc.product_id = p.id
INNER JOIN categories c ON c.id = pc.category_id
WHERE c.slug IN ('acrylic', 'pu-paints')
GROUP BY c.slug, c.name
ORDER BY c.slug;

SET SQL_SAFE_UPDATES = 0;

-- ACRYLIC (all products)
UPDATE products p
INNER JOIN product_categories pc ON pc.product_id = p.id
INNER JOIN categories c ON c.id = pc.category_id
SET
  p.description = 'A high-gloss surface material applied over boards such as MDF or HDHMR to create a sleek, contemporary and premium appearance. Its smooth, highly reflective surface provides excellent colour depth and brightness and is particularly suited to modern kitchens, wardrobes and statement furniture.',
  p.pros = JSON_ARRAY(
    'Premium high-gloss appearance',
    'Highly reflective and contemporary finish',
    'Smooth surface',
    'Easy to clean and maintain',
    'Good moisture resistance at the surface',
    'Retains its gloss well'
  ),
  p.cons = JSON_ARRAY(
    'More expensive than laminates',
    'Fingerprints and smudges are more visible, particularly on darker colours',
    'Can develop scratches with improper handling',
    'Quality of application and substrate preparation is important'
  )
WHERE c.slug = 'acrylic';

-- PU PAINTS (all products)
UPDATE products p
INNER JOIN product_categories pc ON pc.product_id = p.id
INNER JOIN categories c ON c.id = pc.category_id
SET
  p.description = 'A premium painted finish applied over a properly prepared furniture surface to create a seamless, smooth and sophisticated appearance. PU can be customised in a wide range of colours, making it particularly suitable for premium and customised interiors.',
  p.pros = JSON_ARRAY(
    'Premium, seamless appearance',
    'Virtually unlimited colour selection',
    'Excellent for customised designs, grooves and routed shutters',
    'Sophisticated and luxurious appearance'
  ),
  p.cons = JSON_ARRAY(
    'More expensive than laminates',
    'Application is labour-intensive and requires skilled workmanship',
    'Longer production time due to multiple preparation, coating and curing stages'
  )
WHERE c.slug = 'pu-paints';

SET SQL_SAFE_UPDATES = 1;

-- Verify sample
SELECT c.slug, p.name, LEFT(p.description, 80) AS description_preview, p.pros, p.cons
FROM products p
INNER JOIN product_categories pc ON pc.product_id = p.id
INNER JOIN categories c ON c.id = pc.category_id
WHERE c.slug IN ('acrylic', 'pu-paints')
LIMIT 6;
