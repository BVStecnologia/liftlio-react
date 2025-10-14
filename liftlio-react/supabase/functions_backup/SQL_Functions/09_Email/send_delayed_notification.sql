-- =============================================
-- Função: send_delayed_notification
-- Descrição: Envia notificação com delay para projetos com status 5
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.send_delayed_notification(project_id bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_email text;
BEGIN
    -- Busca o email do campo "user"
    SELECT "user" INTO v_user_email
    FROM "Projeto"
    WHERE id = project_id;

    RAISE NOTICE 'Email do usuário encontrado: %', v_user_email;
    RAISE NOTICE 'Aguardando 6 segundos...';

    -- Espera 6 segundos
    PERFORM pg_sleep(6);

    -- Verifica status e notify novamente após espera
    IF EXISTS (
        SELECT 1
        FROM "Projeto"
        WHERE id = project_id
        AND status = '5'
        AND ("notify enviado" IS NULL OR "notify enviado" = '')
    ) THEN
        -- Envia notificação com o email do campo "user"
        PERFORM notify_update(v_user_email);

        -- Marca como enviado
        UPDATE "Projeto"
        SET "notify enviado" = '1'
        WHERE id = project_id;

        RAISE NOTICE 'Notificação enviada para: %', v_user_email;
    END IF;
END;
$function$