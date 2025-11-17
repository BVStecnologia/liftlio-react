-- =============================================
-- Função: processar_postagens_pendentes
-- Tipo: Processor (executa postagens agendadas)
--
-- Descrição:
--   Processa postagens pendentes que chegaram na hora agendada.
--   Chama API do YouTube e atualiza status.
--
-- Entrada:
--   projeto_id_param BIGINT - ID do projeto (opcional, NULL = todos)
--
-- Saída:
--   TABLE (total_processados, sucessos, falhas, status_mensagem)
--
-- Conexões:
--   → Chamada por: cron_processar_todas_postagens_pendentes (linha 32)
--   → Chama: respond_to_youtube_comment (linha 75)
--
-- CORREÇÃO CRÍTICA:
--   Atualiza AMBAS as tabelas após sucesso:
--   - Settings messages posts (status = 'posted')
--   - Mensagens (respondido = true)
--   - Customers (Mentions = Mentions - 1) - APENAS para tipo 'produto'
--
-- Criado: Data desconhecida
-- Atualizado: 2025-10-21 - Adicionado decremento de Mentions
-- Atualizado: 2025-01-14 - FIX CRÍTICO: Decrementar Mentions apenas para tipo produto
-- =============================================

-- Remover versões anteriores
DROP FUNCTION IF EXISTS public.processar_postagens_pendentes(INT);
DROP FUNCTION IF EXISTS public.processar_postagens_pendentes();
DROP FUNCTION IF EXISTS public.processar_postagens_pendentes(BIGINT);

CREATE OR REPLACE FUNCTION public.processar_postagens_pendentes(projeto_id_param bigint DEFAULT NULL::bigint)
 RETURNS TABLE(total_processados integer, sucessos integer, falhas integer, status_mensagem text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_total_processados integer := 0;
    v_sucessos integer := 0;./.claude-images/image_20251115_113724_001.png./.claude-images/image_20251115_141838_001.png
    v_falhas integer := 0;
    v_status_mensagem text := '';
    v_registro RECORD;
    v_projeto_ativo boolean;
    v_fuso_horario_projeto text;
    v_resposta jsonb;
    v_mensagem_texto text;
    v_parent_comment_id text;
    v_limite_processamento integer := 15;
    v_contador integer := 0;
    v_current_time_local timestamp;
    v_tipo_resposta text; -- NOVO: Armazenar tipo da mensagem
BEGIN
    -- Verificar projetos a processar (um específico ou todos)
    FOR v_registro IN (
        SELECT
            smp.id,
            smp."Projeto" as projeto_id,
            smp."Mensagens" as mensagem_id,  -- IMPORTANTE: Este campo é usado no UPDATE
            smp."Comentarios_Principal" as comentario_id,
            m.mensagem as texto_mensagem,
            m.tipo_resposta,  -- NOVO: Capturar tipo da mensagem
            cp.id_do_comentario as parent_comment_id,
            p.fuso_horario,
            smp.proxima_postagem
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
        -- Obter fuso horário do projeto
        v_fuso_horario_projeto := COALESCE(v_registro.fuso_horario, 'UTC');

        -- Verificar se o projeto está ativo e tem integração válida
        SELECT "Youtube Active" AND integracao_valida INTO v_projeto_ativo
        FROM "Projeto"
        WHERE id = v_registro.projeto_id;

        -- Calcular hora local para logs
        v_current_time_local := CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE v_fuso_horario_projeto;

        -- Log com informações de fuso horário
        RAISE NOTICE 'Processando postagem ID=% do projeto ID=% (fuso horário: %)',
                   v_registro.id, v_registro.projeto_id, v_fuso_horario_projeto;
        RAISE NOTICE 'Horário UTC atual: %, Horário local: %',
                   CURRENT_TIMESTAMP, v_current_time_local;
        RAISE NOTICE 'Horário agendado (UTC): %, Horário agendado (local): %',
                   v_registro.proxima_postagem,
                   v_registro.proxima_postagem AT TIME ZONE 'UTC' AT TIME ZONE v_fuso_horario_projeto;

        -- Se o projeto não estiver ativo, marcar como falha e continuar para o próximo
        IF NOT v_projeto_ativo THEN
            UPDATE "Settings messages posts"
            SET status = 'failed',
                postado = CURRENT_TIMESTAMP
            WHERE id = v_registro.id;

            v_falhas := v_falhas + 1;
            v_total_processados := v_total_processados + 1;
            CONTINUE;
        END IF;

        -- Dados necessários para a postagem
        v_mensagem_texto := v_registro.texto_mensagem;
        v_parent_comment_id := v_registro.parent_comment_id;
        v_tipo_resposta := v_registro.tipo_resposta; -- NOVO: Armazenar tipo

        -- Tentativa de postar o comentário usando a função existente
        BEGIN
            -- Log para diagnóstico
            RAISE NOTICE 'Tentando responder ao comentário: projeto_id=%, parent_comment_id=%, texto=%, tipo=%',
                         v_registro.projeto_id, v_parent_comment_id, v_mensagem_texto, v_tipo_resposta;

            -- Capturar resposta da API com a conversão explícita para INT
            v_resposta := respond_to_youtube_comment(
                v_registro.projeto_id::INT,
                v_parent_comment_id,
                v_mensagem_texto
            );

            -- Log da resposta para diagnóstico
            RAISE NOTICE 'Resposta da API: %', v_resposta;

            -- Verificar corretamente se é sucesso ou erro
            IF v_resposta ? 'success' THEN
                -- =============================================
                -- CORREÇÃO CRÍTICA: Atualizar AMBAS as tabelas
                -- =============================================

                -- 1. Atualizar status na Settings messages posts
                UPDATE "Settings messages posts"
                SET status = 'posted',
                    postado = CURRENT_TIMESTAMP
                WHERE id = v_registro.id;

                -- 2. NOVO: Marcar mensagem como respondida e salvar youtube_comment_id
                UPDATE "Mensagens"
                SET respondido = true,
                    youtube_comment_id = v_resposta->'response'->>'id'
                WHERE id = v_registro.mensagem_id;

                RAISE NOTICE 'CORREÇÃO APLICADA: Mensagem % marcada como respondida=true', v_registro.mensagem_id;

                -- 3. NOVO: Decrementar Mentions do customer (consumo de quota)
                -- CORREÇÃO CRÍTICA: Decrementa APENAS para tipo 'produto'
                IF v_tipo_resposta = 'produto' THEN
                    UPDATE customers c
                    SET "Mentions" = GREATEST(COALESCE("Mentions", 0) - 1, 0)
                    FROM "Projeto" p
                    WHERE p.id = v_registro.projeto_id
                    AND c.user_id = p."User id";

                    RAISE NOTICE 'Mentions decrementado para projeto ID=% (tipo: produto)', v_registro.projeto_id;
                ELSE
                    RAISE NOTICE 'Mentions NÃO decrementado para projeto ID=% (tipo: %)', v_registro.projeto_id, v_tipo_resposta;
                END IF;

                v_sucessos := v_sucessos + 1;
                RAISE NOTICE 'Postagem bem-sucedida para ID=% (Mensagem ID=%)', v_registro.id, v_registro.mensagem_id;

            ELSIF v_resposta ? 'error' THEN
                -- Atualizar status para falha
                UPDATE "Settings messages posts"
                SET status = 'failed',
                    postado = CURRENT_TIMESTAMP
                WHERE id = v_registro.id;

                v_falhas := v_falhas + 1;
                RAISE NOTICE 'Falha na postagem para ID=%: %', v_registro.id, v_resposta->'response'->'error'->>'message';
            ELSE
                -- Caso a resposta não tenha nem success nem error
                UPDATE "Settings messages posts"
                SET status = 'error',
                    postado = CURRENT_TIMESTAMP
                WHERE id = v_registro.id;

                v_falhas := v_falhas + 1;
                RAISE NOTICE 'Resposta inesperada para ID=%: %', v_registro.id, v_resposta;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            -- Em caso de erro na execução da função
            UPDATE "Settings messages posts"
            SET status = 'error',
                postado = CURRENT_TIMESTAMP
            WHERE id = v_registro.id;

            v_falhas := v_falhas + 1;
            RAISE NOTICE 'Erro ao processar postagem %: %', v_registro.id, SQLERRM;
        END;

        v_total_processados := v_total_processados + 1;
        v_contador := v_contador + 1;

        -- Adicionar um pequeno delay para evitar limites de taxa da API
        PERFORM pg_sleep(0.5);

        -- Parar se atingir o limite
        EXIT WHEN v_contador >= v_limite_processamento;
    END LOOP;

    -- Preparar mensagem de status
    v_status_mensagem := 'Processados: ' || v_total_processados ||
                         ', Sucessos: ' || v_sucessos ||
                         ', Falhas: ' || v_falhas;

    RETURN QUERY SELECT v_total_processados, v_sucessos, v_falhas, v_status_mensagem;
END;
$function$
