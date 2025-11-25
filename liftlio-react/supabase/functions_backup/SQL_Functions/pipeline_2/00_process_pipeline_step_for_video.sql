-- =============================================
-- Função: process_pipeline_step_for_video
-- Descrição: Função orquestradora do pipeline - executa o step apropriado
-- Criado: 2025-11-14
-- Atualizado: 2025-11-14 - Adicionado STEP 2 (buscar comentários)
-- =============================================

DROP FUNCTION IF EXISTS process_pipeline_step_for_video(TEXT);

CREATE OR REPLACE FUNCTION public.process_pipeline_step_for_video(video_youtube_id_param text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_current_step INTEGER;
    v_pipeline_completo BOOLEAN;
    v_result TEXT;
BEGIN
    -- Buscar step atual e status
    SELECT current_step, pipeline_completo
    INTO v_current_step, v_pipeline_completo
    FROM pipeline_processing
    WHERE video_youtube_id = video_youtube_id_param;

    -- Verificar se vídeo existe
    IF v_current_step IS NULL THEN
        RETURN 'ERROR: Vídeo ' || video_youtube_id_param || ' não encontrado na pipeline_processing.';
    END IF;

    -- Verificar se pipeline já está completo
    IF v_pipeline_completo = TRUE THEN
        RETURN 'INFO: Pipeline já completo para vídeo ' || video_youtube_id_param;
    END IF;

    -- Chamar função apropriada para o step atual
    CASE v_current_step
        WHEN 0 THEN
            -- Step 0: Criar vídeo na tabela Videos
            v_result := process_step_1_criar_video(video_youtube_id_param);

        WHEN 1 THEN
            -- Step 1: Buscar comentários do YouTube
            v_result := process_step_2_buscar_comentarios(video_youtube_id_param);

        WHEN 2 THEN
            -- Step 2: Curar comentários (filtrar + curar com Claude)
            -- TODO: Implementar process_step_3_curar_video()
            v_result := 'ERROR: Step 2 (curar vídeo) ainda não implementado';

        WHEN 3 THEN
            -- Step 3: Analisar sentimentos dos comentários
            -- TODO: Implementar process_step_4_analisar_comentarios()
            v_result := 'ERROR: Step 3 (analisar comentários) ainda não implementado';

        WHEN 4 THEN
            -- Step 4: Criar mensagens orientadas
            -- TODO: Implementar process_step_5_criar_mensagens()
            v_result := 'ERROR: Step 4 (criar mensagens) ainda não implementado';

        WHEN 5 THEN
            -- Step 5: Pipeline completo!
            UPDATE pipeline_processing
            SET
                pipeline_completo = TRUE,
                pipeline_completo_at = NOW(),
                updated_at = NOW()
            WHERE video_youtube_id = video_youtube_id_param;

            v_result := 'SUCCESS: Pipeline completo para vídeo ' || video_youtube_id_param || '! ✅';

        ELSE
            v_result := 'ERROR: Step inválido (' || v_current_step || ') para vídeo ' || video_youtube_id_param;
    END CASE;

    RETURN v_result;
END;
$function$;

-- =============================================
-- COMENTÁRIOS
-- =============================================
-- FUNÇÃO ORQUESTRADORA DO PIPELINE
--
-- FUNCIONAMENTO:
-- 1. Busca current_step do vídeo na pipeline_processing
-- 2. Verifica se pipeline já está completo
-- 3. Executa função apropriada para o step:
--    - Step 0: process_step_1_criar_video() → Cria vídeo na tabela Videos
--    - Step 1: process_step_2_buscar_comentarios() → Busca comentários da API
--    - Step 2: process_step_3_curar_video() → TODO
--    - Step 3: process_step_4_analisar_comentarios() → TODO
--    - Step 4: process_step_5_criar_mensagens() → TODO
--    - Step 5: Marca pipeline_completo = TRUE
--
-- CHAMADA RECURSIVA:
-- - Cada função de step AVANÇA current_step automaticamente
-- - Chamar esta função novamente executará o próximo step
-- - Exemplo:
--   SELECT process_pipeline_step_for_video('VIDEO_ID'); -- Executa step 0
--   SELECT process_pipeline_step_for_video('VIDEO_ID'); -- Executa step 1
--   SELECT process_pipeline_step_for_video('VIDEO_ID'); -- Executa step 2
--
-- STEPS IMPLEMENTADOS:
-- ✅ Step 0 → 1: Criar vídeo (process_step_1_criar_video)
-- ✅ Step 1 → 2: Buscar comentários (process_step_2_buscar_comentarios)
-- ⏳ Step 2 → 3: Curar vídeo (TODO)
-- ⏳ Step 3 → 4: Analisar comentários (TODO)
-- ⏳ Step 4 → 5: Criar mensagens (TODO)
--
-- USO:
-- SELECT process_pipeline_step_for_video('YAWwH--91h0');
-- =============================================
