-- =============================================
-- Função: update_video_analysis
-- Descrição: Analisa vídeo com Claude e atualiza campos de análise
-- Dependência de: process_video_analysis_batch
-- Criado: 2025-01-27
-- =============================================

CREATE OR REPLACE FUNCTION public.update_video_analysis(video_id bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    video_youtube_id text;
    analysis_result jsonb;
BEGIN
    -- Obter o ID do YouTube do vídeo
    SELECT "VIDEO" INTO video_youtube_id
    FROM public."Videos"
    WHERE id = video_id;

    -- Chamar a função de análise do Claude
    SELECT analyze_video_with_claude(video_youtube_id) INTO analysis_result;

    -- Atualizar os campos na tabela Videos
    UPDATE public."Videos"
    SET
        is_relevant = (analysis_result->>'is_relevant')::boolean,
        relevance_reason = analysis_result->>'relevance_reason',
        relevance_score = (analysis_result->>'relevance_score')::double precision,
        content_category = analysis_result->>'content_category',
        sentiment_analysis = analysis_result->'sentiment_analysis',
        key_topics = (SELECT array_agg(value::text) FROM jsonb_array_elements_text(analysis_result->'key_topics')),
        engagement_potential = analysis_result->>'engagement_potential',
        target_audience = analysis_result->>'target_audience',
        lead_potential = analysis_result->>'lead_potential',
        recommended_actions = (SELECT array_agg(value::text) FROM jsonb_array_elements_text(analysis_result->'recommended_actions')),
        ai_analysis_summary = analysis_result->>'ai_analysis_summary',
        ai_analysis_timestamp = CURRENT_TIMESTAMP,
        trending_score = (analysis_result->>'trending_score')::double precision,
        evergreen_potential = (analysis_result->>'evergreen_potential')::boolean
    WHERE id = video_id;

    -- Log da atualização
    RAISE NOTICE 'Video analysis updated for ID: %', video_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating video analysis for ID %: % %', video_id, SQLERRM, SQLSTATE;
END;
$function$