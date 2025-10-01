-- =============================================
-- Trigger: trigger_postar_comentario_youtube
-- Descrição: Trigger que posta comentário no YouTube quando teste = TRUE
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS trigger_postar_comentario_youtube() CASCADE;

CREATE OR REPLACE FUNCTION trigger_postar_comentario_youtube()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_youtube_video_id TEXT;
    v_resultado JSONB;
BEGIN
    -- NOVA CONDIÇÃO: Só dispara se teste = TRUE (controle manual)
    IF NEW.teste = TRUE AND NEW.video IS NOT NULL AND (NEW.respondido IS NULL OR NEW.respondido = FALSE) THEN

        -- Busca o YouTube video ID
        SELECT v."VIDEO"
        INTO v_youtube_video_id
        FROM public."Videos" v
        WHERE v.id = NEW.video;

        -- Se encontrou o vídeo no YouTube, posta o comentário
        IF v_youtube_video_id IS NOT NULL AND NEW.mensagem IS NOT NULL THEN
            -- Chama a função com parâmetros NOMEADOS
            SELECT * INTO v_resultado
            FROM post_youtube_video_comment(
                project_id := NEW.project_id::INTEGER,
                video_id := v_youtube_video_id,
                comment_text := NEW.mensagem
            );

            -- Verifica se a operação foi bem-sucedida
            IF (v_resultado->>'success')::BOOLEAN = TRUE THEN
                -- Atualiza o status da mensagem para respondido = TRUE
                UPDATE public."Mensagens"
                SET respondido = TRUE,
                    teste = FALSE -- Reseta o campo teste após postar
                WHERE id = NEW.id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Criar o trigger se não existir
DROP TRIGGER IF EXISTS trigger_post_youtube_comment ON public."Mensagens";

CREATE TRIGGER trigger_post_youtube_comment
    AFTER INSERT OR UPDATE OF teste ON public."Mensagens"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_postar_comentario_youtube();