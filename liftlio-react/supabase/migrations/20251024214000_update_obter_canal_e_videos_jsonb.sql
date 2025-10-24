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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Validação de entrada
    IF canal_id IS NULL THEN
        RAISE EXCEPTION 'canal_id não pode ser NULL';
    END IF;

    SELECT jsonb_build_object(
        'youtube_channel_id', c.channel_id,
        'videos_para_scann', COALESCE(c.videos_para_scann, '')
    )
    INTO v_result
    FROM public."Canais do youtube" c
    WHERE c.id = canal_id;

    -- Se não encontrar canal, retornar null
    IF v_result IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        -- Log do erro
        RAISE LOG 'Erro em obter_canal_e_videos: %', SQLERRM;
        RAISE;
END;
$$;

COMMENT ON FUNCTION public.obter_canal_e_videos(BIGINT) IS
'Obtém canal e vídeos para processar (fila de processamento). Retorna JSONB com youtube_channel_id e videos_para_scann.';
