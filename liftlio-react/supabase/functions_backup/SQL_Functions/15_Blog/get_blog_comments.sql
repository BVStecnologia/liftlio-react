-- =============================================
-- Função: get_blog_comments
-- Descrição: Retorna comentários com dados do usuário
-- Criado: 2026-01-02
--
-- Por que existe:
--   auth.users não é acessível via cliente (RLS)
--   Esta função usa SECURITY DEFINER para fazer o join
--
-- Uso:
--   SELECT * FROM get_blog_comments(123);
-- =============================================

CREATE OR REPLACE FUNCTION get_blog_comments(p_post_id BIGINT)
RETURNS TABLE (
  id BIGINT,
  post_id BIGINT,
  user_id UUID,
  parent_id BIGINT,
  content TEXT,
  likes_count INTEGER,
  is_pinned BOOLEAN,
  is_author_reply BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_email TEXT,
  user_full_name TEXT,
  user_avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.post_id,
    c.user_id,
    c.parent_id,
    c.content,
    c.likes_count,
    c.is_pinned,
    c.is_author_reply,
    c.created_at,
    c.updated_at,
    u.email::TEXT as user_email,
    (u.raw_user_meta_data->>'full_name')::TEXT as user_full_name,
    (u.raw_user_meta_data->>'avatar_url')::TEXT as user_avatar_url
  FROM blog_comments c
  LEFT JOIN auth.users u ON c.user_id = u.id
  WHERE c.post_id = p_post_id
  AND c.parent_id IS NULL
  ORDER BY c.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_blog_comments(BIGINT) TO anon;
GRANT EXECUTE ON FUNCTION get_blog_comments(BIGINT) TO authenticated;
