-- =============================================
-- Blog System Tables for Liftlio
-- Created: 2025-12-28
-- Description: Complete blog system with posts, categories, tags, comments, likes, and newsletter
-- Applied via MCP: mcp__supabase__apply_migration
-- =============================================

-- 1. blog_categories (must be created first for FK reference)
CREATE TABLE IF NOT EXISTS blog_categories (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#8b5cf6',
  icon VARCHAR(50),
  parent_id BIGINT REFERENCES blog_categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. blog_tags
CREATE TABLE IF NOT EXISTS blog_tags (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. blog_posts (main table)
CREATE TABLE IF NOT EXISTS blog_posts (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  subtitle VARCHAR(500),
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_image_url TEXT,
  cover_image_alt VARCHAR(255),

  -- SEO Fields
  meta_title VARCHAR(70),
  meta_description VARCHAR(160),
  focus_keyword VARCHAR(100),
  secondary_keywords TEXT[],
  canonical_url TEXT,
  og_image_url TEXT,
  no_index BOOLEAN DEFAULT FALSE,

  -- Author
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name VARCHAR(255),
  author_avatar_url TEXT,
  author_bio TEXT,

  -- Category (main category)
  category_id BIGINT REFERENCES blog_categories(id) ON DELETE SET NULL,

  -- Status & Scheduling
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'password')),
  password_hash TEXT,
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,

  -- Metrics (denormalized for performance)
  view_count BIGINT DEFAULT 0,
  unique_view_count BIGINT DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  comment_count BIGINT DEFAULT 0,
  share_count BIGINT DEFAULT 0,
  reading_time_minutes INTEGER DEFAULT 5,
  word_count INTEGER DEFAULT 0,

  -- Features
  featured BOOLEAN DEFAULT FALSE,
  allow_comments BOOLEAN DEFAULT TRUE,
  table_of_contents JSONB,

  -- Schema.org
  schema_type VARCHAR(50) DEFAULT 'BlogPosting',
  schema_json JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. blog_post_categories (M:N for additional categories)
CREATE TABLE IF NOT EXISTS blog_post_categories (
  post_id BIGINT REFERENCES blog_posts(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES blog_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

-- 5. blog_post_tags (M:N)
CREATE TABLE IF NOT EXISTS blog_post_tags (
  post_id BIGINT REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id BIGINT REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- 6. blog_comments (only logged-in users)
CREATE TABLE IF NOT EXISTS blog_comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT REFERENCES blog_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id BIGINT REFERENCES blog_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_author_reply BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. blog_likes
CREATE TABLE IF NOT EXISTS blog_likes (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT REFERENCES blog_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reaction_type VARCHAR(20) DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'insightful', 'helpful')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 8. blog_comment_likes
CREATE TABLE IF NOT EXISTS blog_comment_likes (
  id BIGSERIAL PRIMARY KEY,
  comment_id BIGINT REFERENCES blog_comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- 9. blog_subscribers (newsletter)
CREATE TABLE IF NOT EXISTS blog_subscribers (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  source VARCHAR(50) DEFAULT 'blog',
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  confirmation_token VARCHAR(255)
);

-- 10. blog_views (detailed analytics)
CREATE TABLE IF NOT EXISTS blog_views (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT REFERENCES blog_posts(id) ON DELETE CASCADE NOT NULL,
  visitor_id VARCHAR(255),
  session_id VARCHAR(255),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referrer TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),
  country VARCHAR(100),
  city VARCHAR(100),
  scroll_depth INTEGER,
  time_on_page INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. blog_shares
CREATE TABLE IF NOT EXISTS blog_shares (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT REFERENCES blog_posts(id) ON DELETE CASCADE NOT NULL,
  platform VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. blog_media (for image management)
CREATE TABLE IF NOT EXISTS blog_media (
  id BIGSERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  mime_type VARCHAR(100),
  size_bytes INTEGER,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  alt_text TEXT,
  caption TEXT,
  width INTEGER,
  height INTEGER,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES for Performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_blog_posts_view_count ON blog_posts(view_count DESC);

CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);
CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags(slug);

CREATE INDEX IF NOT EXISTS idx_blog_comments_post ON blog_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_user ON blog_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent ON blog_comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_blog_views_post ON blog_views(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_views_date ON blog_views(created_at);
CREATE INDEX IF NOT EXISTS idx_blog_views_visitor ON blog_views(visitor_id);

CREATE INDEX IF NOT EXISTS idx_blog_likes_post ON blog_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_subscribers_email ON blog_subscribers(email);
