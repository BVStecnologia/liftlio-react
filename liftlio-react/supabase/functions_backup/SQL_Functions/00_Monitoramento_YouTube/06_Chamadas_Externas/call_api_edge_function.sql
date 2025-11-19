-- =============================================
-- Função: call_api_edge_function
-- Atualizado: 2025-01-18 (SINCRONIZADO 100% COM LIVE)
-- =============================================

DROP FUNCTION IF EXISTS public.call_api_edge_function(text);

CREATE OR REPLACE FUNCTION public.call_api_edge_function(input_value text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_canal_id BIGINT;
    v_projeto_id BIGINT;
    v_video_ids_text TEXT;
    v_video_ids_array TEXT[];
    v_video_id TEXT;
    v_nome_produto TEXT;
    v_descricao_produto TEXT;
    v_metadata JSONB;
    v_video_item JSONB;
    v_duration_iso TEXT;
    v_duration_seconds INT;
    v_title TEXT;
    v_description TEXT;
    v_channel_title TEXT;
    v_transcript TEXT;
    v_claude_prompt TEXT;
    v_claude_response TEXT;
    v_resultado JSONB;
    v_resultados_array JSONB := '[]'::JSONB;
    v_hours INT;
    v_minutes INT;
    v_seconds INT;
BEGIN
    v_canal_id := input_value::BIGINT;
    RAISE NOTICE 'Processando canal: %', v_canal_id;

    SELECT
        c."Projeto",
        c.videos_para_scann,
        p."Project name",
        p."description service"
    INTO
        v_projeto_id,
        v_video_ids_text,
        v_nome_produto,
        v_descricao_produto
    FROM "Canais do youtube" c
    JOIN "Projeto" p ON p.id = c."Projeto"
    WHERE c.id = v_canal_id;

    IF v_video_ids_text IS NULL OR v_video_ids_text = '' THEN
        RETURN jsonb_build_object('call_api_edge_function', jsonb_build_object('text', '[]'::jsonb));
    END IF;

    v_video_ids_array := string_to_array(v_video_ids_text, ',');

    FOREACH v_video_id IN ARRAY v_video_ids_array LOOP
        v_video_id := TRIM(v_video_id);

        BEGIN
            v_metadata := get_youtube_video_stats(
                project_id := v_projeto_id::INTEGER,
                video_ids := v_video_id,
                parts := 'snippet,contentDetails'
            );

            v_video_item := v_metadata->'items'->0;

            IF v_video_item IS NULL THEN
                v_resultado := jsonb_build_object('id', v_video_id, 'status', 'REJECTED', 'motivo', 'Metadados nao disponiveis', 'reason', 'Metadata unavailable', 'score', 0.0);
                v_resultados_array := v_resultados_array || jsonb_build_array(v_resultado);
                CONTINUE;
            END IF;

            v_duration_iso := v_video_item->'contentDetails'->>'duration';
            v_title := v_video_item->'snippet'->>'title';
            v_description := v_video_item->'snippet'->>'description';
            v_channel_title := v_video_item->'snippet'->>'channelTitle';

            v_hours := 0; v_minutes := 0; v_seconds := 0;

            IF v_duration_iso ~ '\d+H' THEN v_hours := substring(v_duration_iso from '(\d+)H')::INT; END IF;
            IF v_duration_iso ~ '\d+M' THEN v_minutes := substring(v_duration_iso from '(\d+)M')::INT; END IF;
            IF v_duration_iso ~ '\d+S' THEN v_seconds := substring(v_duration_iso from '(\d+)S')::INT; END IF;

            v_duration_seconds := (v_hours * 3600) + (v_minutes * 60) + v_seconds;

            IF v_duration_seconds < 60 THEN
                v_resultado := jsonb_build_object('id', v_video_id, 'status', 'REJECTED', 'motivo', format('Muito curto (%ss)', v_duration_seconds), 'reason', format('Too short (%ss)', v_duration_seconds), 'score', 0.0);
                v_resultados_array := v_resultados_array || jsonb_build_array(v_resultado);
                CONTINUE;
            END IF;

            IF v_duration_seconds > 1800 THEN
                v_resultado := jsonb_build_object('id', v_video_id, 'status', 'REJECTED', 'motivo', format('Muito longo (%smin)', v_duration_seconds / 60), 'reason', format('Too long (%smin)', v_duration_seconds / 60), 'score', 0.0);
                v_resultados_array := v_resultados_array || jsonb_build_array(v_resultado);
                CONTINUE;
            END IF;

            v_transcript := youtube_transcribe(v_video_id);

            IF v_transcript IS NULL OR LENGTH(v_transcript) < 100 THEN
                v_resultado := jsonb_build_object('id', v_video_id, 'status', 'REJECTED', 'motivo', 'Sem transcricao', 'reason', 'No transcript', 'score', 0.0);
                v_resultados_array := v_resultados_array || jsonb_build_array(v_resultado);
                CONTINUE;
            END IF;

            v_claude_prompt := format('Analise este video do YouTube para relevancia.\n\nCRITERIO:\nAprovar se discute problemas, desafios ou necessidades onde mencionar solucao seria NATURAL.\n\nAPROVAR:\n- Discute problemas/desafios\n- Explora ferramentas/solucoes\n- Tutorial/review/comparacao\n- Publico busca solucoes\n\nREJEITAR:\n- Entretenimento puro\n- Mencionar produto seria spam\n\nSCORING (0-100):\nA. Contexto relevante (0-40)\nB. Fit do produto (0-40)\nC. Qualidade (0-20)\n\n70-100=APPROVED, 50-69=APPROVED, 0-49=REJECTED\n\nJSON (sem markdown):\n{\n  \"status\": \"APPROVED\" ou \"REJECTED\",\n  \"motivo\": \"PT-BR max 100 chars\",\n  \"reason\": \"EN max 100 chars\",\n  \"score\": 0.85\n}\n\nPRODUTO: %s\nDESCRICAO: %s\n\nVIDEO:\nID: %s\nTitulo: %s\nCanal: %s\nDescricao: %s\n\nTRANSCRICAO (5min):\n%s',
                v_nome_produto,
                v_descricao_produto,
                v_video_id,
                v_title,
                v_channel_title,
                LEFT(COALESCE(v_description, ''), 300),
                LEFT(v_transcript, 6000)
            );

            v_claude_response := claude_haiku(
                user_prompt := v_claude_prompt,
                system_prompt := 'Especialista em analise de relevancia. Retorne APENAS JSON, sem markdown.',
                max_tokens := 500,
                temperature := 0.7
            );

            BEGIN
                v_claude_response := regexp_replace(v_claude_response, '^```json\s*', '', 'g');
                v_claude_response := regexp_replace(v_claude_response, '\s*```$', '', 'g');
                v_claude_response := TRIM(v_claude_response);
                v_resultado := v_claude_response::JSONB;
                v_resultado := jsonb_build_object('id', v_video_id) || v_resultado;
            EXCEPTION WHEN OTHERS THEN
                v_resultado := jsonb_build_object('id', v_video_id, 'status', 'REJECTED', 'motivo', 'Erro JSON', 'reason', 'Parse error', 'score', 0.0);
            END;

            v_resultados_array := v_resultados_array || jsonb_build_array(v_resultado);

        EXCEPTION WHEN OTHERS THEN
            v_resultado := jsonb_build_object('id', v_video_id, 'status', 'REJECTED', 'motivo', 'Erro processamento', 'reason', 'Error', 'score', 0.0);
            v_resultados_array := v_resultados_array || jsonb_build_array(v_resultado);
        END;
    END LOOP;

    RETURN jsonb_build_object('call_api_edge_function', jsonb_build_object('text', v_resultados_array));

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM, 'call_api_edge_function', jsonb_build_object('text', '[]'::jsonb));
END;
$function$;
