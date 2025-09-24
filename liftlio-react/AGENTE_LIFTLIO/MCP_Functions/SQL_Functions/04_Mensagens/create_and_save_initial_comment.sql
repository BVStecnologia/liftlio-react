-- =============================================
-- Função: create_and_save_initial_comment
-- Descrição: Cria e salva comentário inicial para vídeos
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
    -- Obter o ID do projeto associado ao vídeo usando a relação com o canal
    SELECT c."Projeto" INTO v_project_id
    FROM "Videos" v
    JOIN "Canais do youtube" c ON v.canal = c.id
    WHERE v.id = p_video_id
    LIMIT 1;

    -- Verificar se encontrou um projeto válido
    IF v_project_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Não foi possível encontrar um projeto associado a este vídeo',
            'video_id', p_video_id
        );
    END IF;

    -- Chamar a função para criar o comentário inicial
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
        false, -- não é um template
        1,     -- tipo de mensagem: comentário inicial (ajuste conforme necessário)
        v_project_id,
        p_video_id,
        false, -- não aprovado inicialmente
        false  -- não respondido inicialmente
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