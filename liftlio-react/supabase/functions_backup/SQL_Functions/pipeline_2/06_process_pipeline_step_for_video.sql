-- =============================================
-- Função: process_pipeline_step_for_video
-- Descrição: Orquestrador - executa próximo step de UM vídeo
-- Criado: 2025-11-14
-- =============================================

DROP FUNCTION IF EXISTS process_pipeline_step_for_video(TEXT);

CREATE OR REPLACE FUNCTION public.process_pipeline_step_for_video(video_youtube_id_param TEXT)
RETURNS TEXT
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
            v_result := process_step_3_curar_video(video_youtube_id_param);

        WHEN 3 THEN
            -- Step 3: Analisar sentimentos dos comentários
            v_result := process_step_4_analisar_comentarios(video_youtube_id_param);

        WHEN 4 THEN
            -- Step 4: Criar mensagens orientadas
            v_result := process_step_5_criar_mensagens(video_youtube_id_param);

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
-- Orquestrador de Steps
--
-- Esta função é o ORQUESTRADOR PRINCIPAL que executa o step
-- correto baseado no current_step do vídeo.
--
-- FUNCIONAMENTO:
-- 1. Verifica current_step do vídeo
-- 2. Chama função apropriada para aquele step
-- 3. Cada função de step:
--    - Executa sua tarefa
--    - Atualiza current_step (incrementa)
--    - Retorna SUCCESS ou ERROR
-- 4. Se chegar no step 5, marca pipeline_completo = TRUE
--
-- STEPS:
-- 0 → process_step_1_criar_video()         ✅ Implementado
-- 1 → process_step_2_buscar_comentarios()  ⏳ TODO
-- 2 → process_step_3_curar_video()         ⏳ TODO
-- 3 → process_step_4_analisar_comentarios() ⏳ TODO
-- 4 → process_step_5_criar_mensagens()     ⏳ TODO
-- 5 → Marca pipeline_completo = TRUE       ✅ Implementado
--
-- VANTAGENS:
-- - Código centralizado (fácil manutenção)
-- - Fácil adicionar novos steps
-- - Cada vídeo é processado independentemente
-- - Permite retry de steps individuais
-- - Log claro de progresso
--
-- EXEMPLO DE USO:
-- ```sql
-- -- Processar próximo step do vídeo
-- SELECT process_pipeline_step_for_video('dQw4w9WgXcQ');
--
-- -- Resultado possível:
-- -- 'SUCCESS: Vídeo dQw4w9WgXcQ criado (ID: 123). Avançando para step 1.'
--
-- -- Chamar novamente para executar próximo step
-- SELECT process_pipeline_step_for_video('dQw4w9WgXcQ');
--
-- -- Resultado:
-- -- 'ERROR: Step 1 (buscar comentários) ainda não implementado'
-- ```
--
-- INTEGRAÇÃO COM OUTROS ORQUESTRADORES:
-- - process_scanner_videos(scanner_id) → chama esta função para cada vídeo
-- - process_next_project_scanner(project_id) → chama process_scanner_videos()
--
-- =============================================
