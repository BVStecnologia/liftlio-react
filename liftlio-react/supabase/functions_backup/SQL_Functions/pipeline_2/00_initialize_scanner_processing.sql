-- =============================================
-- Função: initialize_scanner_processing
-- Descrição: Inicializa N registros na pipeline_processing (1 por vídeo do cache)
-- Criado: 2025-11-14
-- Atualizado: 2025-11-14 - Refatorado para arquitetura por vídeo
-- =============================================

DROP FUNCTION IF EXISTS initialize_scanner_processing(BIGINT);

CREATE OR REPLACE FUNCTION public.initialize_scanner_processing(scanner_id_param BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_project_id BIGINT;
    v_scanner_keyword TEXT;
    v_cache_ids TEXT;
    v_video_ids TEXT[];
    v_each_video_id TEXT;
    v_created_count INTEGER := 0;
    v_log TEXT := '';
BEGIN
    -- Buscar dados do scanner
    SELECT "Projeto_id", "Keyword", "ID cache videos"
    INTO v_project_id, v_scanner_keyword, v_cache_ids
    FROM "Scanner de videos do youtube"
    WHERE id = scanner_id_param;

    -- Verificar se scanner existe
    IF v_project_id IS NULL THEN
        RETURN 'ERROR: Scanner ' || scanner_id_param || ' não encontrado';
    END IF;

    -- Verificar se há IDs no cache
    IF v_cache_ids IS NULL OR v_cache_ids = '' THEN
        RETURN 'WARNING: Scanner ' || scanner_id_param || ' não tem IDs no cache. Execute a busca de IDs primeiro.';
    END IF;

    -- Deletar registros antigos deste scanner (se houver)
    DELETE FROM public.pipeline_processing WHERE scanner_id = scanner_id_param;
    v_log := 'Registros antigos removidos.' || E'\n';

    -- Converter string de IDs para array
    v_video_ids := string_to_array(v_cache_ids, ',');

    -- Criar 1 LINHA para CADA vídeo
    FOREACH v_each_video_id IN ARRAY v_video_ids LOOP
        -- Remover espaços em branco
        v_each_video_id := TRIM(v_each_video_id);

        -- Verificar se ID não é vazio
        IF v_each_video_id != '' THEN
            BEGIN
                INSERT INTO public.pipeline_processing (
                    scanner_id,
                    project_id,
                    video_youtube_id,
                    video_db_id,
                    current_step,
                    is_processing,
                    retry_count,
                    created_at,
                    updated_at
                )
                VALUES (
                    scanner_id_param,
                    v_project_id,
                    v_each_video_id,  -- ← Cada vídeo na sua linha!
                    NULL,             -- video_db_id será preenchido no step 1
                    0,                -- Inicia no step 0 (criar vídeo)
                    FALSE,            -- Não está processando ainda
                    0,                -- Zero retries
                    NOW(),
                    NOW()
                );

                v_created_count := v_created_count + 1;
                v_log := v_log || 'Linha criada para vídeo: ' || v_each_video_id || E'\n';
            EXCEPTION
                WHEN unique_violation THEN
                    v_log := v_log || 'Vídeo ' || v_each_video_id || ' já existe (pulando)' || E'\n';
                WHEN OTHERS THEN
                    v_log := v_log || 'ERRO ao criar linha para vídeo ' || v_each_video_id || ': ' || SQLERRM || E'\n';
            END;
        END IF;
    END LOOP;

    RETURN 'SUCCESS: Scanner ' || scanner_id_param || ' (' || v_scanner_keyword || ') - ' ||
           v_created_count || ' vídeos inicializados no projeto ' || v_project_id || E'\n' || v_log;
END;
$function$;

-- =============================================
-- COMENTÁRIOS
-- =============================================
-- ✅ NOVA ARQUITETURA (refatorada 14/11/2025)
--
-- Esta função agora cria N LINHAS (1 por vídeo do cache)
-- Exemplo:
--   Scanner 584 tem cache: 'dQw4w9WgXcQ,jNQXAC9IVRw'
--   Resultado: 2 linhas criadas
--     - Linha 1: scanner_id=584, video_youtube_id='dQw4w9WgXcQ'
--     - Linha 2: scanner_id=584, video_youtube_id='jNQXAC9IVRw'
--
-- MUDANÇAS vs versão antiga:
-- ❌ Antiga: 1 linha por scanner (processava todos vídeos juntos)
-- ✅ Nova: N linhas (1 por vídeo - processamento individual)
--
-- FLUXO:
-- 1. Busca "ID cache videos" do scanner
-- 2. Faz split por vírgula
-- 3. Para cada ID, cria uma linha com video_youtube_id
-- 4. Retorna quantas linhas foram criadas
--
-- IMPORTANTE:
-- - Deleta registros antigos do scanner (fresh start)
-- - Ignora IDs vazios (após trim)
-- - Trata unique_violation (se vídeo já existir)
-- - Cada vídeo começa no step 0
--
-- USO:
-- SELECT initialize_scanner_processing(584);
-- =============================================
