-- =============================================
-- Função: atualizar_comentarios_analisados
-- Descrição: Atualiza comentários com análise do Claude
-- Dependência de: process_comment_analysis_batch
-- Criado: 2025-01-27
-- =============================================

DROP FUNCTION IF EXISTS atualizar_comentarios_analisados(integer);

CREATE OR REPLACE FUNCTION public.atualizar_comentarios_analisados(p_project_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_resultado_claude TEXT;
    v_json_resultado JSONB;
    v_comentario JSONB;
    v_atualizados INTEGER := 0;
    v_rows_affected INTEGER;
    v_total_processados INTEGER := 0;
    v_nao_atualizados TEXT := '';
BEGIN
    -- Chamar a função de análise
    SELECT analisar_comentarios_com_claude(p_project_id) INTO v_resultado_claude;

    -- Verificar se o resultado é nulo ou vazio
    IF v_resultado_claude IS NULL OR v_resultado_claude = '' THEN
        RETURN 'A função analisar_comentarios_com_claude retornou um resultado nulo ou vazio';
    END IF;

    -- Limpar markdown fence antes de converter
    v_resultado_claude := regexp_replace(v_resultado_claude, '^\s*```json\s*|\s*```\s*$', '', 'g');
    v_resultado_claude := trim(v_resultado_claude);

    -- Converter o resultado para JSONB
    BEGIN
        v_json_resultado := v_resultado_claude::JSONB;
    EXCEPTION WHEN OTHERS THEN
        RETURN 'Erro ao converter o resultado para JSONB: ' || v_resultado_claude;
    END;

    -- Verificar se o JSON resultante é um array
    IF jsonb_typeof(v_json_resultado) != 'array' THEN
        RETURN 'O resultado não é um array JSON válido: ' || v_json_resultado::text;
    END IF;

    -- Iterar sobre cada comentário no resultado
    FOR v_comentario IN SELECT jsonb_array_elements(v_json_resultado)
    LOOP
        v_total_processados := v_total_processados + 1;
        BEGIN
            -- Atualizar a tabela Comentarios_Principais
            UPDATE public."Comentarios_Principais"
            SET
                comentario_analizado = TRUE,
                led = CASE
                    WHEN v_comentario->>'lead' = 'true' OR (v_comentario->>'lead')::BOOLEAN = TRUE THEN TRUE
                    WHEN v_comentario->>'lead' = 'yes' THEN TRUE -- Para compatibilidade retroativa
                    ELSE FALSE
                END,
                lead_score = (v_comentario->>'lead_score')::TEXT,
                justificativa = v_comentario->>'justificativa'
            WHERE id = COALESCE((v_comentario->>'comment_id')::BIGINT, (v_comentario->>'comentario_id')::BIGINT);

            GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
            v_atualizados := v_atualizados + v_rows_affected;

            IF v_rows_affected = 0 THEN
                v_nao_atualizados := v_nao_atualizados || 'Comentário não atualizado: ' || v_comentario::text || '; ';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_nao_atualizados := v_nao_atualizados || 'Erro ao atualizar comentário: ' || SQLERRM || '; ';
        END;
    END LOOP;

    -- Retornar um resumo das operações
    RETURN 'Processados: ' || v_total_processados || ', Atualizados: ' || v_atualizados ||
           ', Não atualizados: ' || (v_total_processados - v_atualizados) || '. Detalhes: ' || v_nao_atualizados;
END;
$function$