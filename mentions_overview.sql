DROP VIEW IF EXISTS mentions_overview;

CREATE OR REPLACE VIEW mentions_overview 
WITH (security_invoker = true) 
AS
WITH base_data AS (
    SELECT DISTINCT ON (cp.id_do_comentario)  
        -- Identificação e Projeto
        cp.id AS comment_id,
        s."Projeto_id" AS scanner_project_id,
        
        -- Informações do Comentário
        cp.id_do_comentario AS comment_youtube_id,
        cp.text_display AS comment_text,
        cp.text_original AS comment_text_original,
        cp.author_name AS comment_author,
        cp.author_channel_id AS comment_author_channel_id,
        cp.published_at AS comment_published_at,
        to_char(cp.published_at, 'DD/MM/YYYY HH24:MI') AS comment_published_at_formatted,
        cp.updated_at AS comment_updated_at,
        cp.like_count AS comment_likes,
        cp.total_reply_count AS comment_reply_count,
        
        -- Análise do Comentário - CORREÇÃO DO LEAD SCORE
        CASE 
            WHEN cp.lead_score IS NULL OR cp.lead_score = '' THEN NULL
            WHEN LENGTH(TRIM(cp.lead_score)) = 1 THEN CAST(cp.lead_score AS NUMERIC) * 10
            ELSE CAST(cp.lead_score AS NUMERIC)
        END AS comment_lead_score,
        cp.led AS comment_is_lead,
        cp.comentario_analizado AS comment_analyzed,
        'neutral' AS comment_sentiment,
        0 AS comment_sentiment_score,
        'none' AS comment_intent,
        
        -- Informações da Mensagem/Resposta
        m.id AS msg_id,
        m.mensagem AS msg_text,
        m.created_at AS msg_created_at,
        to_char(m.created_at, 'DD/MM/YYYY HH24:MI') AS msg_created_at_formatted,
        m.created_at AS msg_updated_at,
        m.respondido AS msg_is_approved,
        m.aprove AS msg_aprove,
        m.respondido AS msg_respondido,
        m.template AS msg_template,
        m.tipo_msg AS msg_type,
        CASE
            WHEN (m.id IS NULL) THEN 'Aguardando Mensagem'::text
            WHEN (m.respondido IS NULL) THEN 'Aguardando Aprovação'::text
            WHEN (m.respondido = false) THEN 'Mensagem Rejeitada'::text
            WHEN (m.respondido = true) THEN 'Mensagem Aprovada'::text
            ELSE NULL::text
        END AS msg_status,
        
        -- Favoritos (usando template como indicador)
        m.template AS is_favorite,
        CASE WHEN m.template = true THEN m.created_at ELSE NULL END AS favorite_date,
        NULL AS favorite_user_id,
        
        -- Dados do Vídeo
        v.id AS video_id,
        v."VIDEO" AS video_youtube_id,
        v.title AS video_title,
        v.description AS video_description,
        v."Channel" AS video_channel,
        v.view_count AS video_views,
        v.like_count AS video_likes,
        v.comment_count AS video_comments,
        v.tags AS video_tags,
        v.content_category AS video_category,
        v.sentiment_analysis AS video_sentiment,
        v.key_topics AS video_topics,
        v.engagement_potential AS video_engagement,
        
        -- Dados de Agendamento
        to_char(smp.proxima_postagem, 'DD/MM/YYYY HH24:MI') AS scheduled_post_date,
        smp.proxima_postagem AS scheduled_post_date_timestamp,
        NULL AS scheduled_by_user_id,
        'Sistema' AS scheduled_by_user_name,
        
        -- Dados de Publicação
        CASE WHEN m.respondido = true THEN m.created_at ELSE NULL END AS published_date,
        NULL AS published_by_user_id,
        NULL AS published_youtube_id,
        
        -- Campos Calculados
        CASE
            WHEN smp.proxima_postagem IS NOT NULL THEN 'scheduled'
            WHEN m.respondido = true THEN 'posted'
            WHEN m.id IS NOT NULL THEN 'draft'
            ELSE 'new'
        END AS mention_status,
        
        -- Métricas temporais
        EXTRACT(DAY FROM (NOW() - cp.published_at)) AS mention_age_days,
        CASE WHEN m.respondido = true AND m.created_at IS NOT NULL 
             THEN EXTRACT(HOUR FROM (m.created_at - cp.published_at)) 
             ELSE NULL 
        END AS response_time_hours,
        
        -- Pontuação de prioridade usando o novo lead_score corrigido
        (COALESCE(CASE 
            WHEN cp.lead_score IS NULL OR cp.lead_score = '' THEN NULL
            WHEN LENGTH(TRIM(cp.lead_score)) = 1 THEN CAST(cp.lead_score AS NUMERIC) * 10
            ELSE CAST(cp.lead_score AS NUMERIC)
        END, 0) * 2 + 
         COALESCE(v.relevance_score, 0) + 
         CASE WHEN cp.like_count > 10 THEN 5 ELSE COALESCE(cp.like_count, 0) / 2 END) AS priority_score,
         
        -- Score composto do vídeo
        ((COALESCE(v.relevance_score, 0::double precision) * 0.3::double precision) + 
         (COALESCE(v.trending_score, 0::double precision) * 0.3::double precision) + 
         (CASE WHEN v.evergreen_potential THEN 0.2 ELSE 0::numeric END)::double precision + 
         (CASE WHEN v.engagement_potential = 'High'::text THEN 0.2
               WHEN v.engagement_potential = 'Medium'::text THEN 0.1
               ELSE 0::numeric END)::double precision) AS video_composite_score
         
    FROM (
        SELECT DISTINCT ON (id_do_comentario) *
        FROM "Comentarios_Principais"
        ORDER BY id_do_comentario, published_at DESC
    ) cp
    LEFT JOIN (
        SELECT DISTINCT ON ("Comentario_Principais") *  
        FROM "Mensagens"
        ORDER BY "Comentario_Principais", created_at DESC
    ) m ON m."Comentario_Principais" = cp.id
    JOIN "Videos" v ON cp.video_id = v.id
    JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
    LEFT JOIN "Settings messages posts" smp ON smp."Mensagens" = m.id AND smp."Comentarios_Principal" = cp.id
    
    ORDER BY cp.id_do_comentario
)
SELECT 
    -- Identificação e Projeto
    comment_id,
    scanner_project_id,
    
    -- Informações do Comentário
    comment_youtube_id,
    comment_text,
    comment_text_original,
    comment_author,
    comment_author_channel_id,
    comment_published_at,
    comment_published_at_formatted,
    comment_updated_at,
    comment_likes,
    comment_reply_count,
    reply_count,
    
    -- Análise do Comentário
    comment_is_lead,
    comment_lead_score,
    comment_sentiment,
    comment_sentiment_score,
    comment_intent,
    comment_analyzed,
    
    -- Favoritos
    is_favorite,
    favorite_date,
    
    -- Informações da Mensagem/Resposta
    msg_id,
    msg_text,
    msg_created_at,
    msg_created_at_formatted,
    msg_updated_at,
    msg_is_approved,
    msg_aprove,
    msg_respondido,
    msg_template,
    msg_type,
    msg_status,
    
    -- Informações do Vídeo
    video_id,
    video_youtube_id,
    video_title,
    video_description,
    video_channel,
    video_views,
    video_likes,
    video_comments,
    video_tags,
    video_category,
    video_sentiment,
    video_topics,
    video_engagement,
    
    -- Dados de Agendamento
    scheduled_post_date,
    scheduled_post_date_timestamp,
    
    -- Informações de Publicação
    published_date,
    
    -- Campos Calculados
    mention_status,
    mention_age_days,
    response_time_hours,
    priority_score,
    video_composite_score
FROM base_data
ORDER BY 
    -- Ordenação personalizada para a interface de Mentions
    CASE 
        WHEN mention_status = 'scheduled' THEN 1
        WHEN mention_status = 'draft' THEN 2
        WHEN mention_status = 'new' THEN 3
        WHEN mention_status = 'posted' THEN 4
        ELSE 5
    END,
    scheduled_post_date_timestamp DESC NULLS LAST,
    priority_score DESC,
    comment_published_at DESC;
