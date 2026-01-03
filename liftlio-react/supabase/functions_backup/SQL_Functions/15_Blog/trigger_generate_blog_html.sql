-- =============================================
-- Trigger: trigger_generate_blog_html
-- Descricao: Auto-gera HTML quando post e criado/atualizado
-- Criado: 2026-01-03
-- Custo: GRATIS (roda automaticamente no INSERT/UPDATE)
-- =============================================

-- Funcao do trigger
CREATE OR REPLACE FUNCTION trigger_generate_blog_html_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Gera HTML apenas se o post esta publicado ou sendo publicado
    IF NEW.status = 'published' OR TG_OP = 'UPDATE' THEN
        NEW.html_rendered := generate_blog_html(NEW);
    END IF;

    RETURN NEW;
END;
$$;

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS trg_generate_blog_html ON blog_posts;

-- Cria o trigger
CREATE TRIGGER trg_generate_blog_html
    BEFORE INSERT OR UPDATE OF title, subtitle, content, excerpt,
                              meta_title, meta_description, focus_keyword, secondary_keywords,
                              cover_image_url, cover_image_alt, og_image_url,
                              author_name, author_bio, author_avatar_url,
                              status, published_at, canonical_url, no_index
    ON blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_blog_html_fn();

COMMENT ON TRIGGER trg_generate_blog_html ON blog_posts IS 'Automatically generates SEO HTML when blog post is created or key fields are updated';
COMMENT ON FUNCTION trigger_generate_blog_html_fn() IS 'Trigger function that calls generate_blog_html() to populate html_rendered column';
