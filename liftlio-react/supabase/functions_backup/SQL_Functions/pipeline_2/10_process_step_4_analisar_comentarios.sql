-- =============================================
-- Função: process_step_4_analisar_comentarios
-- Descrição: Step 4 - Analisa sentimentos dos comentários curados com Claude AI
-- Criado: 2025-11-14
-- =============================================

DROP FUNCTION IF EXISTS process_step_4_analisar_comentarios(TEXT);

CREATE OR REPLACE FUNCTION public.process_step_4_analisar_comentarios(video_youtube_id_param TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_video_db_id BIGINT;
    v_project_id INTEGER;
    v_current_step INTEGER;
    v_total_comentarios_curados INTEGER;
    v_analysis_result TEXT;
    v_total_analisados INTEGER := 0;
BEGIN
    -- Buscar dados do vídeo na pipeline
    SELECT video_db_id, project_id, current_step, total_comentarios_curados
    INTO v_video_db_id, v_project_id, v_current_step, v_total_comentarios_curados
    FROM pipeline_processing
    WHERE video_youtube_id = video_youtube_id_param;

    -- Verificar se vídeo existe na pipeline
    IF v_video_db_id IS NULL THEN
        RETURN 'ERROR: Vídeo ' || video_youtube_id_param || ' não encontrado na pipeline ou video_db_id NULL.';
    END IF;

    -- Verificar se está no step correto
    IF v_current_step != 3 THEN
        RETURN 'ERROR: Vídeo ' || video_youtube_id_param || ' não está no step 3. Current step: ' || v_current_step;
    END IF;

    -- Verificar se tem comentários curados para analisar
    IF v_total_comentarios_curados IS NULL OR v_total_comentarios_curados = 0 THEN
        -- Sem comentários curados, avançar step mesmo assim
        UPDATE pipeline_processing
        SET
            comentarios_analisados = TRUE,
            comentarios_analisados_at = NOW(),
            total_comentarios_com_sentimento = 0,
            analise_error = 'Vídeo sem comentários curados para analisar',
            current_step = 4,  -- Avançar para step 4 (mensagens)
            updated_at = NOW()
        WHERE video_youtube_id = video_youtube_id_param;

        RETURN 'WARNING: Vídeo ' || video_youtube_id_param || ' sem comentários curados. Avançando para step 4.';
    END IF;

    -- Chamar função de análise do sistema atual
    -- NOTA: analisar_comentarios_com_claude analisa comentários não analisados de um vídeo específico
    BEGIN
        -- Chamar análise passando project_id e video_id
        SELECT analisar_comentarios_com_claude(v_project_id::INTEGER, v_video_db_id::INTEGER) INTO v_analysis_result;
        -- FIX 2025-11-28: Agora chama diretamente com video_db_id (antes usava atualizar_comentarios_analisados sem video_id)

        -- Verificar se houve erro na análise
        IF v_analysis_result LIKE '%Erro%' OR
           v_analysis_result LIKE '%retornou um resultado nulo%' OR
           v_analysis_result LIKE '%não é um array JSON válido%' OR
           v_analysis_result IS NULL THEN

            UPDATE pipeline_processing
            SET
                analise_error = 'Erro na análise: ' || v_analysis_result,
                retry_count = retry_count + 1,
                last_retry_at = NOW(),
                updated_at = NOW()
            WHERE video_youtube_id = video_youtube_id_param;

            RETURN 'ERROR: Análise falhou para vídeo ' || video_youtube_id_param || ': ' || v_analysis_result;
        END IF;

        -- Contar leads identificados (comentários marcados como lead)
        SELECT COUNT(*) INTO v_total_analisados
        FROM "Comentarios_Principais"
        WHERE video_id = v_video_db_id
        AND led = TRUE;

        -- Atualizar pipeline_processing com sucesso
        UPDATE pipeline_processing
        SET
            comentarios_analisados = TRUE,
            comentarios_analisados_at = NOW(),
            total_comentarios_com_sentimento = v_total_analisados,
            analise_error = NULL,
            retry_count = 0,
            current_step = 4,  -- Avançar para step 4 (mensagens)
            updated_at = NOW()
        WHERE video_youtube_id = video_youtube_id_param;

        RETURN 'SUCCESS: ' || v_total_analisados || ' leads identificados via análise Claude. Avançando para step 4.';

    EXCEPTION
        WHEN OTHERS THEN
            -- Erro ao chamar análise
            UPDATE pipeline_processing
            SET
                analise_error = 'Erro ao chamar análise: ' || SQLERRM,
                retry_count = retry_count + 1,
                last_retry_at = NOW(),
                updated_at = NOW()
            WHERE video_youtube_id = video_youtube_id_param;

            RETURN 'ERROR: Falha na análise do vídeo ' || video_youtube_id_param || ': ' || SQLERRM;
    END;
END;
$function$;

-- =============================================
-- COMENTÁRIOS
-- =============================================
-- STEP 4: Analisar Comentários com Claude
--
-- FUNCIONAMENTO:
-- 1. Verifica se está no step 3 (comentários curados)
-- 2. Busca video_db_id e total_comentarios_curados
-- 3. Chama atualizar_comentarios_analisados(project_id)
--    - Função usa analisar_comentarios_com_claude() internamente
--    - Claude AI analisa usando metodologia PICS EXPANDIDA (5 dimensões)
--    - Classifica cada comentário como lead (true/false)
--    - Atribui lead_score (0-10) e justificativa
-- 4. Conta leads identificados (led = TRUE)
-- 5. Atualiza pipeline_processing:
--    - comentarios_analisados = TRUE
--    - total_leads_identificados = N
--    - current_step = 4 (avança para mensagens)
--
-- CASOS ESPECIAIS:
-- - Vídeo sem comentários curados: Avança step com warning
-- - Erro na análise: Marca erro, incrementa retry, NÃO avança
-- - Comentários analisados mas sem leads: Continua normalmente (0 leads)
--
-- INTEGRAÇÃO:
-- - USA função existente: atualizar_comentarios_analisados(project_id)
-- - Esta função chama analisar_comentarios_com_claude() para análise com Claude
-- - Atualiza campos em Comentarios_Principais:
--   * comentario_analizado = TRUE
--   * led = TRUE/FALSE
--   * lead_score = 0-10
--   * justificativa = texto explicativo
-- - NÃO modifica funções do sistema atual
-- - Apenas lê resultado e atualiza pipeline
--
-- IMPORTANTE:
-- - analisar_comentarios_com_claude() usa Claude Sonnet 4 com timeout 300s
-- - Função analisa APENAS comentários não analisados (comentario_analizado = FALSE)
-- - Sistema PICS EXPANDIDA avalia 5 dimensões: Problema, Intenção, Contexto, Perfil, Validação Social
-- - Leads quentes (9-10): Profissionais estabelecidos OU interesse direto em compra
-- - Leads mornos (7-8): Negócio ativo OU problema específico + ação concreta
-- - Leads frios (6-7): Consciência do problema + interesse passivo
-- - NÃO é lead (<6): Pedido de tutorial grátis OU comentário genérico
--
-- USO:
-- SELECT process_step_4_analisar_comentarios('JBeQDU6WIPU');
-- =============================================
