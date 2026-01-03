-- =============================================
-- Função: get_blog_sitemap_xml
-- Descrição: Gera sitemap XML dinâmico do blog
-- Criado: 2025-12-28
--
-- IMPORTANTE: Esta função é GRATUITA (SQL)
-- NÃO usar Edge Function para isso!
--
-- Como usar:
--   SELECT get_blog_sitemap_xml();
--
-- Como expor via HTTP:
--   Via PostgREST: GET /rpc/get_blog_sitemap_xml
--   URL: https://suqjifkhmekcdflwowiw.supabase.co/rest/v1/rpc/get_blog_sitemap_xml
--   Header: apikey: <anon_key>
-- =============================================

CREATE OR REPLACE FUNCTION get_blog_sitemap_xml()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    sitemap_xml TEXT;
    post_record RECORD;
BEGIN
    -- Header do XML
    sitemap_xml := '<?xml version="1.0" encoding="UTF-8"?>' || chr(10);
    sitemap_xml := sitemap_xml || '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' || chr(10);

    -- Página principal do blog
    sitemap_xml := sitemap_xml || '  <url>' || chr(10);
    sitemap_xml := sitemap_xml || '    <loc>https://liftlio.com/blog</loc>' || chr(10);
    sitemap_xml := sitemap_xml || '    <lastmod>' || TO_CHAR(NOW(), 'YYYY-MM-DD') || '</lastmod>' || chr(10);
    sitemap_xml := sitemap_xml || '    <changefreq>daily</changefreq>' || chr(10);
    sitemap_xml := sitemap_xml || '    <priority>0.9</priority>' || chr(10);
    sitemap_xml := sitemap_xml || '  </url>' || chr(10);

    -- Loop por todos os posts publicados
    FOR post_record IN
        SELECT
            slug,
            COALESCE(published_at, created_at) as last_modified,
            featured
        FROM blog_posts
        WHERE status = 'published'
        ORDER BY published_at DESC NULLS LAST
    LOOP
        sitemap_xml := sitemap_xml || '  <url>' || chr(10);
        sitemap_xml := sitemap_xml || '    <loc>https://liftlio.com/blog/' || post_record.slug || '</loc>' || chr(10);
        sitemap_xml := sitemap_xml || '    <lastmod>' || TO_CHAR(post_record.last_modified, 'YYYY-MM-DD') || '</lastmod>' || chr(10);
        sitemap_xml := sitemap_xml || '    <changefreq>weekly</changefreq>' || chr(10);

        -- Posts featured têm prioridade maior
        IF post_record.featured THEN
            sitemap_xml := sitemap_xml || '    <priority>0.9</priority>' || chr(10);
        ELSE
            sitemap_xml := sitemap_xml || '    <priority>0.8</priority>' || chr(10);
        END IF;

        sitemap_xml := sitemap_xml || '  </url>' || chr(10);
    END LOOP;

    -- Páginas de categorias
    FOR post_record IN
        SELECT slug, name FROM blog_categories WHERE post_count > 0
    LOOP
        sitemap_xml := sitemap_xml || '  <url>' || chr(10);
        sitemap_xml := sitemap_xml || '    <loc>https://liftlio.com/blog?category=' || post_record.slug || '</loc>' || chr(10);
        sitemap_xml := sitemap_xml || '    <changefreq>weekly</changefreq>' || chr(10);
        sitemap_xml := sitemap_xml || '    <priority>0.7</priority>' || chr(10);
        sitemap_xml := sitemap_xml || '  </url>' || chr(10);
    END LOOP;

    -- Footer do XML
    sitemap_xml := sitemap_xml || '</urlset>';

    RETURN sitemap_xml;
END;
$$;

-- Permissão para acesso público (via anon key)
GRANT EXECUTE ON FUNCTION get_blog_sitemap_xml() TO anon;
GRANT EXECUTE ON FUNCTION get_blog_sitemap_xml() TO authenticated;
