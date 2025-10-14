-- =============================================
-- Função: get_video_data_for_analysis
-- Tipo: Helper Function (busca dados do vídeo)
--
-- Descrição:
--   Coleta todos os dados necessários para análise do vídeo com Claude AI.
--   Busca título, descrição, comentários (com respostas) e dados do projeto.
--
-- Entrada:
--   p_video_id TEXT - ID do vídeo no YouTube
--
-- Saída:
--   JSONB contendo:
--   - video_id: ID do YouTube
--   - video_title: Título do vídeo
--   - video_description: Descrição do vídeo
--   - comment_data: Array de comentários com respostas (limit 100)
--   - project_description: Descrição do projeto
--
-- Conexões:
--   → Chamada por: 04_analyze_video_with_claude (linha 23)
--
-- Criado: Data desconhecida
-- Atualizado: 2025-10-02 - Recuperado do Supabase e salvo localmente
-- =============================================

DROP FUNCTION IF EXISTS get_video_data_for_analysis(TEXT);

CREATE OR REPLACE FUNCTION public.get_video_data_for_analysis(p_video_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_video_record RECORD;
    v_project_description TEXT;
    v_result JSONB;
BEGIN
    -- Obter informações do vídeo, scanner e projeto em uma única consulta
    SELECT
        v."VIDEO",
        v."Channel",
        v."Keyword",
        v.video_description,
        v.video_title,  -- Adicionado o campo video_title
        p."description service"
    INTO v_video_record
    FROM "Videos" v
    JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
    JOIN "Projeto" p ON s."Projeto_id" = p.id
    WHERE v."VIDEO" = p_video_id;

    -- Coletar comentários principais e suas respostas
    WITH comments_data AS (
        SELECT
            jsonb_build_object(
                'text', cp.text_display,
                'likes', cp.like_count,
                'author', cp.author_name,
                'replies', COALESCE(
                    (SELECT jsonb_agg(
                        jsonb_build_object(
                            'text', rc.text_display,
                            'likes', rc.like_count,
                            'author', rc.author_name
                        )
                    )
                    FROM "Respostas_Comentarios" rc
                    WHERE rc.parent_comment_id = cp.id_do_comentario
                    ), '[]'::jsonb
                ),
                'comment_id', cp.id_do_comentario
            ) AS comment_obj
        FROM "Comentarios_Principais" cp
        WHERE cp.video_id = (SELECT id FROM "Videos" WHERE "VIDEO" = p_video_id)
        ORDER BY cp.published_at DESC
        LIMIT 100
    )
    SELECT jsonb_build_object(
        'video_id', v_video_record."VIDEO",
        'video_title', COALESCE(v_video_record.video_title, ''),  -- Modificado para usar o campo video_title
        'video_description', COALESCE(v_video_record.video_description, ''),
        'comment_data', COALESCE((SELECT jsonb_agg(comment_obj) FROM comments_data), '[]'::jsonb),
        'project_description', v_video_record."description service"
    ) INTO v_result;

    RETURN v_result;
END;
$function$
