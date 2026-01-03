-- =============================================
-- Funcao: get_blog_html
-- Descricao: Retorna HTML pre-renderizado de um post
-- Criado: 2026-01-03
-- Custo: GRATIS (SQL puro via PostgREST)
--
-- Uso via HTTP (nginx proxy):
-- GET https://liftlio.com/blog/[slug]
--
-- Uso via PostgREST direto:
-- curl "https://suqjifkhmekcdflwowiw.supabase.co/rest/v1/rpc/get_blog_html?p_slug=my-post"
-- =============================================

CREATE OR REPLACE FUNCTION get_blog_html(p_slug TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    result TEXT;
BEGIN
    SELECT html_rendered INTO result
    FROM blog_posts
    WHERE slug = p_slug
      AND status = 'published'
      AND (visibility = 'public' OR visibility IS NULL);

    IF result IS NULL THEN
        -- Retorna 404 HTML se post nao encontrado
        RETURN '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Post Not Found - Liftlio Blog</title>
    <meta name="robots" content="noindex">
    <style>
        body { font-family: Inter, sans-serif; background: #0f0a1a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .container { text-align: center; padding: 40px; }
        h1 { color: #8b5cf6; margin-bottom: 16px; }
        a { color: #8b5cf6; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>404 - Post Not Found</h1>
        <p>The blog post you are looking for does not exist or has been removed.</p>
        <p><a href="https://liftlio.com/blog">Back to Blog</a></p>
    </div>
</body>
</html>';
    END IF;

    RETURN result;
END;
$$;

-- Permissao para acesso anonimo (via PostgREST)
GRANT EXECUTE ON FUNCTION get_blog_html(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_blog_html(TEXT) TO authenticated;

COMMENT ON FUNCTION get_blog_html(TEXT) IS 'Returns pre-rendered HTML for a blog post by slug. Used by nginx proxy to serve SEO-friendly pages. FREE via PostgREST.';


-- =============================================
-- Funcao: get_blog_list_html
-- Descricao: Retorna HTML da listagem do blog
-- Criado: 2026-01-03
-- =============================================

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
BEGIN
    -- Gera HTML para cada post
    FOR post IN
        SELECT
            slug, title, subtitle, excerpt,
            cover_image_url, cover_image_alt,
            author_name, published_at,
            reading_time_minutes, word_count
        FROM blog_posts
        WHERE status = 'published'
          AND (visibility = 'public' OR visibility IS NULL)
        ORDER BY published_at DESC
        LIMIT 50
    LOOP
        posts_html := posts_html || format(
            '<article class="post-card">
                <a href="/blog/%s">
                    %s
                    <div class="post-content">
                        <h2>%s</h2>
                        %s
                        <div class="post-meta">
                            <span>%s</span>
                            <span>·</span>
                            <span>%s min read</span>
                            <span>·</span>
                            <span>%s</span>
                        </div>
                    </div>
                </a>
            </article>',
            post.slug,
            CASE WHEN post.cover_image_url IS NOT NULL
                 THEN '<img src="' || post.cover_image_url || '" alt="' || COALESCE(post.cover_image_alt, post.title) || '" class="post-image" loading="lazy" />'
                 ELSE '' END,
            post.title,
            CASE WHEN post.excerpt IS NOT NULL
                 THEN '<p class="post-excerpt">' || LEFT(post.excerpt, 160) || '</p>'
                 ELSE '' END,
            COALESCE(post.author_name, 'Liftlio Team'),
            COALESCE(post.reading_time_minutes, CEIL(COALESCE(post.word_count, 1000) / 200.0)::INT),
            TO_CHAR(post.published_at, 'Mon DD, YYYY')
        );
    END LOOP;

    -- Monta HTML completo da listagem
    html := format(
        '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog - Liftlio | YouTube Monitoring & Brand Intelligence</title>
    <meta name="description" content="Expert insights on YouTube marketing, brand monitoring, sentiment analysis, and video content strategy. Learn how to grow your brand presence on YouTube.">
    <meta name="keywords" content="youtube marketing, brand monitoring, video analytics, sentiment analysis, youtube comments, brand mentions">
    <link rel="canonical" href="https://liftlio.com/blog">

    <meta property="og:type" content="website">
    <meta property="og:url" content="https://liftlio.com/blog">
    <meta property="og:title" content="Liftlio Blog - YouTube Marketing Insights">
    <meta property="og:description" content="Expert insights on YouTube marketing, brand monitoring, and video content strategy.">
    <meta property="og:image" content="https://liftlio.com/og-blog.png">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Liftlio Blog - YouTube Marketing Insights">
    <meta name="twitter:description" content="Expert insights on YouTube marketing, brand monitoring, and video content strategy.">

    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "Liftlio Blog",
        "description": "Expert insights on YouTube marketing and brand monitoring",
        "url": "https://liftlio.com/blog",
        "publisher": {
            "@type": "Organization",
            "name": "Liftlio",
            "logo": { "@type": "ImageObject", "url": "https://liftlio.com/logo.png" }
        }
    }
    </script>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <style>
        :root { --primary: #8b5cf6; --bg: #0f0a1a; --bg-card: #1a1425; --text: #e2e8f0; --text-muted: #94a3b8; --border: #2d2640; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: "Inter", sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 60px 20px; }

        header { text-align: center; margin-bottom: 60px; }
        header h1 { font-size: 3rem; margin-bottom: 16px; background: linear-gradient(135deg, #fff, var(--primary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        header p { font-size: 1.25rem; color: var(--text-muted); max-width: 600px; margin: 0 auto; }

        .posts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 32px; }

        .post-card { background: var(--bg-card); border-radius: 16px; overflow: hidden; border: 1px solid var(--border); transition: all 0.3s; }
        .post-card:hover { transform: translateY(-4px); border-color: var(--primary); }
        .post-card a { text-decoration: none; color: inherit; display: block; }

        .post-image { width: 100%%; height: 200px; object-fit: cover; }
        .post-content { padding: 24px; }
        .post-content h2 { font-size: 1.25rem; margin-bottom: 12px; color: #fff; line-height: 1.4; }
        .post-excerpt { color: var(--text-muted); font-size: 14px; margin-bottom: 16px; line-height: 1.6; }
        .post-meta { display: flex; gap: 8px; color: var(--text-muted); font-size: 13px; flex-wrap: wrap; }

        footer { text-align: center; padding: 60px 20px; border-top: 1px solid var(--border); margin-top: 60px; color: var(--text-muted); }
        footer a { color: var(--primary); text-decoration: none; }

        @media (max-width: 640px) {
            header h1 { font-size: 2rem; }
            .posts-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Liftlio Blog</h1>
            <p>Expert insights on YouTube marketing, brand monitoring, and growing your video presence.</p>
        </header>

        <div class="posts-grid">
            %s
        </div>
    </div>

    <footer>
        <p>&copy; 2024-2026 <a href="https://liftlio.com">Liftlio</a>. All rights reserved.</p>
    </footer>
</body>
</html>',
        posts_html
    );

    RETURN html;
END;
$$;

GRANT EXECUTE ON FUNCTION get_blog_list_html() TO anon;
GRANT EXECUTE ON FUNCTION get_blog_list_html() TO authenticated;

COMMENT ON FUNCTION get_blog_list_html() IS 'Returns pre-rendered HTML for blog listing page. FREE via PostgREST.';
