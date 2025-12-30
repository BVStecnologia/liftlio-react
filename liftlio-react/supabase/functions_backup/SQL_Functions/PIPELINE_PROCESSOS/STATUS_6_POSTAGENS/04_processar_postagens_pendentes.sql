-- =============================================
-- Função: processar_postagens_pendentes
-- Tipo: Processor (executa postagens agendadas)
-- Versão: 3.1 - HARD LIMIT diário usando UTC
-- Atualizado: 2025-12-30
--
-- Descrição:
--   Processa postagens pendentes que chegaram na hora agendada.
--   USA BROWSER AGENT em vez de API do YouTube.
--   LIMITA A 1 TAREFA POR VEZ para evitar conflitos.
--   ⚠️ HARD LIMIT: Para de processar quando limite diário é atingido!
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
--   - Browser Agent atualiza status quando termina via callback
--   - Limita a 1 tarefa por vez para evitar conflitos
--   - HARD LIMIT: Verifica Postagem_dia antes de processar (UTC)!
-- =============================================

DROP FUNCTION IF EXISTS processar_postagens_pendentes(bigint);

CREATE OR REPLACE FUNCTION processar_postagens_pendentes(projeto_id_param bigint DEFAULT NULL)
RETURNS TABLE(total_processados integer, sucessos integer, falhas integer, status_mensagem text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_total_processados integer := 0;
    v_sucessos integer := 0;
    v_falhas integer := 0;
    v_status_mensagem text := '';
    v_registro RECORD;
    v_projeto_ativo boolean;
    v_has_browser boolean;
    v_fuso_horario_projeto text;
    v_resposta jsonb;
    v_video_youtube_id text;
    v_limite_processamento integer := 1;
    v_contador integer := 0;
    v_current_time_local timestamp;
    v_running_tasks integer := 0;
    v_limite_diario integer;
    v_postados_hoje integer;
BEGIN
    -- =========================================
    -- HARD LIMIT: Verificar limite diário ANTES de processar (usando UTC)
    -- =========================================
    IF projeto_id_param IS NOT NULL THEN
        SELECT COALESCE(p."Postagem_dia"::integer, 10)
        INTO v_limite_diario
        FROM "Projeto" p
        WHERE p.id = projeto_id_param;

        -- Contar posts postados hoje (UTC date)
        SELECT COUNT(*)
        INTO v_postados_hoje
        FROM "Settings messages posts" smp
        WHERE smp."Projeto" = projeto_id_param
          AND smp.status = 'posted'
          AND smp.postado::date = CURRENT_DATE;

        IF v_postados_hoje >= v_limite_diario THEN
            v_status_mensagem := format(
                'HARD LIMIT: Limite diario atingido! %s/%s posts ja realizados hoje (UTC). Processamento pausado.',
                v_postados_hoje, v_limite_diario
            );
            RAISE NOTICE '%', v_status_mensagem;
            RETURN QUERY SELECT 0, 0, 0, v_status_mensagem;
            RETURN;
        END IF;

        RAISE NOTICE '[Limite Diario] Projeto %: %/% posts hoje (UTC)',
                     projeto_id_param, v_postados_hoje, v_limite_diario;
    END IF;

    -- =========================================
    -- Verificar se já existe tarefa running no browser_tasks
    -- =========================================
    IF projeto_id_param IS NOT NULL THEN
        SELECT COUNT(*) INTO v_running_tasks
        FROM browser_tasks
        WHERE project_id = projeto_id_param
          AND status IN ('running', 'pending')
          AND created_at > NOW() - INTERVAL '30 minutes';

        IF v_running_tasks > 0 THEN
            v_status_mensagem := format('Browser Agent: Ja existe %s tarefa(s) em execucao, aguardando...', v_running_tasks);
            RETURN QUERY SELECT 0, 0, 0, v_status_mensagem;
            RETURN;
        END IF;
    END IF;

    FOR v_registro IN (
        SELECT
            smp.id as settings_post_id,
            smp."Projeto" as projeto_id,
            smp."Mensagens" as mensagem_id,
            smp."Comentarios_Principal" as comentario_id,
            m.mensagem as texto_mensagem,
            m.tipo_resposta,
            m.video as video_id,
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

        SELECT
            "Youtube Active" AND integracao_valida,
            browser_mcp_url IS NOT NULL
        INTO v_projeto_ativo, v_has_browser
        FROM "Projeto"
        WHERE id = v_registro.projeto_id;

        RAISE NOTICE '[Browser Agent] Processando postagem ID=% do projeto ID=%',
                   v_registro.settings_post_id, v_registro.projeto_id;

        IF NOT v_projeto_ativo THEN
            UPDATE "Settings messages posts"
            SET status = 'failed',
                postado = CURRENT_TIMESTAMP
            WHERE id = v_registro.settings_post_id;

            v_falhas := v_falhas + 1;
            v_total_processados := v_total_processados + 1;
            RAISE NOTICE 'Projeto % inativo ou sem integracao valida', v_registro.projeto_id;
            CONTINUE;
        END IF;

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
            RAISE NOTICE 'Video ID nao encontrado para mensagem %', v_registro.mensagem_id;
            CONTINUE;
        END IF;

        UPDATE "Settings messages posts"
        SET status = 'processing'
        WHERE id = v_registro.settings_post_id;

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
                UPDATE "Settings messages posts"
                SET status = 'pending'
                WHERE id = v_registro.settings_post_id;

                v_falhas := v_falhas + 1;
                RAISE NOTICE '[Browser Agent] Falha ao criar task: %', v_resposta->>'error';
            END IF;

        EXCEPTION WHEN OTHERS THEN
            UPDATE "Settings messages posts"
            SET status = 'pending'
            WHERE id = v_registro.settings_post_id;

            v_falhas := v_falhas + 1;
            RAISE NOTICE '[Browser Agent] Erro: %', SQLERRM;
        END;

        v_total_processados := v_total_processados + 1;
        v_contador := v_contador + 1;

        -- Apenas 1 tarefa por vez
        EXIT;
    END LOOP;

    v_status_mensagem := format(
        'Browser Agent: %s task(s) enviada(s), %s falha(s) (total: %s)',
        v_sucessos, v_falhas, v_total_processados
    );

    RETURN QUERY SELECT v_total_processados, v_sucessos, v_falhas, v_status_mensagem;
END;
$function$;
