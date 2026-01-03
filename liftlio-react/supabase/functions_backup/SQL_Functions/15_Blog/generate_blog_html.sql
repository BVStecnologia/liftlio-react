-- =============================================
-- Funcao: generate_blog_html
-- Descricao: Gera HTML completo com SEO para um post do blog
-- Criado: 2026-01-03
-- Custo: GRATIS (SQL puro, roda no trigger)
-- =============================================

-- Funcao auxiliar para converter markdown basico em HTML
CREATE OR REPLACE FUNCTION markdown_to_html(md_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    result TEXT;
BEGIN
    IF md_text IS NULL THEN
        RETURN '';
    END IF;

    result := md_text;

    -- Escape HTML entities first
    result := REPLACE(result, '&', '&amp;');
    result := REPLACE(result, '<', '&lt;');
    result := REPLACE(result, '>', '&gt;');

    -- Headers (h1-h6)
    result := regexp_replace(result, E'^###### (.+)$', E'<h6>\\1</h6>', 'gm');
    result := regexp_replace(result, E'^##### (.+)$', E'<h5>\\1</h5>', 'gm');
    result := regexp_replace(result, E'^#### (.+)$', E'<h4>\\1</h4>', 'gm');
    result := regexp_replace(result, E'^### (.+)$', E'<h3>\\1</h3>', 'gm');
    result := regexp_replace(result, E'^## (.+)$', E'<h2>\\1</h2>', 'gm');
    result := regexp_replace(result, E'^# (.+)$', E'<h1>\\1</h1>', 'gm');

    -- Bold and italic
    result := regexp_replace(result, E'\\*\\*\\*(.+?)\\*\\*\\*', E'<strong><em>\\1</em></strong>', 'g');
    result := regexp_replace(result, E'\\*\\*(.+?)\\*\\*', E'<strong>\\1</strong>', 'g');
    result := regexp_replace(result, E'\\*(.+?)\\*', E'<em>\\1</em>', 'g');
    result := regexp_replace(result, E'___(.+?)___', E'<strong><em>\\1</em></strong>', 'g');
    result := regexp_replace(result, E'__(.+?)__', E'<strong>\\1</strong>', 'g');
    result := regexp_replace(result, E'_(.+?)_', E'<em>\\1</em>', 'g');

    -- Code blocks (triple backticks)
    result := regexp_replace(result, E'```([a-z]*)\\n([\\s\\S]*?)```', E'<pre><code class="language-\\1">\\2</code></pre>', 'g');

    -- Inline code
    result := regexp_replace(result, E'`([^`]+)`', E'<code>\\1</code>', 'g');

    -- Links [text](url)
    result := regexp_replace(result, E'\\[([^\\]]+)\\]\\(([^\\)]+)\\)', E'<a href="\\2" target="_blank" rel="noopener">\\1</a>', 'g');

    -- Images ![alt](url)
    result := regexp_replace(result, E'!\\[([^\\]]*?)\\]\\(([^\\)]+)\\)', E'<img src="\\2" alt="\\1" loading="lazy" />', 'g');

    -- Blockquotes
    result := regexp_replace(result, E'^&gt; (.+)$', E'<blockquote>\\1</blockquote>', 'gm');

    -- Horizontal rules
    result := regexp_replace(result, E'^---+$', E'<hr />', 'gm');
    result := regexp_replace(result, E'^\\*\\*\\*+$', E'<hr />', 'gm');

    -- Unordered lists (basic)
    result := regexp_replace(result, E'^- (.+)$', E'<li>\\1</li>', 'gm');
    result := regexp_replace(result, E'^\\* (.+)$', E'<li>\\1</li>', 'gm');

    -- Ordered lists (basic)
    result := regexp_replace(result, E'^\\d+\\. (.+)$', E'<li>\\1</li>', 'gm');

    -- Wrap consecutive <li> in <ul> or <ol>
    result := regexp_replace(result, E'((?:<li>[^<]+</li>\\n?)+)', E'<ul>\\1</ul>', 'g');

    -- Paragraphs (double newlines)
    result := regexp_replace(result, E'\\n\\n+', E'</p><p>', 'g');
    result := '<p>' || result || '</p>';

    -- Clean up empty paragraphs
    result := regexp_replace(result, E'<p>\\s*</p>', '', 'g');
    result := regexp_replace(result, E'<p>(<h[1-6]>)', E'\\1', 'g');
    result := regexp_replace(result, E'(</h[1-6]>)</p>', E'\\1', 'g');
    result := regexp_replace(result, E'<p>(<ul>)', E'\\1', 'g');
    result := regexp_replace(result, E'(</ul>)</p>', E'\\1', 'g');
    result := regexp_replace(result, E'<p>(<pre>)', E'\\1', 'g');
    result := regexp_replace(result, E'(</pre>)</p>', E'\\1', 'g');
    result := regexp_replace(result, E'<p>(<blockquote>)', E'\\1', 'g');
    result := regexp_replace(result, E'(</blockquote>)</p>', E'\\1', 'g');
    result := regexp_replace(result, E'<p>(<hr />)', E'\\1', 'g');
    result := regexp_replace(result, E'(<hr />)</p>', E'\\1', 'g');

    RETURN result;
END;
$$;

-- Funcao principal que gera o HTML completo
CREATE OR REPLACE FUNCTION generate_blog_html(post blog_posts)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    html TEXT;
    content_html TEXT;
    schema_json_str TEXT;
    published_date TEXT;
    modified_date TEXT;
    keywords_meta TEXT;
    reading_time INT;
BEGIN
    -- Converte content markdown para HTML
    content_html := markdown_to_html(post.content);

    -- Data formatada
    published_date := COALESCE(TO_CHAR(post.published_at, 'YYYY-MM-DD'), TO_CHAR(post.created_at, 'YYYY-MM-DD'));
    modified_date := TO_CHAR(post.updated_at, 'YYYY-MM-DD');

    -- Keywords
    keywords_meta := COALESCE(post.focus_keyword, '');
    IF post.secondary_keywords IS NOT NULL AND array_length(post.secondary_keywords, 1) > 0 THEN
        keywords_meta := keywords_meta || ', ' || array_to_string(post.secondary_keywords, ', ');
    END IF;

    -- Reading time
    reading_time := COALESCE(post.reading_time_minutes, CEIL(COALESCE(post.word_count, 1000) / 200.0)::INT);

    -- Schema.org JSON-LD
    schema_json_str := format(
        '{
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": %s,
            "description": %s,
            "image": %s,
            "author": {
                "@type": "Person",
                "name": %s,
                "url": "https://liftlio.com"
            },
            "publisher": {
                "@type": "Organization",
                "name": "Liftlio",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://liftlio.com/logo.png"
                }
            },
            "datePublished": %s,
            "dateModified": %s,
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": %s
            },
            "wordCount": %s,
            "timeRequired": "PT%sM"
        }',
        to_json(COALESCE(post.meta_title, post.title))::TEXT,
        to_json(COALESCE(post.meta_description, post.excerpt, ''))::TEXT,
        to_json(COALESCE(post.og_image_url, post.cover_image_url, ''))::TEXT,
        to_json(COALESCE(post.author_name, 'Liftlio Team'))::TEXT,
        to_json(published_date)::TEXT,
        to_json(modified_date)::TEXT,
        to_json('https://liftlio.com/blog/' || post.slug)::TEXT,
        COALESCE(post.word_count, 1000),
        reading_time
    );

    -- Monta o HTML completo
    html := format(
        '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Primary Meta Tags -->
    <title>%s</title>
    <meta name="title" content="%s">
    <meta name="description" content="%s">
    <meta name="keywords" content="%s">
    <meta name="author" content="%s">
    <meta name="robots" content="%s">

    <!-- Canonical -->
    <link rel="canonical" href="%s">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="%s">
    <meta property="og:title" content="%s">
    <meta property="og:description" content="%s">
    <meta property="og:image" content="%s">
    <meta property="og:site_name" content="Liftlio Blog">
    <meta property="article:published_time" content="%s">
    <meta property="article:modified_time" content="%s">
    <meta property="article:author" content="%s">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="%s">
    <meta name="twitter:title" content="%s">
    <meta name="twitter:description" content="%s">
    <meta name="twitter:image" content="%s">

    <!-- Schema.org JSON-LD -->
    <script type="application/ld+json">%s</script>

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="https://liftlio.com/favicon.ico">

    <!-- Preconnect -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <style>
        :root {
            --primary: #8b5cf6;
            --primary-dark: #7c3aed;
            --bg: #0f0a1a;
            --bg-card: #1a1425;
            --text: #e2e8f0;
            --text-muted: #94a3b8;
            --border: #2d2640;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.7;
            font-size: 18px;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 40px;
            border-bottom: 1px solid var(--border);
        }

        .meta {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            color: var(--text-muted);
            font-size: 14px;
            margin-bottom: 24px;
        }

        .meta span { display: flex; align-items: center; gap: 6px; }

        h1 {
            font-size: 2.5rem;
            font-weight: 700;
            line-height: 1.2;
            margin-bottom: 16px;
            background: linear-gradient(135deg, #fff, var(--primary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .subtitle {
            font-size: 1.25rem;
            color: var(--text-muted);
            margin-bottom: 24px;
        }

        .cover-image {
            width: 100%%;
            max-height: 400px;
            object-fit: cover;
            border-radius: 12px;
            margin-bottom: 32px;
        }

        article h2 {
            font-size: 1.75rem;
            margin: 48px 0 16px;
            color: #fff;
        }

        article h3 {
            font-size: 1.35rem;
            margin: 32px 0 12px;
            color: var(--primary);
        }

        article p {
            margin-bottom: 20px;
            color: var(--text);
        }

        article a {
            color: var(--primary);
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-color 0.2s;
        }

        article a:hover { border-color: var(--primary); }

        article ul, article ol {
            margin: 20px 0;
            padding-left: 24px;
        }

        article li { margin-bottom: 8px; }

        article blockquote {
            border-left: 4px solid var(--primary);
            padding: 16px 24px;
            margin: 24px 0;
            background: var(--bg-card);
            border-radius: 0 8px 8px 0;
            font-style: italic;
            color: var(--text-muted);
        }

        article code {
            background: var(--bg-card);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: "Fira Code", monospace;
            font-size: 0.9em;
            color: var(--primary);
        }

        article pre {
            background: var(--bg-card);
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 24px 0;
            border: 1px solid var(--border);
        }

        article pre code {
            background: none;
            padding: 0;
            color: var(--text);
        }

        article img {
            max-width: 100%%;
            height: auto;
            border-radius: 8px;
            margin: 24px 0;
        }

        article hr {
            border: none;
            border-top: 1px solid var(--border);
            margin: 40px 0;
        }

        .author-box {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 24px;
            background: var(--bg-card);
            border-radius: 12px;
            margin-top: 48px;
            border: 1px solid var(--border);
        }

        .author-avatar {
            width: 64px;
            height: 64px;
            border-radius: 50%%;
            object-fit: cover;
        }

        .author-info h4 {
            color: #fff;
            margin-bottom: 4px;
        }

        .author-info p {
            color: var(--text-muted);
            font-size: 14px;
            margin: 0;
        }

        .cta-box {
            text-align: center;
            padding: 40px;
            background: linear-gradient(135deg, var(--bg-card), #1f1730);
            border-radius: 16px;
            margin-top: 48px;
            border: 1px solid var(--border);
        }

        .cta-box h3 {
            color: #fff;
            margin-bottom: 12px;
        }

        .cta-box p {
            color: var(--text-muted);
            margin-bottom: 24px;
        }

        .cta-button {
            display: inline-block;
            background: var(--primary);
            color: #fff;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.2s;
        }

        .cta-button:hover {
            background: var(--primary-dark);
            transform: translateY(-2px);
        }

        footer {
            text-align: center;
            padding: 40px 20px;
            margin-top: 60px;
            border-top: 1px solid var(--border);
            color: var(--text-muted);
            font-size: 14px;
        }

        footer a { color: var(--primary); text-decoration: none; }

        @media (max-width: 640px) {
            h1 { font-size: 1.75rem; }
            .subtitle { font-size: 1rem; }
            body { font-size: 16px; }
            .container { padding: 24px 16px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="meta">
                <span>%s</span>
                <span>·</span>
                <span>%s min read</span>
                <span>·</span>
                <span>%s</span>
            </div>
            <h1>%s</h1>
            %s
            %s
        </header>

        <article>
            %s
        </article>

        <div class="author-box">
            %s
            <div class="author-info">
                <h4>%s</h4>
                <p>%s</p>
            </div>
        </div>

        <div class="cta-box">
            <h3>Monitor Your Brand on YouTube</h3>
            <p>Get notified when anyone mentions your brand, competitors, or keywords in YouTube videos and comments.</p>
            <a href="https://liftlio.com/signup" class="cta-button">Start Free Trial</a>
        </div>
    </div>

    <footer>
        <p>&copy; 2024-2026 <a href="https://liftlio.com">Liftlio</a>. All rights reserved.</p>
        <p style="margin-top: 8px;"><a href="https://liftlio.com/blog">Back to Blog</a></p>
    </footer>
</body>
</html>',
        -- Head meta tags
        COALESCE(post.meta_title, post.title),
        COALESCE(post.meta_title, post.title),
        COALESCE(post.meta_description, post.excerpt, ''),
        keywords_meta,
        COALESCE(post.author_name, 'Liftlio Team'),
        CASE WHEN post.no_index THEN 'noindex, nofollow' ELSE 'index, follow' END,
        COALESCE(post.canonical_url, 'https://liftlio.com/blog/' || post.slug),
        -- Open Graph
        'https://liftlio.com/blog/' || post.slug,
        COALESCE(post.meta_title, post.title),
        COALESCE(post.meta_description, post.excerpt, ''),
        COALESCE(post.og_image_url, post.cover_image_url, 'https://liftlio.com/og-default.png'),
        published_date,
        modified_date,
        COALESCE(post.author_name, 'Liftlio Team'),
        -- Twitter
        'https://liftlio.com/blog/' || post.slug,
        COALESCE(post.meta_title, post.title),
        COALESCE(post.meta_description, post.excerpt, ''),
        COALESCE(post.og_image_url, post.cover_image_url, 'https://liftlio.com/og-default.png'),
        -- Schema.org
        schema_json_str,
        -- Header content
        COALESCE(post.author_name, 'Liftlio Team'),
        reading_time,
        published_date,
        post.title,
        CASE WHEN post.subtitle IS NOT NULL AND post.subtitle != ''
             THEN '<p class="subtitle">' || post.subtitle || '</p>'
             ELSE '' END,
        CASE WHEN post.cover_image_url IS NOT NULL AND post.cover_image_url != ''
             THEN '<img src="' || post.cover_image_url || '" alt="' || COALESCE(post.cover_image_alt, post.title) || '" class="cover-image" />'
             ELSE '' END,
        -- Article content
        content_html,
        -- Author box
        CASE WHEN post.author_avatar_url IS NOT NULL AND post.author_avatar_url != ''
             THEN '<img src="' || post.author_avatar_url || '" alt="' || COALESCE(post.author_name, 'Author') || '" class="author-avatar" />'
             ELSE '<div style="width:64px;height:64px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;color:#fff;">' || LEFT(COALESCE(post.author_name, 'L'), 1) || '</div>' END,
        COALESCE(post.author_name, 'Liftlio Team'),
        COALESCE(post.author_bio, 'Content writer at Liftlio, helping brands grow their YouTube presence.')
    );

    RETURN html;
END;
$$;

COMMENT ON FUNCTION generate_blog_html(blog_posts) IS 'Generates complete SEO-optimized HTML for a blog post. Used by trigger to populate html_rendered column.';
COMMENT ON FUNCTION markdown_to_html(TEXT) IS 'Converts basic Markdown to HTML. Supports headers, bold, italic, links, images, code blocks, lists, and blockquotes.';
