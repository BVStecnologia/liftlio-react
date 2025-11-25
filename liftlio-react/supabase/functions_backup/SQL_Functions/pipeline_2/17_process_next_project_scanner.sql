-- =============================================
-- Funcao: process_next_project_scanner
-- Descricao: Orquestrador de Projeto - processa proximo scanner em rotacao circular
-- Criado: 2025-11-14
-- Atualizado: 2025-11-25 - Adicionado sync de status (MAX + nunca retrocede)
-- =============================================

DROP FUNCTION IF EXISTS process_next_project_scanner(BIGINT);

CREATE OR REPLACE FUNCTION public.process_next_project_scanner(project_id_param BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_next_scanner_id BIGINT;
    v_cache_ids TEXT;
    v_init_result TEXT;
    v_process_result TEXT;
    v_status_result TEXT;
BEGIN
    -- Buscar próximo scanner a processar (rotação circular)
    SELECT get_next_scanner_to_process(project_id_param) INTO v_next_scanner_id;

    -- Verificar se encontrou scanner
    IF v_next_scanner_id IS NULL THEN
        RETURN 'ERROR: Nenhum scanner encontrado para projeto ' || project_id_param;
    END IF;

    RAISE NOTICE '🔄 Projeto %: Processando scanner %', project_id_param, v_next_scanner_id;

    -- Verificar se scanner tem cache de IDs
    SELECT "ID cache videos" INTO v_cache_ids
    FROM "Scanner de videos do youtube"
    WHERE id = v_next_scanner_id;

    -- Se cache está vazio, sistema precisa buscar IDs primeiro
    IF v_cache_ids IS NULL OR v_cache_ids = '' THEN
        RETURN format(
            'WAITING: Scanner %s sem IDs no cache. Sistema precisa executar update_video_id_cache(%s) primeiro.',
            v_next_scanner_id, v_next_scanner_id
        );
    END IF;

    -- Verificar se scanner já foi inicializado na pipeline
    IF NOT EXISTS (
        SELECT 1 FROM pipeline_processing
        WHERE scanner_id = v_next_scanner_id
    ) THEN
        -- Inicializar scanner (criar linhas para cada vídeo)
        RAISE NOTICE '📋 Inicializando scanner % com IDs do cache', v_next_scanner_id;
        SELECT initialize_scanner_processing(v_next_scanner_id) INTO v_init_result;
        RAISE NOTICE 'Inicialização: %', v_init_result;
    END IF;

    -- Processar videos do scanner
    RAISE NOTICE 'Processando videos do scanner %', v_next_scanner_id;
    SELECT process_scanner_videos(v_next_scanner_id) INTO v_process_result;

    -- =============================================
    -- SYNC STATUS: Atualiza Projeto.status baseado no Pipeline 2
    -- Usa MAX (video mais avancado) + nunca retrocede
    -- =============================================
    SELECT update_project_status_from_pipeline(project_id_param) INTO v_status_result;
    RAISE NOTICE 'Status sync: %', v_status_result;

    -- Retornar resultado com status
    RETURN format(
        'Projeto %s -> Scanner %s: %s | %s',
        project_id_param,
        v_next_scanner_id,
        v_process_result,
        v_status_result
    );
END;
$function$;

-- =============================================
-- COMENTÁRIOS
-- =============================================
-- Orquestrador de Projeto (Rotação Circular de Scanners)
--
-- Esta função é o ORQUESTRADOR PRINCIPAL que processa scanners
-- de um projeto em rotação circular.
--
-- FUNCIONAMENTO:
-- 1. Chama get_next_scanner_to_process(project_id)
--    - Retorna próximo scanner após o último completado
--    - Rotação circular: 584 → 585 → 586 → volta para 584
-- 2. Verifica se scanner tem IDs no cache
--    - Se não tem: retorna WAITING (sistema precisa buscar)
-- 3. Verifica se scanner foi inicializado na pipeline
--    - Se não foi: chama initialize_scanner_processing()
-- 4. Processa vídeos do scanner: process_scanner_videos()
-- 5. Retorna resultado
--
-- IMPORTANTE:
-- - Rotação automática (sempre pega próximo scanner)
-- - Auto-inicialização (cria linhas se necessário)
-- - Aguarda IDs (não quebra se cache vazio)
-- - Ideal para cron job de projeto
--
-- EXEMPLO DE USO:
-- ```sql
-- -- Processar próximo scanner do projeto 117
-- SELECT process_next_project_scanner(117);
-- -- Resultado: "Projeto 117 → Scanner 584: Scanner 584 processado: 1/2 vídeos completos, 0 com erro"
--
-- -- Chamar novamente (continua processando scanner 584)
-- SELECT process_next_project_scanner(117);
-- -- Resultado: "Projeto 117 → Scanner 584: Scanner 584 processado: 2/2 vídeos completos, 0 com erro"
--
-- -- Chamar novamente (scanner 584 completo, rotaciona para 585)
-- SELECT process_next_project_scanner(117);
-- -- Resultado: "Projeto 117 → Scanner 585: WAITING: Scanner 585 sem IDs no cache..."
--
-- -- Sistema busca IDs para scanner 585
-- SELECT update_video_id_cache(585);
--
-- -- Continuar processando
-- SELECT process_next_project_scanner(117);
-- -- Resultado: "Projeto 117 → Scanner 585: Scanner 585 processado: 0/3 vídeos completos, 0 com erro"
-- ```
--
-- INTEGRAÇÃO COM CRON (Automação Completa):
-- ```sql
-- -- Agendar para rodar a cada 10 minutos
-- SELECT cron.schedule(
--   'process_project_117',
--   '*/10 * * * *',  -- A cada 10 minutos
--   'SELECT process_next_project_scanner(117)'
-- );
-- ```
--
-- FLUXO AUTOMÁTICO:
-- 1. Cron chama a cada 10 min
-- 2. Função processa próximo scanner
-- 3. Se scanner sem cache: retorna WAITING
--    - Sistema externo (STATUS 1) busca IDs
--    - Próximo cron retoma processamento
-- 4. Se scanner completo: rotaciona para próximo
-- 5. Processo nunca para (circular infinito)
--
-- VANTAGENS:
-- - ✅ Zero intervenção manual
-- - ✅ Rotação automática de keywords
-- - ✅ Auto-recuperação de erros
-- - ✅ Processamento paralelo de vídeos
-- - ✅ Integração perfeita com sistema atual
-- =============================================
