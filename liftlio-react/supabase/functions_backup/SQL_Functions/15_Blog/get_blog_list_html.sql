-- =============================================
-- Function: get_blog_list_html
-- Description: Returns pre-rendered HTML for blog listing page. FREE via PostgREST.
-- Parameters: None
-- Returns: TEXT - Full HTML page with blog post cards
-- Created: 2026-01-03
-- Author: Supabase MCP Expert Agent
-- =============================================

DROP FUNCTION IF EXISTS get_blog_list_html();

CREATE OR REPLACE FUNCTION get_blog_list_html()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    html TEXT;
    posts_html TEXT := '';
    post RECORD;
    reading_time INT;
BEGIN
    FOR post IN
        SELECT slug, title, subtitle, excerpt, cover_image_url, cover_image_alt,
               author_name, published_at, reading_time_minutes, word_count
        FROM blog_posts
        WHERE status = 'published' AND (visibility = 'public' OR visibility IS NULL)
        ORDER BY published_at DESC LIMIT 50
    LOOP
        -- Calculate reading time with fallback
        reading_time := COALESCE(post.reading_time_minutes, CEIL(COALESCE(post.word_count, 1000) / 200.0)::INT);

        posts_html := posts_html || '<article class="post-card"><a href="/blog/' || COALESCE(post.slug, '') || '">';

        IF post.cover_image_url IS NOT NULL THEN
            posts_html := posts_html || '<img src="' || post.cover_image_url || '" alt="' || COALESCE(post.cover_image_alt, post.title, 'Blog post image') || '" class="post-image" loading="lazy"/>';
        END IF;

        posts_html := posts_html || '<div class="post-content"><h2>' || COALESCE(post.title, 'Untitled') || '</h2>';

        IF post.excerpt IS NOT NULL THEN
            posts_html := posts_html || '<p class="post-excerpt">' || LEFT(post.excerpt, 160) || '</p>';
        END IF;

        posts_html := posts_html || '<div class="post-meta"><span>' || COALESCE(post.author_name, 'Liftlio Team') || '</span><span>-</span><span>' || reading_time::TEXT || ' min</span><span>-</span><span>' || COALESCE(TO_CHAR(post.published_at, 'Mon DD, YYYY'), 'Recent') || '</span></div></div></a></article>';
    END LOOP;

    html := '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Blog - Liftlio | YouTube Monitoring</title><meta name="description" content="Expert insights on YouTube marketing, brand monitoring, and video content strategy."><link rel="canonical" href="https://liftlio.com/blog"><meta property="og:type" content="website"><meta property="og:url" content="https://liftlio.com/blog"><meta property="og:title" content="Liftlio Blog"><meta property="og:description" content="Expert insights on YouTube marketing and brand monitoring."><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Blog","name":"Liftlio Blog","url":"https://liftlio.com/blog","publisher":{"@type":"Organization","name":"Liftlio"}}</script><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><style>:root{--primary:#8b5cf6;--bg:#0f0a1a;--bg-card:#1a1425;--text:#e2e8f0;--text-muted:#94a3b8;--border:#2d2640}*{margin:0;padding:0;box-sizing:border-box}body{font-family:Inter,sans-serif;background:var(--bg);color:var(--text);line-height:1.6}.container{max-width:1200px;margin:0 auto;padding:60px 20px}header{text-align:center;margin-bottom:60px}header h1{font-size:3rem;margin-bottom:16px;background:linear-gradient(135deg,#fff,var(--primary));-webkit-background-clip:text;-webkit-text-fill-color:transparent}header p{font-size:1.25rem;color:var(--text-muted);max-width:600px;margin:0 auto}.posts-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(350px,1fr));gap:32px}.post-card{background:var(--bg-card);border-radius:16px;overflow:hidden;border:1px solid var(--border);transition:all 0.3s}.post-card:hover{transform:translateY(-4px);border-color:var(--primary)}.post-card a{text-decoration:none;color:inherit;display:block}.post-image{width:100%;height:200px;object-fit:cover}.post-content{padding:24px}.post-content h2{font-size:1.25rem;margin-bottom:12px;color:#fff;line-height:1.4}.post-excerpt{color:var(--text-muted);font-size:14px;margin-bottom:16px}.post-meta{display:flex;gap:8px;color:var(--text-muted);font-size:13px;flex-wrap:wrap}footer{text-align:center;padding:60px 20px;border-top:1px solid var(--border);margin-top:60px;color:var(--text-muted)}footer a{color:var(--primary);text-decoration:none}@media(max-width:640px){header h1{font-size:2rem}.posts-grid{grid-template-columns:1fr}}</style></head><body><div class="container"><header><h1>Liftlio Blog</h1><p>Expert insights on YouTube marketing and brand monitoring.</p></header><div class="posts-grid">' || posts_html || '</div></div><footer><p>2024-2026 <a href="https://liftlio.com">Liftlio</a>. All rights reserved.</p></footer></body></html>';

    RETURN html;
END;
$$;

GRANT EXECUTE ON FUNCTION get_blog_list_html() TO anon;
GRANT EXECUTE ON FUNCTION get_blog_list_html() TO authenticated;

COMMENT ON FUNCTION get_blog_list_html() IS 'Returns pre-rendered HTML for blog listing. FREE via PostgREST.';
