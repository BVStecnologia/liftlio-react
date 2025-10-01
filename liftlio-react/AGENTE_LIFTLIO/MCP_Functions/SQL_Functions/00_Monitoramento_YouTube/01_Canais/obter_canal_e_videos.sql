-- =============================================
-- Função: obter_canal_e_videos
-- Descrição: Obtém canal e seus vídeos
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS obter_canal_e_videos(BIGINT);

CREATE OR REPLACE FUNCTION obter_canal_e_videos(canal_id bigint)
RETURNS TABLE(
    youtube_channel_id text,
    video_id text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.channel_id AS youtube_channel_id,
        v."VIDEO" AS video_id
    FROM
        public."Canais do youtube" c
    LEFT JOIN
        public."Videos" v ON v.channel_id_yotube = c.channel_id
    WHERE
        c.id = canal_id;
END;
$$;