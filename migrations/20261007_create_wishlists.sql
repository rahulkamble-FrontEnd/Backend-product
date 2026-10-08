CREATE TABLE IF NOT EXISTS wishlists (
  id varchar(36) NOT NULL,
  customer_id varchar(36) NOT NULL,
  product_id varchar(36) NOT NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_wishlists_customer_product (customer_id, product_id),
  KEY idx_wishlists_customer_id (customer_id),
  KEY idx_wishlists_product_id (product_id),
  CONSTRAINT fk_wishlists_customer FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_wishlists_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);
