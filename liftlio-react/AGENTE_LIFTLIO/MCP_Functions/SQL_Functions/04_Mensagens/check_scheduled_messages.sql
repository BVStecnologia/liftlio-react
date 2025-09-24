-- =============================================
-- Função: check_scheduled_messages
-- Descrição: Verifica e posta mensagens agendadas
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.check_scheduled_messages()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_projeto RECORD;
    v_mensagem RECORD;  -- Declarado corretamente como RECORD
    v_pending_count INTEGER;
    v_postou boolean := false;
BEGIN
    -- 1. Posta mensagens atrasadas
    FOR v_mensagem IN
        SELECT id, "Projeto"
        FROM "Settings messages posts"
        WHERE status = 'pending'
        AND proxima_postagem <= CURRENT_TIMESTAMP
        ORDER BY proxima_postagem ASC
    LOOP
        BEGIN
            PERFORM post_scheduled_messages(v_mensagem.id);
            v_postou := true;
            RAISE NOTICE 'Postando mensagem ID: % do projeto: %',
                v_mensagem.id, v_mensagem."Projeto";
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao postar mensagem ID: % - %',
                v_mensagem.id, SQLERRM;
            CONTINUE;
        END;
    END LOOP;

    -- Importante: Aguardar após postagens
    IF v_postou THEN
        RAISE NOTICE 'Aguardando 20 segundos para garantir postagens...';
        PERFORM pg_sleep(20);
    END IF;

    -- 2. Verifica projetos que precisam de novas mensagens
    FOR v_projeto IN
        SELECT DISTINCT "Projeto"
        FROM "Settings messages posts"
        WHERE status = 'posted'
        ORDER BY "Projeto"
    LOOP
        SELECT COUNT(*)
        INTO v_pending_count
        FROM "Settings messages posts"
        WHERE "Projeto" = v_projeto."Projeto"
        AND status != 'posted';

        IF v_pending_count = 0 THEN
            RAISE NOTICE 'Criando novas mensagens para projeto: %', v_projeto."Projeto";
            PERFORM monitor_and_schedule_messages(v_projeto."Projeto");
        END IF;
    END LOOP;
END;
$function$