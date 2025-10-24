-- =============================================
-- Função: processar_fila_videos
-- Descrição: Processa 1 canal da fila (videos_para_scann)
-- Chama Python, salva resultados, limpa fila
-- Criado: 2025-01-23
-- Atualizado: 2025-10-24 - JSONB VERSION
-- Features:
--   - Processamento atômico (UPDATE ... RETURNING)
--   - FOR UPDATE SKIP LOCKED (evita race conditions)
--   - Limpa videos_para_scann ANTES de processar
--   - Salva TUDO em videos_scanreados como JSONB array
--   - Extrai APENAS aprovados para campo "processar"
--   - Logs extensivos de debug
--   - Timeout de 2 minutos
--   - Edge Function v5 retorna JSONB array
-- =============================================

DROP FUNCTION IF EXISTS public.processar_fila_videos();

CREATE OR REPLACE FUNCTION public.processar_fila_videos()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    canal_id BIGINT;
    video_ids TEXT;  -- IDs salvos ANTES de limpar
    api_result JSONB;
    videos_array JSONB;  -- Array JSONB de vídeos (Edge Function v5)
    videos_scanreados_atual JSONB;  -- Array atual de videos_scanreados
    approved_ids_array TEXT[];  -- Array de IDs aprovados
    approved_ids_text TEXT;  -- IDs aprovados como texto
    canal_record RECORD;
    v_mentions_disponiveis INTEGER;
    v_projeto_id BIGINT;
BEGIN
    -- 🔧 CONFIGURAR TIMEOUT (2 minutos)
    SET LOCAL statement_timeout = '120s';

    -- 🔍 LOG PERSISTENTE: Início
    INSERT INTO debug_processar_fila (step, message)
    VALUES ('inicio', 'Iniciando processar_fila_videos()');

    RAISE NOTICE '🚀 [DEBUG] Iniciando processar_fila_videos()';

    -- 1. ⭐ BUSCAR 1 CANAL E LIMPAR IMEDIATAMENTE (ATOMIC!)
    RAISE NOTICE '🔍 [DEBUG] Buscando canal na fila...';

    UPDATE "Canais do youtube"
    SET videos_para_scann = NULL  -- LIMPA PRIMEIRO (evita conflitos)
    WHERE id = (
        SELECT id
        FROM "Canais do youtube"
        WHERE videos_para_scann IS NOT NULL
          AND videos_para_scann != ''
        ORDER BY last_canal_check ASC  -- Mais antigo primeiro
        LIMIT 1
        FOR UPDATE SKIP LOCKED  -- Evita race conditions
    )
    RETURNING id, videos_para_scann, channel_id, videos_scanreados, "processar"
    INTO canal_record;

    RAISE NOTICE '✅ [DEBUG] UPDATE RETURNING concluído';

    -- 2. Se não encontrou nada, sai
    IF canal_record.id IS NULL THEN
        INSERT INTO debug_processar_fila (step, message)
        VALUES ('fila_vazia', 'Nenhum canal na fila');

        RAISE NOTICE '📭 [DEBUG] Fila vazia - nenhum canal para processar';
        RETURN;
    END IF;

    -- Guarda IDs que foram removidos
    video_ids := canal_record.videos_para_scann;
    canal_id := canal_record.id;

    -- 🔍 LOG PERSISTENTE: Canal encontrado
    INSERT INTO debug_processar_fila (step, canal_id, message, data)
    VALUES (
        'canal_encontrado',
        canal_id,
        'Canal encontrado e videos_para_scann limpo',
        jsonb_build_object(
            'channel_id', canal_record.channel_id,
            'video_ids', video_ids,
            'videos_scanreados_anterior', canal_record.videos_scanreados,
            'processar_anterior', canal_record."processar"
        )
    );

    RAISE NOTICE '🔄 [DEBUG] Canal encontrado:';
    RAISE NOTICE '   📌 ID: %', canal_id;
    RAISE NOTICE '   📌 Channel ID: %', canal_record.channel_id;
    RAISE NOTICE '   📌 Videos para processar: %', video_ids;
    RAISE NOTICE '   📌 Videos scanreados atual: %', canal_record.videos_scanreados;
    RAISE NOTICE '   📌 Processar atual: %', canal_record."processar";

    -- 2.1. ⭐ VERIFICAR MENTIONS DISPONÍVEIS
    RAISE NOTICE '🔍 [DEBUG] Verificando Mentions disponíveis...';

    SELECT p.id INTO v_projeto_id
    FROM "Canais do youtube" c
    JOIN "Projeto" p ON c."Projeto" = p.id
    WHERE c.id = canal_id;

    RAISE NOTICE '   📌 Projeto ID: %', v_projeto_id;

    SELECT COALESCE(c."Mentions", 0)
    INTO v_mentions_disponiveis
    FROM customers c
    JOIN "Projeto" p ON p."User id" = c.user_id
    WHERE p.id = v_projeto_id;

    RAISE NOTICE '   📌 Mentions disponíveis: %', v_mentions_disponiveis;

    IF v_mentions_disponiveis IS NULL OR v_mentions_disponiveis <= 0 THEN
        RAISE NOTICE '❌ [DEBUG] Canal ID % pulado - Customer sem Mentions disponíveis (Mentions=%)',
            canal_id, v_mentions_disponiveis;
        -- Canal já foi removido da fila, apenas retorna
        RETURN;
    END IF;

    -- 3. ⭐ CHAMAR PYTHON (Edge Function)
    RAISE NOTICE '🐍 [DEBUG] Chamando call_api_edge_function(%)', canal_id;
    RAISE NOTICE '⏱️  [DEBUG] Aguardando resposta do Python (timeout: 120s)...';

    BEGIN
        EXECUTE format('SELECT call_api_edge_function(%L)', canal_id::text)
        INTO api_result;

        RAISE NOTICE '✅ [DEBUG] Python respondeu! Tipo retorno: %', pg_typeof(api_result);

        -- 🔍 LOG PERSISTENTE: Resposta Python
        INSERT INTO debug_processar_fila (step, canal_id, message, data)
        VALUES (
            'python_respondeu',
            canal_id,
            'Python retornou resultado',
            jsonb_build_object(
                'api_result_completo', api_result,
                'tipo_retorno', pg_typeof(api_result)::text
            )
        );

        -- ⭐ EXTRAIR ARRAY JSONB (Edge Function v5 retorna array)
        videos_array := api_result->'text';

        -- 🔍 LOG PERSISTENTE: Extração do JSONB
        INSERT INTO debug_processar_fila (step, canal_id, message, data)
        VALUES (
            'jsonb_extraido',
            canal_id,
            format('JSONB extraído: %s vídeos', jsonb_array_length(videos_array)),
            jsonb_build_object(
                'videos_array', videos_array,
                'array_length', jsonb_array_length(videos_array),
                'is_null', (videos_array IS NULL),
                'is_array', (jsonb_typeof(videos_array) = 'array')
            )
        );

        RAISE NOTICE '📊 [DEBUG] JSONB array extraído:';
        RAISE NOTICE '   📌 api_result completo: %', api_result;
        RAISE NOTICE '   📌 videos_array: %', videos_array;
        RAISE NOTICE '   📌 Quantidade de vídeos: %', jsonb_array_length(videos_array);

        -- 4. SALVAR RESULTADOS
        -- ⭐ Verificar se array não está vazio
        IF videos_array IS NOT NULL AND jsonb_typeof(videos_array) = 'array' AND jsonb_array_length(videos_array) > 0 THEN

            -- 🔍 LOG PERSISTENTE: Entrando no IF de salvamento
            INSERT INTO debug_processar_fila (step, canal_id, message, data)
            VALUES (
                'entrando_salvamento',
                canal_id,
                format('Condição IF passou - %s vídeos para salvar', jsonb_array_length(videos_array)),
                jsonb_build_object(
                    'videos_array_null', (videos_array IS NULL),
                    'is_array', (jsonb_typeof(videos_array) = 'array'),
                    'array_length', jsonb_array_length(videos_array),
                    'primeiro_video', videos_array->0
                )
            );

            RAISE NOTICE '💾 [DEBUG] Salvando resultados em videos_scanreados...';

            -- 4.1. ⭐ SALVAR TUDO em videos_scanreados como JSONB array
            -- Converter campo atual de TEXT para JSONB (se necessário)
            BEGIN
                IF canal_record.videos_scanreados IS NULL OR canal_record.videos_scanreados = '' THEN
                    videos_scanreados_atual := '[]'::jsonb;  -- Array vazio
                    RAISE NOTICE '   📝 [DEBUG] Campo vazio, criando novo array JSONB...';
                ELSE
                    -- Tentar converter para JSONB (pode ser TEXT ainda)
                    BEGIN
                        videos_scanreados_atual := canal_record.videos_scanreados::jsonb;
                        RAISE NOTICE '   📝 [DEBUG] Campo já é JSONB, fazendo append...';
                    EXCEPTION WHEN OTHERS THEN
                        -- Campo ainda é TEXT (formato antigo), converter para JSONB array vazio
                        RAISE NOTICE '   ⚠️ [DEBUG] Campo é TEXT (formato antigo), iniciando com array vazio...';
                        videos_scanreados_atual := '[]'::jsonb;
                    END;
                END IF;

                -- ⭐ APPEND: Concatenar arrays JSONB usando operador ||
                videos_scanreados_atual := videos_scanreados_atual || videos_array;

                RAISE NOTICE '   📌 Array antigo: %', canal_record.videos_scanreados;
                RAISE NOTICE '   📌 Array novo: %', videos_array;
                RAISE NOTICE '   📌 Array final: %', videos_scanreados_atual;

                -- Salvar array JSONB
                UPDATE "Canais do youtube"
                SET videos_scanreados = videos_scanreados_atual::text
                WHERE id = canal_id;

                RAISE NOTICE '   ✅ [DEBUG] Array JSONB salvo com sucesso!';

            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING '   ❌ [ERROR] Erro ao salvar JSONB: %', SQLERRM;
                -- Fallback: salvar apenas o novo array
                UPDATE "Canais do youtube"
                SET videos_scanreados = videos_array::text
                WHERE id = canal_id;
            END;

            -- 🔍 LOG PERSISTENTE: Salvamento concluído
            INSERT INTO debug_processar_fila (step, canal_id, message)
            VALUES (
                'videos_scanreados_salvo',
                canal_id,
                'Campo videos_scanreados atualizado com sucesso'
            );

            -- 4.2. ⭐ EXTRAIR APENAS APROVADOS para campo "processar"
            RAISE NOTICE '🔍 [DEBUG] Extraindo apenas vídeos aprovados...';

            -- ⭐ JSONB torna isso MUITO mais fácil!
            SELECT array_agg(elem->>'id')
            INTO approved_ids_array
            FROM jsonb_array_elements(videos_array) AS elem
            WHERE elem->>'status' = 'APPROVED';

            -- Converter array para texto separado por vírgulas
            IF approved_ids_array IS NOT NULL AND array_length(approved_ids_array, 1) > 0 THEN
                approved_ids_text := array_to_string(approved_ids_array, ',');
            ELSE
                approved_ids_text := NULL;
            END IF;

            RAISE NOTICE '   📌 Aprovados extraídos: %', approved_ids_text;
            RAISE NOTICE '   📌 Quantidade de aprovados: %',
                CASE WHEN approved_ids_array IS NULL THEN 0
                     ELSE array_length(approved_ids_array, 1)
                END;

            -- Salvar apenas aprovados em "processar"
            IF approved_ids_text IS NOT NULL AND approved_ids_text != '' THEN
                RAISE NOTICE '💾 [DEBUG] Salvando aprovados em processar...';

                IF canal_record."processar" IS NULL OR canal_record."processar" = '' THEN
                    RAISE NOTICE '   📝 [DEBUG] Campo processar vazio, criando novo...';
                    UPDATE "Canais do youtube"
                    SET "processar" = approved_ids_text
                    WHERE id = canal_id;
                    RAISE NOTICE '   ✅ [DEBUG] Aprovados salvos (novo campo)';
                ELSE
                    RAISE NOTICE '   📝 [DEBUG] Campo processar já existe, concatenando...';
                    RAISE NOTICE '   📌 Valor antigo: %', canal_record."processar";
                    UPDATE "Canais do youtube"
                    SET "processar" = canal_record."processar" || ',' || approved_ids_text
                    WHERE id = canal_id;
                    RAISE NOTICE '   ✅ [DEBUG] Aprovados salvos (append)';
                END IF;

                RAISE NOTICE '✅ [DEBUG] Canal ID %: % vídeos aprovados salvos em processar',
                    canal_id, approved_ids_text;
            ELSE
                RAISE NOTICE '❌ [DEBUG] Canal ID %: Nenhum vídeo aprovado (todos rejected/skipped)', canal_id;
            END IF;

            -- 🔍 LOG PERSISTENTE: Sucesso total
            INSERT INTO debug_processar_fila (step, canal_id, message)
            VALUES (
                'sucesso_completo',
                canal_id,
                'Canal processado com sucesso - tudo salvo'
            );

            RAISE NOTICE '🎉 [DEBUG] Canal ID % processado com sucesso!', canal_id;

        ELSE
            -- 🔍 LOG PERSISTENTE: Array vazio ou nulo
            INSERT INTO debug_processar_fila (step, canal_id, message, data)
            VALUES (
                'array_vazio',
                canal_id,
                'Nenhum vídeo para processar (array vazio ou NULL)',
                jsonb_build_object(
                    'videos_array', videos_array,
                    'is_null', (videos_array IS NULL),
                    'is_array', (jsonb_typeof(videos_array) = 'array'),
                    'array_length', COALESCE(jsonb_array_length(videos_array), 0)
                )
            );

            RAISE NOTICE '⚠️  [DEBUG] Canal ID %: Nenhum vídeo para processar (array vazio ou NULL)', canal_id;
        END IF;

    EXCEPTION WHEN OTHERS THEN
        -- 🔍 LOG PERSISTENTE: Erro capturado
        INSERT INTO debug_processar_fila (step, canal_id, message, data)
        VALUES (
            'erro_exception',
            canal_id,
            'Erro capturado no EXCEPTION',
            jsonb_build_object(
                'erro', SQLERRM,
                'sqlstate', SQLSTATE
            )
        );

        RAISE WARNING '❌ [ERROR] Erro ao processar canal ID %: %', canal_id, SQLERRM;
        RAISE WARNING '   📌 SQLSTATE: %', SQLSTATE;
        RAISE WARNING '   📌 Context: %', current_query();
        -- Canal já foi removido da fila (videos_para_scann = NULL)
        -- Não tenta novamente
    END;

    -- 🔍 LOG PERSISTENTE: Finalizando
    INSERT INTO debug_processar_fila (step, message)
    VALUES ('finalizando', 'Função processar_fila_videos() finalizada');

    RAISE NOTICE '🏁 [DEBUG] Finalizando processar_fila_videos()';

END;
$function$;

-- =============================================
-- NOTAS DE IMPLEMENTAÇÃO
-- =============================================

/*
COMO FUNCIONA:

1. BUSCA 1 CANAL DA FILA:
   - WHERE videos_para_scann IS NOT NULL
   - ORDER BY last_canal_check ASC (mais antigo primeiro)
   - LIMIT 1 (apenas um canal)
   - FOR UPDATE SKIP LOCKED (evita race conditions)

2. LIMPA CAMPO IMEDIATAMENTE:
   - UPDATE videos_para_scann = NULL
   - RETURNING * INTO canal_record
   - ⭐ ATOMIC: Pega e limpa em 1 operação

3. PROCESSA VÍDEOS:
   - Chama call_api_edge_function(canal_id)
   - Retorna: "id1:✅ APPROVED｜motivo,id2:❌ REJECTED｜motivo"
   - Tempo: ~28s

4. SALVA RESULTADOS:
   - videos_scanreados: TUDO (aprovados + rejeitados)
   - processar: APENAS aprovados (IDs sem justificativa)

5. RETORNA:
   - Canal processado (videos_para_scann = NULL)
   - Pronto para próximo CRON

RACE CONDITIONS:
  ✅ FOR UPDATE SKIP LOCKED: Se outro CRON já está processando um canal,
     este CRON pega o próximo da fila automaticamente

  ✅ ATOMIC UPDATE: Campo limpo ANTES de processar, então mesmo se o Python
     falhar, o canal não volta para a fila

FORMATO DOS DADOS:

  videos_para_scann (ANTES):
    "ExOuL-QSJms,haYapr2Czb0,RG-wtjqc5e4"

  Retorno Python:
    {
      "call_api_edge_function": {
        "text": "ExOuL-QSJms:❌ REJECTED｜Vídeo sobre desenvolvimento pessoal,haYapr2Czb0:❌ REJECTED｜Conteúdo sobre caridade,RG-wtjqc5e4:✅ APPROVED｜Vídeo sobre marketing digital B2B"
      }
    }

  videos_scanreados (DEPOIS):
    "ExOuL-QSJms:❌ REJECTED｜Vídeo sobre desenvolvimento pessoal,haYapr2Czb0:❌ REJECTED｜Conteúdo sobre caridade,RG-wtjqc5e4:✅ APPROVED｜Vídeo sobre marketing digital B2B"

  processar (DEPOIS):
    "RG-wtjqc5e4"

EXEMPLO DE USO:

  -- Executar manualmente (testar)
  SELECT processar_fila_videos();

  -- Ver status da fila
  SELECT COUNT(*) as canais_na_fila
  FROM "Canais do youtube"
  WHERE videos_para_scann IS NOT NULL;

  -- Ver últimos processados
  SELECT id, "Nome", videos_scanreados, "processar"
  FROM "Canais do youtube"
  WHERE videos_scanreados IS NOT NULL
  ORDER BY last_canal_check DESC
  LIMIT 5;

TROUBLESHOOTING:

  -- Erro: Fila não processa
  -- Solução: Verificar se Edge Function está deployada
  SELECT * FROM mcp__supabase__list_edge_functions
  WHERE name = 'video-qualifier-wrapper';

  -- Erro: Python não retorna
  -- Solução: Testar Edge Function manualmente
  SELECT call_api_edge_function('CANAL_ID');

  -- Erro: Canal processado 2x
  -- Solução: NÃO DEVE ACONTECER (FOR UPDATE SKIP LOCKED)
  -- Se acontecer, reportar bug
*/
