-- =============================================
-- Função: obter_canal_e_videos
-- Descrição: Obtém canal e vídeos para processar (fila)
-- Criado: 2025-01-23
-- Atualizado: 2025-10-24 - Retorna videos_para_scann (fila) ao invés de todos vídeos
-- =============================================

DROP FUNCTION IF EXISTS obter_canal_e_videos(BIGINT);

CREATE OR REPLACE FUNCTION obter_canal_e_videos(canal_id bigint)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'youtube_channel_id', c.channel_id,
        'videos_para_scann', COALESCE(c.videos_para_scann, '')
    )
    INTO v_result
    FROM public."Canais do youtube" c
    WHERE c.id = canal_id;

    RETURN v_result;
END;
$$;