-- =============================================
-- Função: reset_scanner_processing
-- Descrição: Reseta todos campos do pipeline sem deletar o registro
-- Criado: 2025-11-14
-- =============================================

DROP FUNCTION IF EXISTS reset_scanner_processing(BIGINT);

CREATE OR REPLACE FUNCTION public.reset_scanner_processing(scanner_id_param BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Verificar se registro existe
    SELECT EXISTS(
        SELECT 1 FROM pipeline_processing WHERE scanner_id = scanner_id_param
    ) INTO v_exists;

    IF NOT v_exists THEN
        RETURN 'ERROR: Scanner ' || scanner_id_param || ' não encontrado na tabela pipeline_processing. Use initialize_scanner_processing() primeiro.';
    END IF;

    -- Resetar todos campos mantendo o registro
    UPDATE public.pipeline_processing
    SET
        -- Resetar step
        current_step = 0,
        is_processing = FALSE,
        processing_started_at = NULL,
        retry_count = 0,
        last_retry_at = NULL,

        -- Resetar flags de conclusão
        ids_buscados = FALSE,
        ids_buscados_at = NULL,
        ids_cache = NULL,
        total_ids_encontrados = 0,

        videos_criados = FALSE,
        videos_criados_at = NULL,
        total_videos_criados = 0,
        videos_criados_ids = NULL,

        comentarios_buscados = FALSE,
        comentarios_buscados_at = NULL,
        total_comentarios_principais = 0,
        total_respostas = 0,

        videos_curados = FALSE,
        videos_curados_at = NULL,
        total_comentarios_curados = 0,

        comentarios_analisados = FALSE,
        comentarios_analisados_at = NULL,
        total_comentarios_com_sentimento = 0,

        mensagens_criadas = FALSE,
        mensagens_criadas_at = NULL,
        total_mensagens_geradas = 0,

        pipeline_completo = FALSE,
        pipeline_completo_at = NULL,

        -- Limpar erros
        ids_error = NULL,
        videos_error = NULL,
        comentarios_error = NULL,
        curadoria_error = NULL,
        analise_error = NULL,
        mensagens_error = NULL,

        -- Atualizar timestamp
        updated_at = NOW()
    WHERE scanner_id = scanner_id_param;

    RETURN 'SUCCESS: Scanner ' || scanner_id_param || ' resetado. current_step = 0, todos flags FALSE.';
END;
$function$;

-- =============================================
-- COMENTÁRIOS
-- =============================================
-- Útil para re-processar um scanner do zero
-- Mantém o registro (não deleta)
-- Limpa todos dados de processamento anterior
--
-- USO:
-- SELECT reset_scanner_processing(999);
-- =============================================
