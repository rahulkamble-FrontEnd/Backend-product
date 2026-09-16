-- Update description / pros / cons for LAMINATES products by thickness.
-- Run in MySQL Workbench against the dev database.

USE dev;

-- Preview affected rows before update
SELECT p.thickness, COUNT(*) AS cnt
FROM products p
INNER JOIN product_categories pc ON pc.product_id = p.id
INNER JOIN categories c ON c.id = pc.category_id
WHERE c.slug = 'laminates'
  AND p.thickness IN (
    '1 MM', '1.0 MM', '1MM',
    '0.8 MM', '0.8MM',
    '0.72 MM', '0.72MM'
  )
GROUP BY p.thickness
ORDER BY p.thickness;

SET SQL_SAFE_UPDATES = 0;

-- 1.0 mm laminate (stored as 1 MM)
UPDATE products p
INNER JOIN product_categories pc ON pc.product_id = p.id
INNER JOIN categories c ON c.id = pc.category_id
SET
  p.description = 'Preferred for highly visible and frequently used external surfaces such as shutters,wardrobe fronts and furniture facades. Provides a more substantial surface layer and is available in a wide variety of premium finishes and textures.',
  p.pros = JSON_ARRAY(
    'More robust surface',
    'Better suited to high-use areas',
    'Resistance to minor impact and wear',
    'Extensive choice of finishes',
    'Premium feel'
  ),
  p.cons = JSON_ARRAY(
    'More expensive than thinner laminates',
    'Adds slightly more thickness and weight',
    'Not necessary for every application'
  )
WHERE c.slug = 'laminates'
  AND p.thickness IN ('1 MM', '1.0 MM', '1MM');

-- 0.8 mm laminate
UPDATE products p
INNER JOIN product_categories pc ON pc.product_id = p.id
INNER JOIN categories c ON c.id = pc.category_id
SET
  p.description = 'A medium-thickness laminate that provides a good balance between durability, appearance and cost. Suitable for a wide range of furniture surfaces where the additional thickness of a 1 mm or higher laminate may not be required.',
  p.pros = JSON_ARRAY(
    'Good durability',
    'Lighter and more economical than 1 mm',
    'Suitable for many furniture applications',
    'Good balance of performance and price'
  ),
  p.cons = JSON_ARRAY(
    'Slightly less robust than 1 mm under heavy use or impact',
    'Limited finish and colour options'
  )
WHERE c.slug = 'laminates'
  AND p.thickness IN ('0.8 MM', '0.8MM');

-- 0.72 mm laminate
UPDATE products p
INNER JOIN product_categories pc ON pc.product_id = p.id
INNER JOIN categories c ON c.id = pc.category_id
SET
  p.description = 'A thinner decorative laminate suitable for surfaces where heavy-duty performance is not required. Commonly used for wardrobe inner surfaces.',
  p.pros = JSON_ARRAY(
    'Economical',
    'Lightweight',
    'Adequate for lower-wear applications',
    'Useful for optimising overall furniture cost'
  ),
  p.cons = JSON_ARRAY(
    'Less impact-resistant than thicker laminates',
    'Less suitable for heavily used external surfaces',
    'Limited finish and colour options'
  )
WHERE c.slug = 'laminates'
  AND p.thickness IN ('0.72 MM', '0.72MM');

SET SQL_SAFE_UPDATES = 1;

-- Verify sample rows
SELECT p.name, p.thickness, p.description, p.pros, p.cons
FROM products p
INNER JOIN product_categories pc ON pc.product_id = p.id
INNER JOIN categories c ON c.id = pc.category_id
WHERE c.slug = 'laminates'
  AND p.thickness IN ('1 MM', '0.8 MM', '0.72 MM')
LIMIT 9;
