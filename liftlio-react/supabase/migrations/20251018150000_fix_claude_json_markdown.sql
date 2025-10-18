-- =============================================
-- Migration: Fix Claude JSON Markdown Wrapper
-- Data: 2025-10-18
-- Problema: claude_complete retorna JSON envolto em ```json...```
--           causando erro "invalid input syntax for type json"
-- Solução: Adicionar limpeza de markdown antes de parsear JSON
-- =============================================

CREATE OR REPLACE FUNCTION public.process_engagement_comments_with_claude(p_project_id integer, p_limit integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_comments JSONB;
    v_claude_response TEXT;
    v_cleaned_response TEXT;
    v_prompt TEXT;
    v_project_country TEXT;
    v_template_messages TEXT;
    v_transcript TEXT;
    v_project_name TEXT;
    v_project_description TEXT;
    v_project_keywords TEXT;
    v_product_name TEXT;
    v_result JSONB;
    v_user_liked_examples TEXT;
    v_user_special_instructions TEXT;
    v_video_comment_count INTEGER;
    v_max_product_mentions INTEGER;
    v_product_mention_count INTEGER;
    v_validation_msg TEXT;
BEGIN
    SELECT CASE WHEN LENGTH(vt.trancription) > 15000 THEN LEFT(vt.trancription, 15000) || '... [truncated]' ELSE vt.trancription END INTO v_transcript FROM "Comentarios_Principais" cp JOIN "Videos" v ON v.id = cp.video_id LEFT JOIN "Videos_trancricao" vt ON vt.id = v.transcript WHERE cp.project_id = p_project_id AND cp.mensagem = false AND vt.trancription IS NOT NULL LIMIT 1;
    IF v_transcript IS NULL THEN RAISE NOTICE 'No transcript'; RETURN NULL; END IF;
    WITH project_data AS (SELECT "País", COALESCE(SUBSTRING("description service" FROM 'Company or product name: ([^,]+)'), "Project name") as product_name, "description service", "Keywords", prompt_user FROM "Projeto" WHERE id = p_project_id) SELECT "País", product_name, "description service", "Keywords", prompt_user INTO v_project_country, v_product_name, v_project_description, v_project_keywords, v_user_special_instructions FROM project_data;
    WITH primeiro_comentario AS (SELECT cp.video_id FROM "Comentarios_Principais" cp WHERE cp.project_id = p_project_id AND cp.mensagem = false ORDER BY cp.id LIMIT 1), video_info AS (SELECT v.id AS video_id, v."VIDEO" AS youtube_video_id, v.video_title, v.video_description, v.video_tags, v.content_category, vt.trancription, (SELECT COUNT(*) FROM "Comentarios_Principais" cp2 WHERE cp2.video_id = v.id) as total_comments FROM primeiro_comentario pc JOIN "Videos" v ON v.id = pc.video_id LEFT JOIN "Videos_trancricao" vt ON vt.id = v.transcript LIMIT 1) SELECT vi.total_comments, jsonb_agg(jsonb_build_object('comment_id', cp.id_do_comentario, 'author_name', cp.author_name, 'text_display', cp.text_display, 'video_id', vi.video_id, 'video_title', vi.video_title, 'video_description', vi.video_description, 'cp_id', cp.id, 'is_lead', CASE WHEN cp.lead_score IS NOT NULL AND cp.lead_score != '' THEN true ELSE false END) ORDER BY CASE WHEN cp.lead_score IS NOT NULL AND cp.lead_score != '' THEN 0 ELSE 1 END, cp.id) INTO v_video_comment_count, v_comments FROM "Comentarios_Principais" cp CROSS JOIN video_info vi WHERE cp.video_id = vi.video_id AND cp.mensagem = false GROUP BY vi.total_comments LIMIT p_limit;
    IF v_comments IS NULL THEN RAISE NOTICE 'No comments'; RETURN NULL; END IF;
    v_max_product_mentions := CASE WHEN v_video_comment_count < 30 THEN 1 WHEN v_video_comment_count < 100 THEN 2 WHEN v_video_comment_count < 500 THEN 5 WHEN v_video_comment_count < 1000 THEN 8 ELSE 10 END;
    SELECT string_agg(mensagem, E'\\n') INTO v_template_messages FROM (SELECT mensagem FROM "Mensagens" WHERE tipo_msg = 2 AND template = true ORDER BY created_at DESC LIMIT 10) t;
    v_prompt := format('YouTube user creating responses. Video: %s comments, mention %s max %s times. Product: %s - %s. Video title: %s. Transcript: %s. Comments: %s. Language: %s. Response format: [{"comment_id":"ID","response":"text","tipo_resposta":"produto|engajamento","justificativa":"..."}]', v_video_comment_count, v_product_name, v_max_product_mentions, v_product_name, v_project_description, replace(v_comments->0->>'video_title','"',''''), COALESCE(v_transcript,'N/A'), (SELECT string_agg(format('Comment %s: %s (Lead: %s)', c->>'comment_id', replace(c->>'text_display','"',''''), c->>'is_lead'), E'\\n') FROM jsonb_array_elements(v_comments) c), COALESCE(v_project_country,'Português'));
    SELECT claude_complete(v_prompt, format('Regular YouTube viewer. Include timestamps, JSON only. Language: %s. Limit: %s mentions', COALESCE(v_project_country,'Português'), v_max_product_mentions), 4000, 0.7) INTO v_claude_response;
    IF v_claude_response IS NULL THEN RAISE NOTICE 'Claude NULL'; RETURN NULL; END IF;

    -- ============================================
    -- FIX: Limpar markdown code blocks antes de parsear JSON
    -- ============================================
    -- Remove ```json e ``` no início/fim da resposta
    v_cleaned_response := TRIM(v_claude_response);
    v_cleaned_response := REGEXP_REPLACE(v_cleaned_response, '^```json\s*', '', 'i');
    v_cleaned_response := REGEXP_REPLACE(v_cleaned_response, '^```\s*', '', 'i');
    v_cleaned_response := REGEXP_REPLACE(v_cleaned_response, '\s*```$', '', 'i');
    v_cleaned_response := TRIM(v_cleaned_response);

    RAISE NOTICE 'Original response length: %, Cleaned length: %', LENGTH(v_claude_response), LENGTH(v_cleaned_response);

    BEGIN
        v_result := v_cleaned_response::JSONB;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'JSON error after cleaning: %', SQLERRM;
        RAISE NOTICE 'Cleaned response: %', LEFT(v_cleaned_response, 500);
        RETURN jsonb_build_object('error', SQLERRM);
    END;

    WITH claude_json AS (SELECT jsonb_array_elements(v_result) AS element), enriched_elements AS (SELECT jsonb_build_object('comment_id', element->>'comment_id', 'response', element->>'response', 'tipo_resposta', element->>'tipo_resposta', 'justificativa', element->>'justificativa', 'video_id', (SELECT c->>'video_id' FROM jsonb_array_elements(v_comments) c WHERE c->>'comment_id' = element->>'comment_id' LIMIT 1), 'cp_id', (SELECT c->>'cp_id' FROM jsonb_array_elements(v_comments) c WHERE c->>'comment_id' = element->>'comment_id' LIMIT 1), 'project_id', p_project_id, 'video_comment_count', v_video_comment_count, 'max_product_mentions', v_max_product_mentions) AS enriched FROM claude_json) SELECT jsonb_agg(enriched) INTO v_result FROM enriched_elements;
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Error: % %', SQLERRM, SQLSTATE; RETURN jsonb_build_object('error', SQLERRM);
END;
$function$;
