-- =============================================
-- Função: process_step_0_buscar_ids
-- Descrição: Step 0 - Copia IDs do cache do scanner para pipeline_processing
-- Criado: 2025-11-14
-- =============================================

DROP FUNCTION IF EXISTS process_step_0_buscar_ids(BIGINT);

CREATE OR REPLACE FUNCTION public.process_step_0_buscar_ids(scanner_id_param BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_cache_ids TEXT;
    v_id_count INTEGER;
    v_current_step INTEGER;
BEGIN
    -- Verificar se scanner está no step correto
    SELECT current_step INTO v_current_step
    FROM pipeline_processing
    WHERE scanner_id = scanner_id_param;

    IF v_current_step IS NULL THEN
        RETURN 'ERROR: Scanner ' || scanner_id_param || ' não encontrado na pipeline_processing. Use initialize_scanner_processing() primeiro.';
    END IF;

    IF v_current_step != 0 THEN
        RETURN 'ERROR: Scanner ' || scanner_id_param || ' não está no step 0. Current step: ' || v_current_step;
    END IF;

    -- Buscar IDs do cache do scanner
    SELECT "ID cache videos"
    INTO v_cache_ids
    FROM "Scanner de videos do youtube"
    WHERE id = scanner_id_param;

    -- Verificar se há IDs no cache
    IF v_cache_ids IS NULL OR v_cache_ids = '' THEN
        -- Marcar erro: cache vazio
        UPDATE pipeline_processing
        SET
            ids_error = 'Campo "ID cache videos" está vazio. Aguardando sistema buscar novos IDs.',
            retry_count = retry_count + 1,
            last_retry_at = NOW(),
            updated_at = NOW()
        WHERE scanner_id = scanner_id_param;

        RETURN 'WAITING: Cache vazio. Sistema precisa buscar IDs primeiro.';
    END IF;

    -- Contar quantos IDs temos
    v_id_count := array_length(string_to_array(v_cache_ids, ','), 1);

    -- Salvar IDs na tabela pipeline_processing
    UPDATE pipeline_processing
    SET
        ids_cache = v_cache_ids,
        total_ids_encontrados = v_id_count,
        ids_buscados = TRUE,
        ids_buscados_at = NOW(),
        ids_error = NULL,  -- Limpar erro anterior
        current_step = 1,  -- Avançar para próximo step
        updated_at = NOW()
    WHERE scanner_id = scanner_id_param;

    RETURN 'SUCCESS: ' || v_id_count || ' IDs copiados do cache. Avançando para step 1 (criar vídeos).';
END;
$function$;

-- =============================================
-- COMENTÁRIOS
-- =============================================
-- STEP 0: Buscar IDs
--
-- Esta função NÃO chama Edge Function para buscar novos IDs.
-- Ela apenas COPIA os IDs que já estão no campo "ID cache videos" do scanner.
--
-- A busca de novos IDs continua sendo responsabilidade do sistema atual (STATUS 1).
-- Isso evita duplicação de lógica e mantém o Pipeline 2 isolado.
--
-- FLUXO:
-- 1. Verifica se está no step 0
-- 2. Lê campo "ID cache videos" do scanner
-- 3. Se vazio → marca erro e aguarda
-- 4. Se tem IDs → copia para pipeline_processing
-- 5. Avança para step 1 (criar vídeos)
--
-- USO:
-- SELECT process_step_0_buscar_ids(584);
-- =============================================
