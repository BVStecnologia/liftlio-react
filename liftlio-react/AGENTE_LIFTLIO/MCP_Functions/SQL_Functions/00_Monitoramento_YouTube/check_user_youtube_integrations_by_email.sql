-- =============================================
-- Função: check_user_youtube_integrations_by_email
-- Descrição: Busca todas as integrações YouTube ativas de um usuário usando email
-- Criado: 2025-01-18T18:00:00.000Z
-- Atualizado: Para usar email ao invés de UUID devido à estrutura da tabela Projeto
-- =============================================

CREATE OR REPLACE FUNCTION check_user_youtube_integrations_by_email(p_user_email TEXT)
RETURNS TABLE (
    integration_id BIGINT,
    project_id BIGINT,
    project_name TEXT,
    youtube_email TEXT,
    youtube_channel_id TEXT,
    youtube_channel_name TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id as integration_id,
        i."PROJETO id" as project_id,
        p."Project name"::TEXT as project_name,
        i.youtube_email::TEXT,
        i.youtube_channel_id::TEXT,
        i.youtube_channel_name::TEXT,
        i.ativo as is_active,
        i."Ultima atualização" as created_at
    FROM "Integrações" i
    INNER JOIN "Projeto" p ON i."PROJETO id" = p.id
    WHERE
        p.user = p_user_email
        AND i."Tipo de integração" = 'youtube'
        AND i.ativo = true
        AND i."Token" IS NOT NULL
    ORDER BY i."Ultima atualização" DESC;
END;
$$;

COMMENT ON FUNCTION check_user_youtube_integrations_by_email(TEXT) IS
'Retorna todas as integrações YouTube ativas de um usuário baseado no email para possível reutilização';