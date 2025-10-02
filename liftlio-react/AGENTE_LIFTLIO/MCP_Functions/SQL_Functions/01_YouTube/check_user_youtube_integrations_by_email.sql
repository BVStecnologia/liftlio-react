-- =============================================
-- Função: check_user_youtube_integrations_by_email
-- Descrição: Verifica integrações YouTube do usuário por email
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.check_user_youtube_integrations_by_email(text);

CREATE OR REPLACE FUNCTION public.check_user_youtube_integrations_by_email(p_user_email text)
 RETURNS TABLE(integration_id bigint, project_id bigint, project_name text, youtube_email text, youtube_channel_id text, youtube_channel_name text, is_active boolean, created_at timestamp without time zone, desativacao_motivo text, desativacao_timestamp timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
        i."Ultima atualização" as created_at,
        i.desativacao_motivo::TEXT,
        i.desativacao_timestamp
    FROM "Integrações" i
    INNER JOIN "Projeto" p ON i."PROJETO id" = p.id
    WHERE
        p.user = p_user_email
        AND i."Tipo de integração" = 'youtube'
        AND i."Token" IS NOT NULL
    ORDER BY
        -- Mostrar primeiro as ativas, depois as suspensas
        i.ativo DESC,
        i."Ultima atualização" DESC;
END;
$function$;