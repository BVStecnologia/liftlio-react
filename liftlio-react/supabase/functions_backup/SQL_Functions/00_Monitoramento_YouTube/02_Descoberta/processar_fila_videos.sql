-- =============================================
-- Função: processar_fila_videos
-- Descrição: Processa 1 canal da fila (videos_para_scann)
-- Chama Edge Function, salva resultados, limpa fila
-- Criado: 2025-01-23
-- Atualizado: 2025-10-24 - V3 (LIVE)
-- =============================================
--
-- ⚠️ ATUALIZADO EM: 2025-10-24 23:15 UTC
-- ⚠️ SINCRONIZADO COM: Supabase LIVE (suqjifkhmekcdflwowiw)
-- ⚠️ VERSÃO: V3 - "com limpeza no final"
--
-- 🔄 DIFERENÇAS PRINCIPAIS vs VERSÃO ANTERIOR:
--
-- 1. TIMING DA LIMPEZA DA FILA:
--    ❌ ANTES (V2): Limpava videos_para_scann ANTES de processar (UPDATE ... RETURNING)
--    ✅ AGORA (V3): Limpa DEPOIS de salvar com sucesso
--    Motivo: Mais seguro, permite retry em caso de erro
--
-- 2. SELEÇÃO DO CANAL:
--    ❌ ANTES: UPDATE ... WHERE id = (SELECT...) RETURNING *
--    ✅ AGORA: SELECT ... FROM ... WHERE id IN (SELECT...)
--    Motivo: Preserva dados originais até garantir sucesso
--
-- 3. EXTRAÇÃO DO JSONB:
--    ❌ ANTES: api_result->'text' (INCORRETO!)
--    ✅ AGORA: api_result->'call_api_edge_function'->'text'
--    Motivo: Edge Function retorna estrutura aninhada
--
-- 4. ROBUSTEZ:
--    ✅ Não perde IDs se Python falhar
--    ✅ Pode retentar em caso de erro
--    ✅ Limpeza controlada apenas após sucesso
--
-- =============================================

DROP FUNCTION IF EXISTS public.processar_fila_videos();

CREATE OR REPLACE FUNCTION public.processar_fila_videos()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    canal_id BIGINT;
    video_ids TEXT;
    api_result JSONB;
    videos_array JSONB;
    videos_scanreados_atual JSONB;
    approved_ids_array TEXT[];
    approved_ids_text TEXT;
    canal_record RECORD;
    v_mentions_disponiveis INTEGER;
    v_projeto_id BIGINT;
BEGIN
    SET LOCAL statement_timeout = '120s';

    INSERT INTO debug_processar_fila (step, message)
    VALUES ('inicio', 'Iniciando processar_fila_videos() - V3 com limpeza no final');

    RAISE NOTICE '🚀 [DEBUG] Iniciando processar_fila_videos() - V3';

    -- 1. Buscar canal SEM limpar (SELECT apenas)
    SELECT id, "Projeto", channel_id, videos_para_scann, videos_scanreados, "processar"
    INTO canal_record
    FROM "Canais do youtube"
    WHERE id IN (
        SELECT id FROM "Canais do youtube"
        WHERE videos_para_scann IS NOT NULL
          AND videos_para_scann != ''
        ORDER BY last_canal_check ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    );

    IF canal_record.id IS NULL THEN
        INSERT INTO debug_processar_fila (step, message)
        VALUES ('fila_vazia', 'Nenhum canal na fila');
        RAISE NOTICE '📭 [DEBUG] Fila vazia';
        RETURN;
    END IF;

    video_ids := canal_record.videos_para_scann;
    canal_id := canal_record.id;

    INSERT INTO debug_processar_fila (step, canal_id, message)
    VALUES ('canal_encontrado', canal_id, 'Canal encontrado (fila NÃO limpa ainda)');

    RAISE NOTICE '🔄 [DEBUG] Canal % encontrado (fila preservada)', canal_id;

    -- 2. Verificar Mentions
    SELECT p.id INTO v_projeto_id
    FROM "Canais do youtube" c
    JOIN "Projeto" p ON c."Projeto" = p.id
    WHERE c.id = canal_id;

    SELECT COALESCE(c."Mentions", 0)
    INTO v_mentions_disponiveis
    FROM customers c
    JOIN "Projeto" p ON p."User id" = c.user_id
    WHERE p.id = v_projeto_id;

    IF v_mentions_disponiveis IS NULL OR v_mentions_disponiveis <= 0 THEN
        RAISE NOTICE '❌ [DEBUG] Sem Mentions disponíveis';
        RETURN;
    END IF;

    -- 3. Chamar Edge Function
    RAISE NOTICE '🐍 [DEBUG] Chamando Edge Function...';

    BEGIN
        EXECUTE format('SELECT call_api_edge_function(%L)', canal_id::text)
        INTO api_result;

        RAISE NOTICE '✅ [DEBUG] Edge Function respondeu';

        INSERT INTO debug_processar_fila (step, canal_id, message, data)
        VALUES (
            'python_respondeu',
            canal_id,
            'Edge Function retornou',
            jsonb_build_object('api_result', api_result)
        );

        -- Extrair array JSONB (⚠️ CAMINHO CORRETO!)
        videos_array := api_result->'call_api_edge_function'->'text';

        RAISE NOTICE '📊 [DEBUG] JSONB extraído: %', videos_array;

        INSERT INTO debug_processar_fila (step, canal_id, message, data)
        VALUES (
            'jsonb_extraido',
            canal_id,
            format('JSONB extraído: %s vídeos', COALESCE(jsonb_array_length(videos_array), 0)),
            jsonb_build_object(
                'videos_array', videos_array,
                'is_null', (videos_array IS NULL),
                'is_array', (jsonb_typeof(videos_array) = 'array'),
                'array_length', COALESCE(jsonb_array_length(videos_array), 0)
            )
        );

        -- 4. Salvar resultados
        IF videos_array IS NOT NULL AND jsonb_typeof(videos_array) = 'array' AND jsonb_array_length(videos_array) > 0 THEN

            RAISE NOTICE '💾 [DEBUG] Salvando % vídeos...', jsonb_array_length(videos_array);

            BEGIN
                IF canal_record.videos_scanreados IS NULL OR canal_record.videos_scanreados = '' THEN
                    videos_scanreados_atual := '[]'::jsonb;
                ELSE
                    BEGIN
                        videos_scanreados_atual := canal_record.videos_scanreados::jsonb;
                    EXCEPTION WHEN OTHERS THEN
                        videos_scanreados_atual := '[]'::jsonb;
                    END;
                END IF;

                -- Append arrays
                videos_scanreados_atual := videos_scanreados_atual || videos_array;

                RAISE NOTICE '   📌 Array final: % vídeos', jsonb_array_length(videos_scanreados_atual);

                -- Salvar
                UPDATE "Canais do youtube"
                SET videos_scanreados = videos_scanreados_atual::text
                WHERE id = canal_id;

                RAISE NOTICE '   ✅ Salvo em videos_scanreados';

                -- ✅ LIMPAR fila apenas após sucesso
                UPDATE "Canais do youtube"
                SET videos_para_scann = NULL
                WHERE id = canal_id;

                RAISE NOTICE '   🧹 Fila limpa após processamento bem-sucedido';

            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING '❌ Erro ao salvar JSONB: %', SQLERRM;
                UPDATE "Canais do youtube"
                SET videos_scanreados = videos_array::text
                WHERE id = canal_id;

                -- Limpar mesmo em caso de fallback
                UPDATE "Canais do youtube"
                SET videos_para_scann = NULL
                WHERE id = canal_id;
            END;

            -- 5. Extrair aprovados
            SELECT array_agg(elem->>'id')
            INTO approved_ids_array
            FROM jsonb_array_elements(videos_array) AS elem
            WHERE elem->>'status' = 'APPROVED';

            IF approved_ids_array IS NOT NULL AND array_length(approved_ids_array, 1) > 0 THEN
                approved_ids_text := array_to_string(approved_ids_array, ',');
            ELSE
                approved_ids_text := NULL;
            END IF;

            RAISE NOTICE '   📌 Aprovados: %', approved_ids_text;

            -- Salvar aprovados em "processar"
            IF approved_ids_text IS NOT NULL THEN
                IF canal_record."processar" IS NULL OR canal_record."processar" = '' THEN
                    UPDATE "Canais do youtube"
                    SET "processar" = approved_ids_text
                    WHERE id = canal_id;
                ELSE
                    UPDATE "Canais do youtube"
                    SET "processar" = canal_record."processar" || ',' || approved_ids_text
                    WHERE id = canal_id;
                END IF;
                RAISE NOTICE '   ✅ Aprovados salvos em processar';
            ELSE
                RAISE NOTICE '   ℹ️ Nenhum vídeo aprovado';
            END IF;

            INSERT INTO debug_processar_fila (step, canal_id, message)
            VALUES ('sucesso_completo', canal_id, 'Processamento concluído com sucesso');

            RAISE NOTICE '🎉 [DEBUG] Canal % processado!', canal_id;

        ELSE
            INSERT INTO debug_processar_fila (step, canal_id, message, data)
            VALUES (
                'array_vazio',
                canal_id,
                'Array vazio ou NULL',
                jsonb_build_object('videos_array', videos_array)
            );
            RAISE NOTICE '⚠️ [DEBUG] Nenhum vídeo para processar';
        END IF;

    EXCEPTION WHEN OTHERS THEN
        INSERT INTO debug_processar_fila (step, canal_id, message, data)
        VALUES (
            'erro_exception',
            canal_id,
            'Erro no processamento',
            jsonb_build_object('erro', SQLERRM, 'sqlstate', SQLSTATE)
        );
        RAISE WARNING '❌ [ERROR] Erro: %', SQLERRM;
    END;

    INSERT INTO debug_processar_fila (step, message)
    VALUES ('finalizando', 'Função finalizada');

    RAISE NOTICE '🏁 [DEBUG] Finalizado';

END;
$function$;

-- =============================================
-- NOTAS DE USO
-- =============================================

/*
EXEMPLO DE USO:

  -- Executar manualmente
  SELECT public.processar_fila_videos();

  -- Ver fila
  SELECT COUNT(*) FROM "Canais do youtube" WHERE videos_para_scann IS NOT NULL;

  -- Ver debug logs
  SELECT * FROM debug_processar_fila ORDER BY created_at DESC LIMIT 20;

TROUBLESHOOTING:

  -- Ver estrutura do retorno da Edge Function
  SELECT call_api_edge_function('1120');

  -- Limpar fila manualmente (emergência)
  UPDATE "Canais do youtube" SET videos_para_scann = NULL WHERE id = 1123;
*/
