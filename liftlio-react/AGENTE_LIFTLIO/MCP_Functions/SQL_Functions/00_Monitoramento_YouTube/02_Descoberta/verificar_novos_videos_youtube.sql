-- =============================================
-- Função: verificar_novos_videos_youtube
-- Descrição: Verifica e processa novos vídeos do YouTube para monitoramento
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS verificar_novos_videos_youtube();

CREATE OR REPLACE FUNCTION verificar_novos_videos_youtube()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_projeto RECORD;
    v_canal RECORD;
    v_result JSONB;
    v_videos_checked INTEGER := 0;
    v_new_videos INTEGER := 0;
    v_project_results JSONB[] := ARRAY[]::JSONB[];
    v_youtube_api_key TEXT;
    v_edge_result JSONB;
    v_video JSONB;
BEGIN
    -- Obter a chave da API do YouTube
    SELECT value INTO v_youtube_api_key
    FROM vault.decrypted_secrets
    WHERE name = 'YOUTUBE_API_KEY'
    LIMIT 1;

    IF v_youtube_api_key IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'YouTube API key not found',
            'timestamp', NOW()
        );
    END IF;

    -- Processar cada projeto ativo
    FOR v_projeto IN
        SELECT DISTINCT p.id, p."Project name", p.qtdmonitoramento
        FROM "Projeto" p
        WHERE p.status = 'active'
          AND p.qtdmonitoramento > 0
    LOOP
        v_videos_checked := 0;
        v_new_videos := 0;

        -- Buscar top canais para monitoramento (baseado em rank_position)
        FOR v_canal IN
            SELECT c.channel_id, c."Nome"
            FROM "Canais do youtube" c
            JOIN "Canais do youtube_Projeto" cp ON cp."Canais do youtube_id" = c.id
            WHERE cp."Projeto_id" = v_projeto.id
              AND cp.rank_position <= v_projeto.qtdmonitoramento
            ORDER BY cp.rank_position
            LIMIT v_projeto.qtdmonitoramento
        LOOP
            -- Chamar Edge Function para buscar vídeos recentes
            BEGIN
                SELECT payload INTO v_edge_result
                FROM http((
                    'POST',
                    current_setting('app.supabase_url') || '/functions/v1/check-youtube-videos',
                    ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.supabase_anon_key'))],
                    'application/json',
                    jsonb_build_object(
                        'channelId', v_canal.channel_id,
                        'apiKey', v_youtube_api_key,
                        'maxResults', 5
                    )::text
                )::http_request);

                -- Processar vídeos retornados
                IF v_edge_result ? 'videos' THEN
                    FOR v_video IN SELECT * FROM jsonb_array_elements(v_edge_result->'videos')
                    LOOP
                        v_videos_checked := v_videos_checked + 1;

                        -- Verificar se o vídeo já existe
                        IF NOT EXISTS (
                            SELECT 1 FROM "Videos"
                            WHERE "VIDEO" = v_video->>'videoId'
                        ) THEN
                            -- Inserir novo vídeo
                            INSERT INTO "Videos" (
                                "VIDEO",
                                video_title,
                                video_description,
                                channel_id_yotube,
                                published_at,
                                view_count,
                                like_count,
                                comment_count,
                                created_at
                            ) VALUES (
                                v_video->>'videoId',
                                v_video->>'title',
                                v_video->>'description',
                                v_canal.channel_id,
                                (v_video->>'publishedAt')::TIMESTAMP,
                                (v_video->>'viewCount')::BIGINT,
                                (v_video->>'likeCount')::BIGINT,
                                (v_video->>'commentCount')::BIGINT,
                                NOW()
                            );

                            v_new_videos := v_new_videos + 1;

                            -- Criar mensagem de monitoramento
                            PERFORM create_monitoring_message(
                                v_projeto.id,
                                v_video->>'videoId',
                                v_canal.channel_id
                            );
                        END IF;
                    END LOOP;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- Log error but continue processing
                RAISE NOTICE 'Error processing channel %: %', v_canal.channel_id, SQLERRM;
            END;
        END LOOP;

        -- Adicionar resultado do projeto
        v_project_results := array_append(
            v_project_results,
            jsonb_build_object(
                'project_id', v_projeto.id,
                'project_name', v_projeto."Project name",
                'videos_checked', v_videos_checked,
                'new_videos', v_new_videos
            )
        );
    END LOOP;

    -- Retornar resultado consolidado
    RETURN jsonb_build_object(
        'success', true,
        'projects_processed', array_length(v_project_results, 1),
        'results', v_project_results,
        'timestamp', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'timestamp', NOW()
    );
END;
$$;