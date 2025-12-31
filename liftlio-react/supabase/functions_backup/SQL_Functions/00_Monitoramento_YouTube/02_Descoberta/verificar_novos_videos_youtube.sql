-- =============================================
-- Função: verificar_novos_videos_youtube (v2.2 - DISCOVERY + videos_scanreados_2)
-- Descrição: APENAS descobre vídeos novos e marca em videos_para_scann
-- NÃO chama Python (evita timeout)
-- Criado: 2025-01-23
-- Atualizado: 2025-10-24 22:24 UTC - FIX: Deduplicação completa em videos_para_scann
-- Atualizado: 2025-12-28 15:06 UTC - FIX 1: Adicionado videos_para_scann no SELECT (bug crítico)
--                                  - FIX 2: Renomeado alias "video_id" para "vid" (ambiguidade)
--                                  - ADD: Verificação de YouTube conectado no Browser Agent
-- Features:
--   - Processamento em lotes (padrão 15 canais)
--   - Anti-spam via can_comment_on_channel
--   - Intervalo mínimo de 30 min entre verificações
--   - Deduplicação usando JSONB operators (compatível com v5)
--   - Salva vídeos novos em videos_para_scann (fila de processamento)
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
    v_youtube_conectado BOOLEAN;  -- Verifica se YouTube está conectado no Browser Agent
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
        -- ⭐ FIX 1 (2025-12-28): Adicionado videos_para_scann no SELECT
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

            -- ⭐ ADD (2025-12-28): Verificar se YouTube está conectado no Browser Agent
            SELECT bl.is_connected INTO v_youtube_conectado
            FROM browser_logins bl
            WHERE bl.projeto_id = canal_record.projeto_id
              AND bl.platform_name = 'youtube'
              AND bl.is_active = true;

            IF v_youtube_conectado IS NULL OR v_youtube_conectado = false THEN
                RAISE NOTICE 'Canal ID % pulado - YouTube não conectado no Browser Agent (projeto %)',
                    canal_record.id, canal_record.projeto_id;
                UPDATE "Canais do youtube"
                SET last_canal_check = CURRENT_TIMESTAMP
                WHERE id = canal_record.id;
                CONTINUE;
            END IF;

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
                -- ⭐ FIX 2 (2025-12-28): Renomeado "video_id" para "vid" para evitar ambiguidade
                SELECT array_agg(DISTINCT vid ORDER BY vid)
                INTO v_unique_ids
                FROM unnest(v_all_ids) AS vid
                WHERE length(trim(vid)) > 0;

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
-- NOTAS DE IMPLEMENTAÇÃO
-- =============================================

/*
MUDANÇAS da v2.1 (antiga) para v2.0 (nova):

v2.1 (ANTIGA - COM TIMEOUT):
  ✅ Descobre vídeos
  ✅ Chama Python (~28s por canal)  ← CAUSA TIMEOUT!
  ✅ Salva em videos_scanreados
  ✅ Salva em processar

v2.0 (NOVA - SEM TIMEOUT):
  ✅ Descobre vídeos
  ✅ Salva em videos_para_scann (FILA)
  ❌ NÃO chama Python (evita timeout)
  ❌ NÃO salva em videos_scanreados (será feito por processar_fila_videos)

BENEFÍCIOS:
  ✅ Rápido: 100 canais em ~1,6 min (vs 46 min na v2.1)
  ✅ Sem timeout: Não chama Python
  ✅ Simples: Mantém toda lógica atual (anti-spam, deduplicação)
  ✅ Escalável: Pode processar 1000+ canais sem timeout

PRÓXIMOS PASSOS:
  1. Criar função processar_fila_videos() (processa a fila)
  2. CRON 1 (já existente): verificar_novos_videos_youtube() a cada 45 min
  3. Configurar CRON 2 (novo): processar_fila_videos() a cada 3 min

EXEMPLO DE USO:
  -- Executar descoberta
  SELECT verificar_novos_videos_youtube(100);

  -- Ver canais na fila
  SELECT id, "Nome", videos_para_scann
  FROM "Canais do youtube"
  WHERE videos_para_scann IS NOT NULL;
*/
