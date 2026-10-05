-- Collapse thickness text so "12 MM" and "12mm" both become "12MM".
-- Spaces are removed. Values such as 10MM(5+5) stay unchanged.
-- NULL and blank thickness are left as they are.
-- Run on schema `dev` (staging and the dev-products connection). Preview first.

SELECT thickness AS before_value,
       UPPER(REPLACE(TRIM(thickness), ' ', '')) AS after_value,
       COUNT(*) AS products
FROM products
WHERE thickness IS NOT NULL
  AND thickness <> UPPER(REPLACE(TRIM(thickness), ' ', ''))
GROUP BY thickness, UPPER(REPLACE(TRIM(thickness), ' ', ''))
ORDER BY before_value;

UPDATE products
SET thickness = UPPER(REPLACE(TRIM(thickness), ' ', ''))
WHERE thickness IS NOT NULL
  AND thickness <> UPPER(REPLACE(TRIM(thickness), ' ', ''));
