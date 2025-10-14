-- =============================================
-- Fun��o: create_and_save_initial_comment
-- Descri��o: Cria e salva coment�rio inicial para v�deos
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.create_and_save_initial_comment(p_video_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_project_id INTEGER;
    v_comment_result JSONB;
    v_inserted_message_id INTEGER;
    v_result JSONB;
BEGIN
    -- Obter o ID do projeto associado ao v�deo usando a rela��o com o canal
    SELECT c."Projeto" INTO v_project_id
    FROM "Videos" v
    JOIN "Canais do youtube" c ON v.canal = c.id
    WHERE v.id = p_video_id
    LIMIT 1;

    -- Verificar se encontrou um projeto v�lido
    IF v_project_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'N�o foi poss�vel encontrar um projeto associado a este v�deo',
            'video_id', p_video_id
        );
    END IF;

    -- Chamar a fun��o para criar o coment�rio inicial
    SELECT create_initial_video_comment_with_claude(v_project_id, p_video_id) INTO v_comment_result;

    -- Verificar se ocorreu algum erro
    IF v_comment_result->'error' IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', v_comment_result->'error',
            'video_id', p_video_id,
            'project_id', v_project_id
        );
    END IF;

    -- Inserir na tabela Mensagens com base na estrutura fornecida
    INSERT INTO "Mensagens" (
        mensagem,
        justificativa,
        template,
        tipo_msg,
        project_id,
        video,
        aprove,
        respondido
    ) VALUES (
        v_comment_result->>'comment',
        v_comment_result->>'justificativa',
        false, -- n�o � um template
        1,     -- tipo de mensagem: coment�rio inicial (ajuste conforme necess�rio)
        v_project_id,
        p_video_id,
        false, -- n�o aprovado inicialmente
        false  -- n�o respondido inicialmente
    ) RETURNING id INTO v_inserted_message_id;

    -- Preparar o resultado
    v_result := jsonb_build_object(
        'success', true,
        'message_id', v_inserted_message_id,
        'video_id', p_video_id,
        'project_id', v_project_id,
        'comment', v_comment_result->>'comment',
        'justificativa', v_comment_result->>'justificativa',
        'youtube_video_id', v_comment_result->>'youtube_video_id',
        'created_at', now()
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_state', SQLSTATE,
            'video_id', p_video_id,
            'project_id', v_project_id
        );
END;
$function$