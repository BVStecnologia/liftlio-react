-- =============================================
-- Fun��o: trigger_postar_comentario_youtube
-- Descri��o: Trigger para postar coment�rio no YouTube
-- Criado: 2025-01-23
-- Atualizado: 2025-10-21 - Adicionado decremento de Mentions
-- =============================================

CREATE OR REPLACE FUNCTION public.trigger_postar_comentario_youtube()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_youtube_video_id TEXT;
    v_resultado JSONB;
BEGIN
    -- NOVA CONDI��O: S� dispara se teste = TRUE (controle manual)
    IF NEW.teste = TRUE AND NEW.video IS NOT NULL AND (NEW.respondido IS NULL OR NEW.respondido = FALSE) THEN

        -- Busca o YouTube video ID
        SELECT v."VIDEO"
        INTO v_youtube_video_id
        FROM public."Videos" v
        WHERE v.id = NEW.video;

        -- Se encontrou o v�deo no YouTube, posta o coment�rio
        IF v_youtube_video_id IS NOT NULL AND NEW.mensagem IS NOT NULL THEN
            -- Chama a fun��o com par�metros NOMEADOS
            SELECT * INTO v_resultado
            FROM post_youtube_video_comment(
                project_id := NEW.project_id::INTEGER,
                video_id := v_youtube_video_id,
                comment_text := NEW.mensagem
            );

            -- Verifica se a opera��o foi bem-sucedida
            IF (v_resultado->>'success')::BOOLEAN = TRUE THEN
                -- Atualiza o status da mensagem para respondido = TRUE
                UPDATE public."Mensagens"
                SET respondido = TRUE,
                    teste = FALSE, -- Reseta o campo teste ap�s postar
                    youtube_comment_id = v_resultado->'response'->>'id' -- Salva ID do comentário no YouTube
                WHERE id = NEW.id;

                -- Decrementar Mentions do customer (consumo de quota)
                UPDATE public.customers c
                SET "Mentions" = GREATEST(COALESCE("Mentions", 0) - 1, 0)
                FROM public."Projeto" p
                WHERE p.id = NEW.project_id
                AND c.user_id = p."User id";

                RAISE NOTICE 'Mentions decrementado para projeto ID=% (trigger automático)', NEW.project_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;