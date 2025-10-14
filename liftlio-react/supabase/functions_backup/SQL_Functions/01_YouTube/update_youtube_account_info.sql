-- =============================================
-- Função: update_youtube_account_info
-- Descrição: Atualiza informações da conta YouTube
-- Criado: 2025-01-23
-- =============================================

CREATE OR REPLACE FUNCTION public.update_youtube_account_info(p_integration_id bigint, p_youtube_email text, p_youtube_channel_id text, p_youtube_channel_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id TEXT;
BEGIN
    -- Obter ID do usuário autenticado
    v_user_id := auth.uid()::text;

    -- Verificar se a integração pertence ao usuário
    IF NOT EXISTS (
        SELECT 1
        FROM "Integrações" i
        INNER JOIN "Projeto" p ON i."PROJETO id" = p.id
        WHERE
            i.id = p_integration_id
            AND p.user = v_user_id
    ) THEN
        RAISE EXCEPTION 'Integração não encontrada ou não pertence ao usuário';
    END IF;

    -- Atualizar informações da conta
    UPDATE "Integrações"
    SET
        youtube_email = p_youtube_email,
        youtube_channel_id = p_youtube_channel_id,
        youtube_channel_name = p_youtube_channel_name,
        "Ultima atualização" = NOW()
    WHERE id = p_integration_id;

    RETURN true;
END;
$function$
