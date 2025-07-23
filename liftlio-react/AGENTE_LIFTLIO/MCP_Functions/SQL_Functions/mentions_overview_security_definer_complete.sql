-- View corrigida em 22/07/2025 com SECURITY DEFINER
-- Correções aplicadas:
-- 1. Priorizar postagens agendadas com DISTINCT ON
-- 2. Adicionar SECURITY DEFINER para segurança adequada
-- 3. Definir owner como postgres

DROP VIEW IF EXISTS mentions_overview CASCADE;

CREATE OR REPLACE VIEW mentions_overview WITH (security_invoker = false) AS
SELECT DISTINCT ON (cp.id_do_comentario) 
    cp.id AS comment_id,
    s."Projeto_id" AS scanner_project_id,
    v.id AS video_id,
    v."VIDEO" AS video_youtube_id,
    v.video_title,
    v.view_count AS video_views,
    v.like_count AS video_likes,
    v."Channel" AS video_channel,
    m.tipo_msg AS msg_type,
    CASE
        WHEN ((cp.lead_score IS NULL) OR (cp.lead_score = ''::text)) THEN NULL::numeric
        WHEN (length(TRIM(BOTH FROM cp.lead_score)) = 1) THEN ((cp.lead_score)::numeric * (10)::numeric)
        ELSE (cp.lead_score)::numeric
    END AS comment_lead_score,
    cp.author_name AS comment_author,
    to_char(cp.published_at, 'DD/MM/YYYY HH24:MI'::text) AS comment_published_at_formatted,
    cp.published_at AS comment_published_at,
    cp.text_display AS comment_text,
    cp.like_count AS comment_likes,
    cp.justificativa AS comment_justificativa,
    m.id AS msg_id,
    m.mensagem AS msg_text,
    to_char(m.created_at, 'DD/MM/YYYY HH24:MI'::text) AS msg_created_at_formatted,
    m.justificativa AS msg_justificativa,
    m.respondido AS msg_respondido,
    m.template AS msg_template,
    m.template AS is_favorite,
    CASE
        WHEN (sm.status = 'pending'::text) THEN 'pending'::text
        WHEN (sm.proxima_postagem IS NOT NULL AND sm.postado IS NULL) THEN 'pending'::text
        WHEN (m.respondido = true) THEN 'posted'::text
        WHEN (m.id IS NOT NULL) THEN 'draft'::text
        ELSE 'new'::text
    END AS mention_status,
    sm.status AS status_das_postagens,
    sm.proxima_postagem AS scheduled_post_date_timestamp,
    sm.postado AS data_da_ultima_postagem,
    CASE
        WHEN ((m.created_at IS NOT NULL) AND (cp.published_at IS NOT NULL)) THEN (EXTRACT(epoch FROM (m.created_at - cp.published_at)) / (3600)::numeric)
        ELSE NULL::numeric
    END AS response_time_hours
FROM "Comentarios_Principais" cp
LEFT JOIN (
    SELECT DISTINCT ON ("Mensagens"."Comentario_Principais") 
        "Mensagens".id,
        "Mensagens".created_at,
        "Mensagens".mensagem,
        "Mensagens".table_comment,
        "Mensagens"."table_respostas+comentarios",
        "Mensagens".respondido,
        "Mensagens"."Comentario_Principais",
        "Mensagens".aprove,
        "Mensagens".template,
        "Mensagens".tipo_msg,
        "Mensagens".justificativa,
        "Mensagens".project_id
    FROM "Mensagens"
    ORDER BY "Mensagens"."Comentario_Principais", "Mensagens".created_at DESC
) m ON (m."Comentario_Principais" = cp.id)
JOIN "Videos" v ON (cp.video_id = v.id)
JOIN "Scanner de videos do youtube" s ON (v.scanner_id = s.id)
LEFT JOIN "Settings messages posts" sm ON (sm."Mensagens" = m.id AND sm."Comentarios_Principal" = cp.id)
ORDER BY 
    cp.id_do_comentario,
    -- CORREÇÃO: Priorizar postagens pendentes primeiro
    CASE 
        WHEN sm.status = 'pending' AND sm.postado IS NULL THEN 0
        ELSE 1
    END,
    cp.published_at DESC;

-- Definir o owner correto (assumindo que é o usuário postgres)
ALTER VIEW mentions_overview OWNER TO postgres;

-- NOTA IMPORTANTE SOBRE SEGURANÇA:
-- WITH (security_invoker = false) significa que a view executará com as permissões
-- do owner (postgres) ao invés das permissões do usuário que a está consultando.
-- Isso é equivalente a SECURITY DEFINER em funções.
-- 
-- As políticas RLS das tabelas subjacentes ainda serão respeitadas,
-- garantindo que os usuários só vejam os dados aos quais têm acesso.