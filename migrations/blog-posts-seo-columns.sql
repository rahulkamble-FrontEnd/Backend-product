-- Run once if DB_SYNCHRONIZE is false. Adds SEO / featured-image text columns for blog_posts.

ALTER TABLE blog_posts ADD COLUMN featured_image_alt VARCHAR(255) NULL;
ALTER TABLE blog_posts ADD COLUMN featured_image_title VARCHAR(255) NULL;
ALTER TABLE blog_posts ADD COLUMN meta_description VARCHAR(320) NULL;
ALTER TABLE blog_posts ADD COLUMN seo_keyword VARCHAR(120) NULL;
