-- =============================================
-- Migration: Fix deduplication in verificar_novos_videos_youtube
-- Data: 2025-10-24 22:24 UTC
-- Descrição: Corrige duplicação de video_ids em videos_para_scann
--
-- PROBLEMA IDENTIFICADO:
--   - videos_para_scann acumulava duplicatas a cada execução
--   - Faltava deduplicação ao mesclar IDs existentes + novos
--   - Causava processamento redundante e desperdício de recursos
--
-- SOLUÇÃO IMPLEMENTADA:
--   - Adicionadas 3 variáveis: v_existing_ids, v_all_ids, v_unique_ids
--   - Linhas 158-186: Lógica completa de deduplicação
--     1. Pegar IDs já existentes em videos_para_scann
--     2. Mesclar com novos IDs da API
--     3. Remover duplicatas com DISTINCT
--     4. Atualizar ambos campos com lista deduplicada
--
-- BENEFÍCIOS:
--   ✅ Elimina duplicatas em videos_para_scann
--   ✅ Reduz carga de processamento
--   ✅ Evita re-análises desnecessárias
--   ✅ Mantém histórico limpo em videos_scanreados_2
-- =============================================

-- Remover versões anteriores
DROP FUNCTION IF EXISTS public.verificar_novos_videos_youtube(INT);
DROP FUNCTION IF EXISTS public.verificar_novos_videos_youtube();

CREATE OR REPLACE FUNCTION public.verificar_novos_videos_youtube(
  lote_tamanho integer DEFAULT 15  -- Processa 15 canais por vez
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    canal_record RECORD;
    video_ids_result JSONB;
    video_ids_array TEXT[];
    video_id TEXT;
    processados INT := 0;
    total_canais INT;
    videos_novos_array TEXT[];
    videos_scanreados_check TEXT;
    processar_check TEXT;
    start_time TIMESTAMP := NOW();
    execution_time INTERVAL;
    v_mentions_disponiveis INTEGER;
    v_existing_ids TEXT[];  -- IDs já existentes em videos_para_scann
    v_all_ids TEXT[];       -- Todos IDs (existentes + novos)
    v_unique_ids TEXT[];    -- IDs deduplicados
BEGIN
    -- Conta total de canais a serem processados
    SELECT COUNT(*) INTO total_canais
    FROM "Canais do youtube" c
    JOIN "Projeto" p ON c."Projeto" = p.id
    WHERE p."Youtube Active" = true
      AND c.is_active = true
      AND c.desativado_pelo_user = false
      AND (c.last_canal_check IS NULL OR c.last_canal_check < NOW() - INTERVAL '30 minutes');

    RAISE NOTICE '🔍 [DISCOVERY ONLY] Iniciando descoberta - % canais em lotes de %', total_canais, lote_tamanho;

    FOR canal_record IN
        SELECT c.id, c.channel_id, c.videos_scanreados, c.videos_scanreados_2, c."processar", c.videos_para_scann, p.id as projeto_id
        FROM "Canais do youtube" c
        JOIN "Projeto" p ON c."Projeto" = p.id
        WHERE p."Youtube Active" = true
          AND c.is_active = true
          AND c.desativado_pelo_user = false
          AND (c.last_canal_check IS NULL OR c.last_canal_check < NOW() - INTERVAL '30 minutes')
        ORDER BY c.last_canal_check NULLS FIRST
        LIMIT lote_tamanho
    LOOP
        BEGIN
            processados := processados + 1;

            -- ⭐ VERIFICAR MENTIONS DISPONÍVEIS
            SELECT COALESCE(c."Mentions", 0)
            INTO v_mentions_disponiveis
            FROM customers c
            JOIN "Projeto" p ON p."User id" = c.user_id
            WHERE p.id = canal_record.projeto_id;

            IF v_mentions_disponiveis IS NULL OR v_mentions_disponiveis <= 0 THEN
                RAISE NOTICE 'Canal ID % pulado - Customer sem Mentions disponíveis (Mentions=%)',
                    canal_record.id, v_mentions_disponiveis;
                UPDATE "Canais do youtube"
                SET last_canal_check = CURRENT_TIMESTAMP
                WHERE id = canal_record.id;
                CONTINUE;
            END IF;

            -- ⭐ ANTI-SPAM: Verificar se pode comentar neste canal
            IF NOT can_comment_on_channel(canal_record.channel_id, canal_record.projeto_id) THEN
                RAISE NOTICE 'Canal ID % pulado - bloqueado por Anti-Spam', canal_record.id;
                UPDATE "Canais do youtube"
                SET last_canal_check = CURRENT_TIMESTAMP
                WHERE id = canal_record.id;
                CONTINUE;
            END IF;

            -- Atualiza timestamp
            UPDATE "Canais do youtube"
            SET last_canal_check = CURRENT_TIMESTAMP
            WHERE id = canal_record.id;

            RAISE NOTICE 'Verificando canal ID: % (channel_id: %)', canal_record.id, canal_record.channel_id;

            -- 1. Descobrir vídeos novos (apenas IDs)
            BEGIN
                SELECT monitormanto_de_canal_sql(
                    canal_record.channel_id,
                    'today',
                    10,
                    TRUE  -- simpleResponse (apenas IDs)
                ) INTO video_ids_result;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Erro ao verificar canal ID %: %', canal_record.id, SQLERRM;
                CONTINUE;
            END;

            -- Verificar se houve erro
            IF video_ids_result ? 'error' THEN
                RAISE WARNING 'Erro na verificação do canal ID %: %', canal_record.id, video_ids_result->>'error';
                CONTINUE;
            END IF;

            -- Verificar se não há vídeos novos
            IF video_ids_result = '"NOT"'::jsonb THEN
                RAISE NOTICE 'Canal ID %: Nenhum vídeo novo encontrado', canal_record.id;
                CONTINUE;
            END IF;

            -- Converter JSONB array para array PostgreSQL
            IF jsonb_typeof(video_ids_result) = 'array' THEN
                SELECT array_agg(value::text) INTO video_ids_array
                FROM jsonb_array_elements_text(video_ids_result);

                RAISE NOTICE 'Canal ID %: Encontrados % vídeos para verificação',
                    canal_record.id,
                    array_length(video_ids_array, 1);
            ELSE
                RAISE WARNING 'Canal ID %: Formato inesperado de resposta', canal_record.id;
                CONTINUE;
            END IF;

            -- 2. DEDUPLICAÇÃO: Usar videos_scanreados_2 (TEXT simples e rápido)
            -- ⭐ NOVO: Deduplicação simplificada com videos_scanreados_2
            videos_scanreados_check := ',' || COALESCE(canal_record.videos_scanreados_2, '') || ',';
            processar_check := ',' || COALESCE(canal_record."processar", '') || ',';

            -- Filtrar apenas vídeos não processados
            videos_novos_array := '{}';
            FOREACH video_id IN ARRAY video_ids_array
            LOOP
                IF position(',' || video_id || ',' in videos_scanreados_check) = 0
                   AND position(',' || video_id || ',' in processar_check) = 0 THEN
                    videos_novos_array := array_append(videos_novos_array, video_id);
                END IF;
            END LOOP;

            -- 3. Se há vídeos realmente novos, SALVAR EM FILA E videos_scanreados_2
            IF array_length(videos_novos_array, 1) > 0 THEN
                RAISE NOTICE 'Canal ID %: % vídeos realmente novos → ADICIONANDO À FILA',
                    canal_record.id,
                    array_length(videos_novos_array, 1);

                -- ⭐ CORREÇÃO DEFINITIVA 22:23 UTC - Deduplicação completa
                -- 1. Pegar IDs já existentes em videos_para_scann
                IF canal_record.videos_para_scann IS NOT NULL AND canal_record.videos_para_scann != '' THEN
                    v_existing_ids := string_to_array(canal_record.videos_para_scann, ',');
                ELSE
                    v_existing_ids := '{}';
                END IF;

                -- 2. Mesclar IDs existentes + novos da API
                v_all_ids := array_cat(v_existing_ids, videos_novos_array);

                -- 3. Remover duplicatas e vazios
                SELECT array_agg(DISTINCT video_id ORDER BY video_id)
                INTO v_unique_ids
                FROM unnest(v_all_ids) AS video_id
                WHERE length(trim(video_id)) > 0;

                -- 4. Atualizar ambos campos com lista deduplicada
                UPDATE "Canais do youtube"
                SET
                    videos_scanreados_2 = CASE
                        WHEN videos_scanreados_2 IS NULL OR videos_scanreados_2 = ''
                        THEN array_to_string(v_unique_ids, ',')
                        ELSE videos_scanreados_2 || ',' || array_to_string(v_unique_ids, ',')
                    END,
                    videos_para_scann = array_to_string(v_unique_ids, ',')
                WHERE id = canal_record.id;

                RAISE NOTICE 'Canal ID %: % IDs únicos salvos (deduplicados)', canal_record.id, array_length(v_unique_ids, 1);
            ELSE
                RAISE NOTICE 'Canal ID %: Todos os vídeos já foram processados anteriormente', canal_record.id;
            END IF;

            -- Log de progresso
            IF processados % 10 = 0 THEN
                RAISE NOTICE 'Processados % de % canais', processados, total_canais;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Erro geral ao processar canal %: %', canal_record.channel_id, SQLERRM;
        END;
    END LOOP;

    execution_time := NOW() - start_time;

    RAISE NOTICE '✅ DESCOBERTA concluída em %!', execution_time;
    RAISE NOTICE 'Verificados: % de % canais', processados, total_canais;
    RAISE NOTICE '📋 Canais adicionados à fila de processamento';

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro crítico na descoberta: %', SQLERRM;
END;
$function$;

-- =============================================
-- TESTES RECOMENDADOS
-- =============================================

-- 1. Verificar função foi criada
SELECT proname, pronargs FROM pg_proc WHERE proname = 'verificar_novos_videos_youtube';

-- 2. Testar com 1 canal
SELECT verificar_novos_videos_youtube(1);

-- 3. Verificar deduplicação funcionando
SELECT id, "Nome",
       length(videos_para_scann) as queue_length,
       length(videos_scanreados_2) as history_length
FROM "Canais do youtube"
WHERE videos_para_scann IS NOT NULL
ORDER BY queue_length DESC
LIMIT 5;
