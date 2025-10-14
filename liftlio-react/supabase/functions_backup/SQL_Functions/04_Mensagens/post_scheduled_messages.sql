-- =============================================
-- Função: post_scheduled_messages
-- Descrição: Posta mensagens agendadas no YouTube, incluindo delays e logging detalhado
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.post_scheduled_messages(p_settings_id bigint)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_response jsonb;
    v_project_id int;
    v_comment_id text;
    v_message text;
    v_log_message text;
BEGIN
    v_log_message := 'INÍCIO - Settings ID: ' || p_settings_id || E'\\n';

    -- Pegar dados necessários
    SELECT
        s."Projeto",
        cp.id_do_comentario,
        m.mensagem
    INTO
        v_project_id,
        v_comment_id,
        v_message
    FROM "Settings messages posts" s
    JOIN "Mensagens" m ON m.id = s."Mensagens"
    JOIN "Comentarios_Principais" cp ON cp.id = s."Comentarios_Principal"
    WHERE s.id = p_settings_id;

    v_log_message := v_log_message || 'DADOS ENCONTRADOS:' || E'\\n';
    v_log_message := v_log_message || 'Projeto: ' || v_project_id || E'\\n';
    v_log_message := v_log_message || 'Comentário ID: ' || v_comment_id || E'\\n';
    v_log_message := v_log_message || 'Mensagem: ' || v_message || E'\\n';

    -- Delay antes de postar
    PERFORM pg_sleep(2);

    -- Tentar postar
    v_response := respond_to_youtube_comment(
        v_project_id,
        v_comment_id,
        v_message
    );

    v_log_message := v_log_message || 'RESPOSTA API: ' || v_response::text || E'\\n';

    -- Delay após postar
    PERFORM pg_sleep(2);

    -- Se sucesso
    IF (v_response->>'success')::boolean THEN
        UPDATE "Settings messages posts"
        SET status = 'posted',
            postado = NOW()
        WHERE id = p_settings_id;

        UPDATE "Mensagens"
        SET respondido = true
        WHERE id = (
            SELECT "Mensagens"
            FROM "Settings messages posts"
            WHERE id = p_settings_id
        );

        v_log_message := v_log_message || 'SUCESSO - Tabelas atualizadas' || E'\\n';
    ELSE
        v_log_message := v_log_message || 'ERRO na postagem' || E'\\n';
    END IF;

    -- Log final forçado
    RAISE NOTICE E'\\n------------------------\\n% ------------------------\\n', v_log_message;

    RETURN v_log_message;

EXCEPTION WHEN OTHERS THEN
    v_log_message := v_log_message || 'ERRO: ' || SQLERRM || E'\\n';
    RAISE NOTICE E'\\n------------------------\\n% ------------------------\\n', v_log_message;
    RETURN v_log_message;
END;
$function$