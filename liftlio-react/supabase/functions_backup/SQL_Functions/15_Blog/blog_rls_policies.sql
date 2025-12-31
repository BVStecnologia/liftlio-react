-- =============================================
-- Blog RLS Policies
-- Created: 2025-12-28
-- Description: Row Level Security policies for blog tables
-- =============================================

-- blog_posts RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published posts" ON blog_posts
  FOR SELECT USING (
    status = 'published'
    AND visibility = 'public'
    AND (published_at IS NULL OR published_at <= NOW())
  );

CREATE POLICY "Admin full access to posts" ON blog_posts
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'valdair3d@gmail.com'
  );

-- blog_categories RLS
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view categories" ON blog_categories
  FOR SELECT USING (TRUE);

CREATE POLICY "Admin can manage categories" ON blog_categories
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'valdair3d@gmail.com'
  );

-- blog_tags RLS
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view tags" ON blog_tags
  FOR SELECT USING (TRUE);

CREATE POLICY "Admin can manage tags" ON blog_tags
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'valdair3d@gmail.com'
  );

-- blog_comments RLS
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view comments" ON blog_comments
  FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can add comments" ON blog_comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can edit own comments" ON blog_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON blog_comments
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admin full access to comments" ON blog_comments
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'valdair3d@gmail.com'
  );

-- blog_likes RLS
ALTER TABLE blog_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view likes" ON blog_likes
  FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can like" ON blog_likes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can remove own likes" ON blog_likes
  FOR DELETE USING (auth.uid() = user_id);

-- blog_subscribers RLS
ALTER TABLE blog_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view subscribers" ON blog_subscribers
  FOR SELECT USING (
    auth.jwt() ->> 'email' = 'valdair3d@gmail.com'
  );

CREATE POLICY "Anyone can subscribe" ON blog_subscribers
  FOR INSERT WITH CHECK (TRUE);

-- blog_views RLS
ALTER TABLE blog_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view analytics" ON blog_views
  FOR SELECT USING (
    auth.jwt() ->> 'email' = 'valdair3d@gmail.com'
  );

CREATE POLICY "Anyone can record views" ON blog_views
  FOR INSERT WITH CHECK (TRUE);
