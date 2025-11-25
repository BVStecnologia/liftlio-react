-- =============================================
-- Função: get_next_scanner_to_process
-- Descrição: Retorna próximo scanner a processar (rotação circular)
-- Criado: 2025-11-14
-- =============================================

DROP FUNCTION IF EXISTS get_next_scanner_to_process(BIGINT);

CREATE OR REPLACE FUNCTION public.get_next_scanner_to_process(project_id_param BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_ultimo_scanner_id BIGINT;
    v_proximo_scanner_id BIGINT;
BEGIN
    -- 1. Buscar último scanner que COMPLETOU todos seus vídeos
    SELECT DISTINCT scanner_id INTO v_ultimo_scanner_id
    FROM pipeline_processing pp
    WHERE pp.project_id = project_id_param
      AND NOT EXISTS (
          -- Não tem nenhum vídeo incompleto
          SELECT 1 FROM pipeline_processing pp2
          WHERE pp2.scanner_id = pp.scanner_id
            AND pp2.pipeline_completo = FALSE
      )
    ORDER BY MAX(pp.pipeline_completo_at) DESC
    LIMIT 1;

    -- 2. Se não encontrou (primeira vez ou nenhum scanner completou), pegar primeiro scanner
    IF v_ultimo_scanner_id IS NULL THEN
        SELECT id INTO v_proximo_scanner_id
        FROM "Scanner de videos do youtube"
        WHERE "Projeto_id" = project_id_param
          AND "Ativa?" = TRUE
        ORDER BY id
        LIMIT 1;

        RETURN v_proximo_scanner_id;
    END IF;

    -- 3. Buscar PRÓXIMO scanner (circular)
    WITH scanners_ativos AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY id) as posicao
        FROM "Scanner de videos do youtube"
        WHERE "Projeto_id" = project_id_param
          AND "Ativa?" = TRUE
    )
    SELECT id INTO v_proximo_scanner_id
    FROM scanners_ativos
    WHERE posicao > (
        SELECT posicao FROM scanners_ativos WHERE id = v_ultimo_scanner_id
    )
    ORDER BY posicao
    LIMIT 1;

    -- 4. Se não encontrou (chegou no último), volta pro primeiro (CIRCULAR!)
    IF v_proximo_scanner_id IS NULL THEN
        SELECT id INTO v_proximo_scanner_id
        FROM "Scanner de videos do youtube"
        WHERE "Projeto_id" = project_id_param
          AND "Ativa?" = TRUE
        ORDER BY id
        LIMIT 1;
    END IF;

    RETURN v_proximo_scanner_id;
END;
$function$;

-- =============================================
-- COMENTÁRIOS
-- =============================================
-- Rotação Circular de Scanners
--
-- Esta função implementa rotação circular AUTOMÁTICA:
-- 1. Busca último scanner que completou TODOS vídeos
-- 2. Retorna próximo scanner na lista
-- 3. Quando chega no último, volta pro primeiro
--
-- EXEMPLO:
-- Projeto 117 tem scanners: [584, 585, 586]
--
-- Primeira execução:
-- SELECT get_next_scanner_to_process(117);
-- → Retorna: 584 (primeiro scanner ativo)
--
-- Após scanner 584 completar todos vídeos:
-- SELECT get_next_scanner_to_process(117);
-- → Retorna: 585 (próximo)
--
-- Após scanner 585 completar:
-- SELECT get_next_scanner_to_process(117);
-- → Retorna: 586 (próximo)
--
-- Após scanner 586 completar:
-- SELECT get_next_scanner_to_process(117);
-- → Retorna: 584 (volta pro primeiro - CIRCULAR!)
--
-- NOTA IMPORTANTE:
-- - Só considera scanners com "Ativa?" = TRUE
-- - Ordem é por ID (sempre mesma sequência)
-- - Um scanner só é considerado "completo" quando TODOS seus vídeos
--   tiverem pipeline_completo = TRUE
--
-- USO:
-- SELECT get_next_scanner_to_process(117);
-- =============================================
