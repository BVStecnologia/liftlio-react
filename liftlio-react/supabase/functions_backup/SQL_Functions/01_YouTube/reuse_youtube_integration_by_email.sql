-- =============================================
-- Função: reuse_youtube_integration_by_email
-- Descrição: Reutiliza integração YouTube por email
-- Criado: 2025-01-23
-- =============================================

CREATE OR REPLACE FUNCTION public.reuse_youtube_integration_by_email(p_user_email text, p_new_project_id bigint, p_source_integration_id bigint)
 RETURNS TABLE(success boolean, message text, new_integration_id bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_source_integration RECORD;
    v_new_integration_id BIGINT;
BEGIN
    -- Verificar se a integração fonte existe e pertence ao usuário
    SELECT i.*, p."user" as project_owner
    INTO v_source_integration
    FROM "Integrações" i
    INNER JOIN "Projeto" p ON i."PROJETO id" = p.id
    WHERE
        i.id = p_source_integration_id
        AND p."user" = p_user_email
        AND i."Tipo de integração" = 'youtube'
        AND i.ativo = true;

    IF NOT FOUND THEN
        RETURN QUERY SELECT
            false::boolean,
            'Source integration not found or does not belong to user'::text,
            NULL::bigint;
        RETURN;
    END IF;

    -- Verificar se o projeto destino pertence ao usuário
    IF NOT EXISTS (
        SELECT 1 FROM "Projeto"
        WHERE id = p_new_project_id
        AND "user" = p_user_email
    ) THEN
        RETURN QUERY SELECT
            false::boolean,
            'Target project not found or does not belong to user'::text,
            NULL::bigint;
        RETURN;
    END IF;

    -- Verificar se o projeto destino já tem integração YouTube
    IF EXISTS (
        SELECT 1 FROM "Integrações"
        WHERE "PROJETO id" = p_new_project_id
        AND "Tipo de integração" = 'youtube'
        AND ativo = true
    ) THEN
        RETURN QUERY SELECT
            false::boolean,
            'Target project already has an active YouTube integration'::text,
            NULL::bigint;
        RETURN;
    END IF;

    -- Copiar a integração
    INSERT INTO "Integrações" (
        "PROJETO id",
        "Tipo de integração",
        "Token",
        "Refresh token",
        "expira em",
        ativo,
        youtube_email,
        youtube_channel_id,
        youtube_channel_name,
        "Ultima atualização"
    )
    VALUES (
        p_new_project_id,
        'youtube',
        v_source_integration."Token",
        v_source_integration."Refresh token",
        v_source_integration."expira em",
        true,
        v_source_integration.youtube_email,
        v_source_integration.youtube_channel_id,
        v_source_integration.youtube_channel_name,
        NOW()
    )
    RETURNING id INTO v_new_integration_id;

    -- CORRIGIDO: Removido campo inexistente "Ultima atualização"
    UPDATE "Projeto"
    SET 
        status = '0',  -- ESSENCIAL: Inicia o processamento
        integracao_valida = true,
        "Youtube Active" = true
    WHERE id = p_new_project_id;

    RETURN QUERY SELECT
        true::boolean,
        'YouTube integration successfully reused and project activated'::text,
        v_new_integration_id;
END;
$function$
