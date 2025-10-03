-- =============================================
-- Função: atualizar_comentarios_analisados
-- Descrição: Atualiza comentários com análise do Claude
-- Dependência de: process_comment_analysis_batch
-- Criado: 2025-01-27
-- =============================================

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

    -- Converter o resultado para JSONB
    BEGIN
        v_json_resultado := v_resultado_claude::JSONB;
    EXCEPTION WHEN OTHERS THEN
        RETURN format('Erro ao converter o resultado para JSONB: %', v_resultado_claude);
    END;

    -- Verificar se o JSON resultante é um array
    IF jsonb_typeof(v_json_resultado) != 'array' THEN
        RETURN format('O resultado não é um array JSON válido: %', v_json_resultado);
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
                v_nao_atualizados := v_nao_atualizados || format('Comentário não atualizado: %s; ', v_comentario);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_nao_atualizados := v_nao_atualizados || format('Erro ao atualizar comentário %s: %s; ', v_comentario, SQLERRM);
        END;
    END LOOP;

    -- Retornar um resumo das operações
    RETURN format('Processados: %s, Atualizados: %s, Não atualizados: %s. Detalhes: %s',
                  v_total_processados, v_atualizados, v_total_processados - v_atualizados, v_nao_atualizados);
END;
$function$