-- =============================================
-- Função: verificar_novos_videos_youtube (v2.0 - DISCOVERY ONLY + JSONB v5)
-- Descrição: APENAS descobre vídeos novos e marca em videos_para_scann
-- NÃO chama Python (evita timeout)
-- Criado: 2025-01-23
-- Atualizado: 2025-10-24 - JSONB v5 compatibility
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
        SELECT c.id, c.channel_id, c.videos_scanreados, c."processar", p.id as projeto_id
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

            -- 2. DEDUPLICAÇÃO: Extrair apenas IDs de videos_scanreados (JSONB v5)
            -- ⭐ CORREÇÃO: Usar JSONB operators ao invés de regex
            videos_scanreados_check := ',' || COALESCE((
                SELECT string_agg(elem->>'id', ',')
                FROM jsonb_array_elements(
                    CASE
                        WHEN canal_record.videos_scanreados IS NULL OR canal_record.videos_scanreados = ''
                        THEN '[]'::jsonb
                        ELSE canal_record.videos_scanreados::jsonb
                    END
                ) AS elem
            ), '') || ',';
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

            -- 3. Se há vídeos realmente novos, SALVAR EM FILA
            IF array_length(videos_novos_array, 1) > 0 THEN
                RAISE NOTICE 'Canal ID %: % vídeos realmente novos → ADICIONANDO À FILA',
                    canal_record.id,
                    array_length(videos_novos_array, 1);

                -- ⭐ SALVAR em videos_para_scann (FILA)
                UPDATE "Canais do youtube"
                SET videos_para_scann = array_to_string(videos_novos_array, ',')
                WHERE id = canal_record.id;

                RAISE NOTICE 'Canal ID %: Adicionado à fila de processamento', canal_record.id;
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
