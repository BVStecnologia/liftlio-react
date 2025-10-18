-- =============================================
-- Migration: Fix atualizar_comentarios_analisados logging
-- Data: 2025-10-17 17:00
-- Problema: Função não está mostrando claramente por que comentários não são atualizados
-- Solução: Melhorar logging para mostrar se ID não existe ou se houve outro erro
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
    v_comentario_id BIGINT;
BEGIN
    -- Chamar a função de análise
    SELECT analisar_comentarios_com_claude(p_project_id) INTO v_resultado_claude;

    -- Verificar se o resultado é nulo ou vazio
    IF v_resultado_claude IS NULL OR v_resultado_claude = '' THEN
        RETURN 'A função analisar_comentarios_com_claude retornou um resultado nulo ou vazio';
    END IF;

    -- Limpar qualquer markdown fence, whitespace e caracteres de controle
    v_resultado_claude := regexp_replace(v_resultado_claude, '^\s*```json\s*', '', 'g');
    v_resultado_claude := regexp_replace(v_resultado_claude, '\s*```\s*$', '', 'g');
    v_resultado_claude := trim(both E'\n\r\t ' from v_resultado_claude);

    -- Remover possível BOM (Byte Order Mark) ou caracteres invisíveis
    v_resultado_claude := regexp_replace(v_resultado_claude, '^\uFEFF', '');

    -- Converter o resultado para JSONB
    BEGIN
        v_json_resultado := v_resultado_claude::JSONB;
    EXCEPTION WHEN OTHERS THEN
        -- Retornar apenas os primeiros 500 caracteres do erro para evitar overflow
        RETURN 'Erro ao converter o resultado para JSONB. Primeiros 500 chars: ' ||
               left(v_resultado_claude, 500) || '... [truncado]. Erro: ' || SQLERRM;
    END;

    -- Verificar se o JSON resultante é um array
    IF jsonb_typeof(v_json_resultado) != 'array' THEN
        RETURN 'O resultado não é um array JSON válido. Tipo: ' ||
               jsonb_typeof(v_json_resultado) || '. Primeiros 500 chars: ' ||
               left(v_json_resultado::text, 500);
    END IF;

    -- Iterar sobre cada comentário no resultado
    FOR v_comentario IN SELECT jsonb_array_elements(v_json_resultado)
    LOOP
        v_total_processados := v_total_processados + 1;

        -- Extrair ID do comentário
        v_comentario_id := COALESCE(
            (v_comentario->>'comment_id')::BIGINT,
            (v_comentario->>'comentario_id')::BIGINT
        );

        BEGIN
            -- Atualizar a tabela Comentarios_Principais
            UPDATE public."Comentarios_Principais"
            SET
                comentario_analizado = TRUE,
                led = CASE
                    WHEN v_comentario->>'lead' = 'true' OR (v_comentario->>'lead')::BOOLEAN = TRUE THEN TRUE
                    WHEN v_comentario->>'lead' = 'yes' THEN TRUE
                    ELSE FALSE
                END,
                lead_score = (v_comentario->>'lead_score')::TEXT,
                justificativa = v_comentario->>'justificativa'
            WHERE id = v_comentario_id;

            GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
            v_atualizados := v_atualizados + v_rows_affected;

            IF v_rows_affected = 0 THEN
                -- ✅ MUDANÇA: Log mais claro mostrando apenas o ID
                v_nao_atualizados := v_nao_atualizados ||
                    'ID ' || COALESCE(v_comentario_id::TEXT, 'NULL') || ' não existe na tabela; ';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- ✅ MUDANÇA: Log de erro com ID e mensagem
            v_nao_atualizados := v_nao_atualizados ||
                'ID ' || COALESCE(v_comentario_id::TEXT, 'NULL') || ' erro: ' || SQLERRM || '; ';
        END;
    END LOOP;

    -- Retornar um resumo das operações
    RETURN 'Processados: ' || v_total_processados || ', Atualizados: ' || v_atualizados ||
           ', Não atualizados: ' || (v_total_processados - v_atualizados) ||
           CASE WHEN v_nao_atualizados != '' THEN '. Detalhes: ' || v_nao_atualizados ELSE '' END;
END;
$function$;

-- Log de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 20251017170000 aplicada com sucesso!';
    RAISE NOTICE 'Logging melhorado em atualizar_comentarios_analisados';
    RAISE NOTICE 'Agora mostra claramente quais IDs não existem na tabela';
END $$;
