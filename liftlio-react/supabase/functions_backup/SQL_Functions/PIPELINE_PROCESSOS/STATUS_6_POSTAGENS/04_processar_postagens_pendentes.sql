-- =============================================
-- Função: processar_postagens_pendentes
-- Tipo: Processor (executa postagens agendadas)
--
-- Descrição:
--   Processa postagens pendentes que chegaram na hora agendada.
--   AGORA USA BROWSER AGENT em vez de API do YouTube.
--
-- Entrada:
--   projeto_id_param BIGINT - ID do projeto (opcional, NULL = todos)
--
-- Saída:
--   TABLE (total_processados, sucessos, falhas, status_mensagem)
--
-- Conexões:
--   → Chamada por: cron_processar_todas_postagens_pendentes
--   → Chama: browser_reply_to_comment (Browser Agent)
--
-- IMPORTANTE:
--   - Fire-and-forget: marca como 'processing', não espera resposta
--   - Edge Function browser-reply-executor atualiza para 'posted' quando completa
--   - "sucessos" = tasks criadas com sucesso (não significa postado ainda)
--
-- Criado: Data desconhecida
-- Atualizado: 2025-10-21 - Adicionado decremento de Mentions
-- Atualizado: 2025-01-14 - FIX CRÍTICO: Decrementar Mentions apenas para tipo produto
-- Atualizado: 2025-12-27 - MIGRAÇÃO PARA BROWSER AGENT (não usa mais API YouTube)
-- =============================================

-- Remover versões anteriores
DROP FUNCTION IF EXISTS public.processar_postagens_pendentes(INT);
DROP FUNCTION IF EXISTS public.processar_postagens_pendentes();
DROP FUNCTION IF EXISTS public.processar_postagens_pendentes(BIGINT);

CREATE OR REPLACE FUNCTION public.processar_postagens_pendentes(projeto_id_param bigint DEFAULT NULL::bigint)
RETURNS TABLE(total_processados integer, sucessos integer, falhas integer, status_mensagem text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_total_processados integer := 0;
    v_sucessos integer := 0;  -- Tasks enviadas para Browser Agent
    v_falhas integer := 0;
    v_status_mensagem text := '';
    v_registro RECORD;
    v_projeto_ativo boolean;
    v_has_browser boolean;
    v_fuso_horario_projeto text;
    v_resposta jsonb;
    v_video_youtube_id text;
    v_limite_processamento integer := 10;  -- Menor que antes (browser é mais lento)
    v_contador integer := 0;
    v_current_time_local timestamp;
BEGIN
    -- Verificar projetos a processar (um específico ou todos)
    FOR v_registro IN (
        SELECT
            smp.id as settings_post_id,
            smp."Projeto" as projeto_id,
            smp."Mensagens" as mensagem_id,
            smp."Comentarios_Principal" as comentario_id,
            m.mensagem as texto_mensagem,
            m.tipo_resposta,
            m.video as video_id,  -- ID interno do vídeo
            cp.id_do_comentario as parent_comment_id,
            p.fuso_horario
        FROM "Settings messages posts" smp
        JOIN "Mensagens" m ON smp."Mensagens" = m.id
        JOIN "Comentarios_Principais" cp ON smp."Comentarios_Principal" = cp.id
        JOIN "Projeto" p ON smp."Projeto" = p.id
        WHERE
            (projeto_id_param IS NULL OR smp."Projeto" = projeto_id_param)
            AND smp.proxima_postagem <= CURRENT_TIMESTAMP
            AND smp.status = 'pending'
        ORDER BY smp.proxima_postagem
        LIMIT v_limite_processamento
    ) LOOP
        v_fuso_horario_projeto := COALESCE(v_registro.fuso_horario, 'UTC');
        v_current_time_local := CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE v_fuso_horario_projeto;

        -- Verificar se o projeto está ativo E tem browser configurado
        SELECT
            "Youtube Active" AND integracao_valida,
            browser_mcp_url IS NOT NULL
        INTO v_projeto_ativo, v_has_browser
        FROM "Projeto"
        WHERE id = v_registro.projeto_id;

        -- Log
        RAISE NOTICE '[Browser Agent] Processando postagem ID=% do projeto ID=%',
                   v_registro.settings_post_id, v_registro.projeto_id;

        -- Se o projeto não estiver ativo, marcar como falha
        IF NOT v_projeto_ativo THEN
            UPDATE "Settings messages posts"
            SET status = 'failed',
                postado = CURRENT_TIMESTAMP
            WHERE id = v_registro.settings_post_id;

            v_falhas := v_falhas + 1;
            v_total_processados := v_total_processados + 1;
            RAISE NOTICE 'Projeto % inativo ou sem integração válida', v_registro.projeto_id;
            CONTINUE;
        END IF;

        -- Se não tem browser configurado, marcar como falha
        IF NOT v_has_browser THEN
            UPDATE "Settings messages posts"
            SET status = 'failed',
                postado = CURRENT_TIMESTAMP
            WHERE id = v_registro.settings_post_id;

            v_falhas := v_falhas + 1;
            v_total_processados := v_total_processados + 1;
            RAISE NOTICE 'Projeto % sem browser_mcp_url configurado', v_registro.projeto_id;
            CONTINUE;
        END IF;

        -- Buscar YouTube video ID
        SELECT v."VIDEO" INTO v_video_youtube_id
        FROM "Videos" v
        WHERE v.id = v_registro.video_id;

        IF v_video_youtube_id IS NULL THEN
            UPDATE "Settings messages posts"
            SET status = 'failed',
                postado = CURRENT_TIMESTAMP
            WHERE id = v_registro.settings_post_id;

            v_falhas := v_falhas + 1;
            v_total_processados := v_total_processados + 1;
            RAISE NOTICE 'Video ID não encontrado para mensagem %', v_registro.mensagem_id;
            CONTINUE;
        END IF;

        -- Marcar como 'processing' (Browser Agent vai executar)
        UPDATE "Settings messages posts"
        SET status = 'processing'
        WHERE id = v_registro.settings_post_id;

        -- Enviar para Browser Agent (fire-and-forget)
        BEGIN
            RAISE NOTICE '[Browser Agent] Enviando task: video=%, comment=%, texto=%',
                         v_video_youtube_id, v_registro.parent_comment_id,
                         LEFT(v_registro.texto_mensagem, 50);

            v_resposta := browser_reply_to_comment(
                p_project_id := v_registro.projeto_id,
                p_video_id := v_video_youtube_id,
                p_parent_comment_id := v_registro.parent_comment_id,
                p_reply_text := v_registro.texto_mensagem,
                p_mensagem_id := v_registro.mensagem_id,
                p_settings_post_id := v_registro.settings_post_id,
                p_tipo_resposta := COALESCE(v_registro.tipo_resposta, 'produto')
            );

            IF (v_resposta->>'success')::boolean THEN
                v_sucessos := v_sucessos + 1;
                RAISE NOTICE '[Browser Agent] Task criada: %', v_resposta->>'task_id';
            ELSE
                -- Falha ao criar task - reverter para pending
                UPDATE "Settings messages posts"
                SET status = 'pending'
                WHERE id = v_registro.settings_post_id;

                v_falhas := v_falhas + 1;
                RAISE NOTICE '[Browser Agent] Falha ao criar task: %', v_resposta->>'error';
            END IF;

        EXCEPTION WHEN OTHERS THEN
            -- Erro - reverter para pending
            UPDATE "Settings messages posts"
            SET status = 'pending'
            WHERE id = v_registro.settings_post_id;

            v_falhas := v_falhas + 1;
            RAISE NOTICE '[Browser Agent] Erro: %', SQLERRM;
        END;

        v_total_processados := v_total_processados + 1;
        v_contador := v_contador + 1;

        -- Delay entre tasks (browser é mais lento que API)
        PERFORM pg_sleep(0.3);

        EXIT WHEN v_contador >= v_limite_processamento;
    END LOOP;

    -- Preparar mensagem de status
    v_status_mensagem := format(
        'Browser Agent: %s tasks enviadas, %s falhas (total: %s)',
        v_sucessos, v_falhas, v_total_processados
    );

    RETURN QUERY SELECT v_total_processados, v_sucessos, v_falhas, v_status_mensagem;
END;
$function$;

COMMENT ON FUNCTION processar_postagens_pendentes IS
'Processa postagens via Browser Agent (fire-and-forget).
Marca como processing e Edge Function atualiza para posted quando completa.
Comportamento humanizado: assiste vídeo em 2x, curte comentário, responde.';
