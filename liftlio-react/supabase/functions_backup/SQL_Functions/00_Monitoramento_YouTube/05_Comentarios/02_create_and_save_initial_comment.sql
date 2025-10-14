-- =============================================
-- Função: create_and_save_initial_comment
-- Tipo: Função WRAPPER (chama 01 e faz INSERT)
--
-- Descrição:
--   Função principal para criar e salvar comentário inicial de vídeo monitorado.
--   1. Busca o projeto associado ao vídeo através do canal
--   2. Chama create_initial_video_comment_with_claude para gerar o texto
--   3. Insere na tabela Mensagens com teste = TRUE (dispara postagem automática)
--
-- Entrada:
--   p_video_id INTEGER - ID do vídeo na tabela Videos
--
-- Saída:
--   JSONB contendo:
--   - success: boolean indicando sucesso/falha
--   - message_id: ID da mensagem inserida (se sucesso)
--   - comment: texto do comentário gerado
--   - error: mensagem de erro (se falha)
--
-- Conexões:
--   → Chama: 01_create_initial_video_comment_with_claude (gera texto)
--   → Insere em: Tabela "Mensagens" com teste = TRUE
--   → Trigger disparado: trigger_postar_comentario_youtube (posta automaticamente)
--   → Chamada por: process_monitored_videos, outras automações
--
-- Fluxo completo:
--   Video → Esta função → Gera texto → INSERT com teste=TRUE →
--   Trigger dispara → 03_post_youtube_video_comment → Posta no YouTube
--
-- Criado: 2025-01-24
-- Atualizado: 2025-10-01 - Adicionado teste = TRUE para postagem automática
-- =============================================

DROP FUNCTION IF EXISTS create_and_save_initial_comment(INTEGER);

CREATE OR REPLACE FUNCTION create_and_save_initial_comment(p_video_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
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
        respondido,
        teste  -- ÚNICO CAMPO ADICIONADO
    ) VALUES (
        v_comment_result->>'comment',
        v_comment_result->>'justificativa',
        false, -- não é um template
        1,     -- tipo de mensagem: comentário inicial (ajuste conforme necessário)
        v_project_id,
        p_video_id,
        false, -- não aprovado inicialmente
        false, -- não respondido inicialmente
        true   -- ÚNICO VALOR ADICIONADO: ativa trigger para postagem automática
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
$$;