-- =============================================
-- Função: create_and_save_initial_comment
-- Descrição: Cria e salva comentário inicial para vídeos
-- Criado: 2025-01-24
-- Atualizado: 2025-10-24 - Validações de segurança para evitar inserir comentários de erro
-- Atualizado: 2025-10-24 - Adicionado campo teste=true para ativar trigger de postagem no YouTube
-- =============================================

DROP FUNCTION IF EXISTS public.create_and_save_initial_comment(INTEGER);

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

    -- ============================================
    -- VALIDAÇÕES DE SEGURANÇA (Adicionadas 2025-10-24)
    -- Garantir que NUNCA inserimos comentários de erro no banco
    -- ============================================

    -- 1. Validar se o comentário não está vazio
    IF v_comment_result->>'comment' IS NULL OR
       TRIM(v_comment_result->>'comment') = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Comentário gerado está vazio',
            'video_id', p_video_id,
            'project_id', v_project_id,
            'debug_info', v_comment_result->'debug_info'
        );
    END IF;

    -- 2. Validar se o comentário não é uma mensagem de erro
    IF v_comment_result->>'comment' ILIKE '%erro%' OR
       v_comment_result->>'comment' ILIKE '%error%' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Comentário gerado contém mensagem de erro',
            'comment_preview', v_comment_result->>'comment',
            'video_id', p_video_id,
            'project_id', v_project_id,
            'debug_info', v_comment_result->'debug_info'
        );
    END IF;

    -- 3. Validar tamanho mínimo (comentários reais do YouTube têm pelo menos 20 caracteres)
    IF LENGTH(TRIM(v_comment_result->>'comment')) < 20 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Comentário gerado é muito curto (mínimo 20 caracteres)',
            'comment_length', LENGTH(TRIM(v_comment_result->>'comment')),
            'comment_preview', v_comment_result->>'comment',
            'video_id', p_video_id,
            'project_id', v_project_id
        );
    END IF;

    -- 4. Validar se a justificativa não contém palavras de erro
    IF v_comment_result->>'justificativa' ILIKE '%error%' OR
       v_comment_result->>'justificativa' ILIKE '%failed%' OR
       v_comment_result->>'justificativa' ILIKE '%parsing%' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Justificativa contém indicadores de erro',
            'justificativa_preview', v_comment_result->>'justificativa',
            'video_id', p_video_id,
            'project_id', v_project_id,
            'debug_info', v_comment_result->'debug_info'
        );
    END IF;

    -- ============================================
    -- FIM DAS VALIDAÇÕES DE SEGURANÇA
    -- ============================================

    -- Inserir na tabela Mensagens com base na estrutura fornecida
    INSERT INTO "Mensagens" (
        mensagem,
        justificativa,
        template,
        tipo_msg,
        project_id,
        video,
        aprove,
        respondido,
        teste
    ) VALUES (
        v_comment_result->>'comment',
        v_comment_result->>'justificativa',
        false, -- não é um template
        1,     -- tipo de mensagem: comentário inicial (ajuste conforme necessário)
        v_project_id,
        p_video_id,
        false, -- não aprovado inicialmente
        false, -- não respondido inicialmente
        true   -- ✅ ATIVA trigger para postar no YouTube automaticamente
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