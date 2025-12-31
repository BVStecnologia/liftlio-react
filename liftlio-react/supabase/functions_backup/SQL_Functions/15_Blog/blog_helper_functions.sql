-- =============================================
-- Blog Helper Functions
-- Created: 2025-12-28
-- Description: Utility functions for blog system
-- =============================================

-- Function to calculate reading time
CREATE OR REPLACE FUNCTION calculate_reading_time(content TEXT)
RETURNS INTEGER AS $$
DECLARE
  word_count INTEGER;
  reading_time INTEGER;
BEGIN
  -- Count words (split by whitespace)
  word_count := array_length(regexp_split_to_array(content, '\s+'), 1);
  -- Average reading speed: 200 words per minute
  reading_time := GREATEST(1, CEIL(word_count::NUMERIC / 200));
  RETURN reading_time;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_blog_post_views(post_slug TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE blog_posts
  SET view_count = view_count + 1,
      updated_at = NOW()
  WHERE slug = post_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to update post metrics
CREATE OR REPLACE FUNCTION update_blog_post_metrics(post_id_param BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE blog_posts
  SET
    like_count = (SELECT COUNT(*) FROM blog_likes WHERE post_id = post_id_param),
    comment_count = (SELECT COUNT(*) FROM blog_comments WHERE post_id = post_id_param),
    share_count = (SELECT COUNT(*) FROM blog_shares WHERE post_id = post_id_param),
    updated_at = NOW()
  WHERE id = post_id_param;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update reading time and word count
CREATE OR REPLACE FUNCTION blog_post_before_save()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate word count
  NEW.word_count := array_length(regexp_split_to_array(NEW.content, '\s+'), 1);
  -- Calculate reading time
  NEW.reading_time_minutes := GREATEST(1, CEIL(NEW.word_count::NUMERIC / 200));
  -- Auto-generate slug if not provided
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.title);
  END IF;
  -- Update timestamp
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER blog_post_before_save_trigger
  BEFORE INSERT OR UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION blog_post_before_save();

-- Trigger to update category post count
CREATE OR REPLACE FUNCTION update_category_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE blog_categories
    SET post_count = (
      SELECT COUNT(*) FROM blog_posts
      WHERE category_id = NEW.category_id AND status = 'published'
    )
    WHERE id = NEW.category_id;
  END IF;

  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    UPDATE blog_categories
    SET post_count = (
      SELECT COUNT(*) FROM blog_posts
      WHERE category_id = OLD.category_id AND status = 'published'
    )
    WHERE id = OLD.category_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_category_post_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_category_post_count();

-- =============================================
-- Get published posts with pagination
-- =============================================
CREATE OR REPLACE FUNCTION get_published_blog_posts(
  page_num INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 10,
  category_slug_param TEXT DEFAULT NULL,
  tag_slug_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  slug VARCHAR,
  title VARCHAR,
  excerpt TEXT,
  cover_image_url TEXT,
  author_name VARCHAR,
  author_avatar_url TEXT,
  category_name VARCHAR,
  category_slug VARCHAR,
  category_color VARCHAR,
  published_at TIMESTAMPTZ,
  reading_time_minutes INTEGER,
  view_count BIGINT,
  like_count BIGINT,
  comment_count BIGINT,
  tags JSONB,
  total_count BIGINT
) AS $$
DECLARE
  total BIGINT;
BEGIN
  -- Get total count
  SELECT COUNT(*) INTO total
  FROM blog_posts bp
  LEFT JOIN blog_categories bc ON bp.category_id = bc.id
  WHERE bp.status = 'published'
    AND bp.visibility = 'public'
    AND (bp.published_at IS NULL OR bp.published_at <= NOW())
    AND (category_slug_param IS NULL OR bc.slug = category_slug_param)
    AND (tag_slug_param IS NULL OR EXISTS (
      SELECT 1 FROM blog_post_tags bpt
      JOIN blog_tags bt ON bpt.tag_id = bt.id
      WHERE bpt.post_id = bp.id AND bt.slug = tag_slug_param
    ));

  RETURN QUERY
  SELECT
    bp.id,
    bp.slug,
    bp.title,
    bp.excerpt,
    bp.cover_image_url,
    bp.author_name,
    bp.author_avatar_url,
    bc.name AS category_name,
    bc.slug AS category_slug,
    bc.color AS category_color,
    bp.published_at,
    bp.reading_time_minutes,
    bp.view_count,
    bp.like_count,
    bp.comment_count,
    (
      SELECT jsonb_agg(jsonb_build_object('name', bt.name, 'slug', bt.slug))
      FROM blog_post_tags bpt
      JOIN blog_tags bt ON bpt.tag_id = bt.id
      WHERE bpt.post_id = bp.id
    ) AS tags,
    total AS total_count
  FROM blog_posts bp
  LEFT JOIN blog_categories bc ON bp.category_id = bc.id
  WHERE bp.status = 'published'
    AND bp.visibility = 'public'
    AND (bp.published_at IS NULL OR bp.published_at <= NOW())
    AND (category_slug_param IS NULL OR bc.slug = category_slug_param)
    AND (tag_slug_param IS NULL OR EXISTS (
      SELECT 1 FROM blog_post_tags bpt
      JOIN blog_tags bt ON bpt.tag_id = bt.id
      WHERE bpt.post_id = bp.id AND bt.slug = tag_slug_param
    ))
  ORDER BY bp.published_at DESC NULLS LAST
  LIMIT page_size
  OFFSET (page_num - 1) * page_size;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Get single blog post by slug
-- =============================================
CREATE OR REPLACE FUNCTION get_blog_post_by_slug(post_slug TEXT)
RETURNS TABLE (
  id BIGINT,
  slug VARCHAR,
  title VARCHAR,
  subtitle VARCHAR,
  content TEXT,
  excerpt TEXT,
  cover_image_url TEXT,
  cover_image_alt VARCHAR,
  meta_title VARCHAR,
  meta_description VARCHAR,
  focus_keyword VARCHAR,
  og_image_url TEXT,
  canonical_url TEXT,
  author_id UUID,
  author_name VARCHAR,
  author_avatar_url TEXT,
  author_bio TEXT,
  category_id BIGINT,
  category_name VARCHAR,
  category_slug VARCHAR,
  category_color VARCHAR,
  published_at TIMESTAMPTZ,
  reading_time_minutes INTEGER,
  word_count INTEGER,
  view_count BIGINT,
  like_count BIGINT,
  comment_count BIGINT,
  share_count BIGINT,
  allow_comments BOOLEAN,
  table_of_contents JSONB,
  schema_type VARCHAR,
  schema_json JSONB,
  tags JSONB,
  categories JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.slug,
    bp.title,
    bp.subtitle,
    bp.content,
    bp.excerpt,
    bp.cover_image_url,
    bp.cover_image_alt,
    bp.meta_title,
    bp.meta_description,
    bp.focus_keyword,
    bp.og_image_url,
    bp.canonical_url,
    bp.author_id,
    bp.author_name,
    bp.author_avatar_url,
    bp.author_bio,
    bp.category_id,
    bc.name AS category_name,
    bc.slug AS category_slug,
    bc.color AS category_color,
    bp.published_at,
    bp.reading_time_minutes,
    bp.word_count,
    bp.view_count,
    bp.like_count,
    bp.comment_count,
    bp.share_count,
    bp.allow_comments,
    bp.table_of_contents,
    bp.schema_type,
    bp.schema_json,
    (
      SELECT jsonb_agg(jsonb_build_object('id', bt.id, 'name', bt.name, 'slug', bt.slug))
      FROM blog_post_tags bpt
      JOIN blog_tags bt ON bpt.tag_id = bt.id
      WHERE bpt.post_id = bp.id
    ) AS tags,
    (
      SELECT jsonb_agg(jsonb_build_object('id', bc2.id, 'name', bc2.name, 'slug', bc2.slug, 'color', bc2.color))
      FROM blog_post_categories bpc
      JOIN blog_categories bc2 ON bpc.category_id = bc2.id
      WHERE bpc.post_id = bp.id
    ) AS categories
  FROM blog_posts bp
  LEFT JOIN blog_categories bc ON bp.category_id = bc.id
  WHERE bp.slug = post_slug
    AND bp.status = 'published'
    AND bp.visibility = 'public'
    AND (bp.published_at IS NULL OR bp.published_at <= NOW());
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Get related posts
-- =============================================
CREATE OR REPLACE FUNCTION get_related_blog_posts(
  current_post_id BIGINT,
  limit_count INTEGER DEFAULT 3
)
RETURNS TABLE (
  id BIGINT,
  slug VARCHAR,
  title VARCHAR,
  excerpt TEXT,
  cover_image_url TEXT,
  author_name VARCHAR,
  category_name VARCHAR,
  category_slug VARCHAR,
  published_at TIMESTAMPTZ,
  reading_time_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.slug,
    bp.title,
    bp.excerpt,
    bp.cover_image_url,
    bp.author_name,
    bc.name AS category_name,
    bc.slug AS category_slug,
    bp.published_at,
    bp.reading_time_minutes
  FROM blog_posts bp
  LEFT JOIN blog_categories bc ON bp.category_id = bc.id
  WHERE bp.id != current_post_id
    AND bp.status = 'published'
    AND bp.visibility = 'public'
    AND (bp.published_at IS NULL OR bp.published_at <= NOW())
    AND (
      -- Same category
      bp.category_id = (SELECT category_id FROM blog_posts WHERE id = current_post_id)
      -- Or shared tags
      OR EXISTS (
        SELECT 1 FROM blog_post_tags bpt1
        JOIN blog_post_tags bpt2 ON bpt1.tag_id = bpt2.tag_id
        WHERE bpt1.post_id = current_post_id AND bpt2.post_id = bp.id
      )
    )
  ORDER BY bp.published_at DESC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Get blog stats for admin
-- =============================================
CREATE OR REPLACE FUNCTION get_blog_admin_stats()
RETURNS TABLE (
  total_posts BIGINT,
  published_posts BIGINT,
  draft_posts BIGINT,
  scheduled_posts BIGINT,
  total_views BIGINT,
  total_likes BIGINT,
  total_comments BIGINT,
  total_subscribers BIGINT,
  posts_this_month BIGINT,
  views_this_month BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM blog_posts)::BIGINT AS total_posts,
    (SELECT COUNT(*) FROM blog_posts WHERE status = 'published')::BIGINT AS published_posts,
    (SELECT COUNT(*) FROM blog_posts WHERE status = 'draft')::BIGINT AS draft_posts,
    (SELECT COUNT(*) FROM blog_posts WHERE status = 'scheduled')::BIGINT AS scheduled_posts,
    (SELECT COALESCE(SUM(view_count), 0) FROM blog_posts)::BIGINT AS total_views,
    (SELECT COALESCE(SUM(like_count), 0) FROM blog_posts)::BIGINT AS total_likes,
    (SELECT COALESCE(SUM(comment_count), 0) FROM blog_posts)::BIGINT AS total_comments,
    (SELECT COUNT(*) FROM blog_subscribers WHERE status = 'active')::BIGINT AS total_subscribers,
    (SELECT COUNT(*) FROM blog_posts WHERE created_at >= date_trunc('month', NOW()))::BIGINT AS posts_this_month,
    (SELECT COUNT(*) FROM blog_views WHERE created_at >= date_trunc('month', NOW()))::BIGINT AS views_this_month;
END;
$$ LANGUAGE plpgsql;
