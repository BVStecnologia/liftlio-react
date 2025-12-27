-- =============================================
-- Função: processar_postagens_via_browser_agent
-- Tipo: Processor (envia postagens para Browser Agent)
--
-- Descrição:
--   Processa postagens pendentes enviando para Browser Agent
--   em vez de chamar API do YouTube diretamente.
--   O Browser Agent executa de forma humanizada.
--
-- Diferença do processar_postagens_pendentes:
--   - NÃO espera resposta (fire-and-forget)
--   - Marca como 'processing' em vez de 'posted'
--   - Edge Function atualiza para 'posted' quando agente completa
--
-- Criado: 2025-12-27
-- =============================================

DROP FUNCTION IF EXISTS processar_postagens_via_browser_agent(bigint);

CREATE OR REPLACE FUNCTION processar_postagens_via_browser_agent(
    projeto_id_param bigint DEFAULT NULL
)
RETURNS TABLE(
    total_enviados integer,
    status_mensagem text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_enviados integer := 0;
    v_status_mensagem text := '';
    v_registro RECORD;
    v_projeto_ativo boolean;
    v_resposta jsonb;
    v_video_youtube_id text;
    v_limite_processamento integer := 10; -- Menos que API pois browser é mais lento
BEGIN
    -- Processar postagens pendentes
    FOR v_registro IN (
        SELECT
            smp.id as settings_post_id,
            smp."Projeto" as projeto_id,
            smp."Mensagens" as mensagem_id,
            smp."Comentarios_Principal" as comentario_principal_id,
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

        -- Verificar se o projeto está ativo e tem browser configurado
        SELECT
            "Youtube Active" AND integracao_valida AND browser_mcp_url IS NOT NULL
        INTO v_projeto_ativo
        FROM "Projeto"
        WHERE id = v_registro.projeto_id;

        IF NOT v_projeto_ativo THEN
            -- Projeto inativo ou sem browser - marcar como failed
            UPDATE "Settings messages posts"
            SET status = 'failed',
                postado = CURRENT_TIMESTAMP
            WHERE id = v_registro.settings_post_id;

            RAISE NOTICE 'Projeto % inativo ou sem browser configurado', v_registro.projeto_id;
            CONTINUE;
        END IF;

        -- Buscar YouTube video ID
        SELECT v."VIDEO" INTO v_video_youtube_id
        FROM "Videos" v
        WHERE v.id = v_registro.video_id;

        IF v_video_youtube_id IS NULL THEN
            RAISE NOTICE 'Video ID não encontrado para mensagem %', v_registro.mensagem_id;
            CONTINUE;
        END IF;

        -- Marcar como 'processing' (Browser Agent vai executar)
        UPDATE "Settings messages posts"
        SET status = 'processing'
        WHERE id = v_registro.settings_post_id;

        -- Enviar para Browser Agent (fire-and-forget)
        BEGIN
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
                v_total_enviados := v_total_enviados + 1;
                RAISE NOTICE 'Task criada para postagem % (task_id: %)',
                    v_registro.settings_post_id, v_resposta->>'task_id';
            ELSE
                -- Falha ao criar task - reverter para pending
                UPDATE "Settings messages posts"
                SET status = 'pending'
                WHERE id = v_registro.settings_post_id;

                RAISE NOTICE 'Falha ao criar task: %', v_resposta->>'error';
            END IF;

        EXCEPTION WHEN OTHERS THEN
            -- Erro - reverter para pending
            UPDATE "Settings messages posts"
            SET status = 'pending'
            WHERE id = v_registro.settings_post_id;

            RAISE NOTICE 'Erro ao processar postagem %: %', v_registro.settings_post_id, SQLERRM;
        END;

        -- Pequeno delay entre tasks para não sobrecarregar
        PERFORM pg_sleep(0.2);
    END LOOP;

    v_status_mensagem := format('Enviados para Browser Agent: %s tasks', v_total_enviados);

    RETURN QUERY SELECT v_total_enviados, v_status_mensagem;
END;
$$;

-- Grant para CRON
GRANT EXECUTE ON FUNCTION processar_postagens_via_browser_agent(bigint) TO service_role;

COMMENT ON FUNCTION processar_postagens_via_browser_agent IS
'Processa postagens pendentes enviando para Browser Agent.
Fire-and-forget: marca como processing e Edge Function atualiza quando agente completa.
Comportamento humanizado: assiste vídeo em 2x, curte comentário, responde.';


-- =============================================
-- Helper: decrement_mentions
-- Decrementa Mentions do customer
-- =============================================

DROP FUNCTION IF EXISTS decrement_mentions(uuid);

CREATE OR REPLACE FUNCTION decrement_mentions(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE customers
    SET "Mentions" = GREATEST(COALESCE("Mentions", 0) - 1, 0)
    WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION decrement_mentions(uuid) TO service_role;
