-- =============================================
-- Função: process_step_5_criar_mensagens
-- Descrição: Step 5 - Cria mensagens orientadas com Claude AI
-- Criado: 2025-11-14
-- Atualizado: 2025-12-28 - FIX: Passa v_video_db_id para processar APENAS o vídeo correto
-- =============================================

DROP FUNCTION IF EXISTS process_step_5_criar_mensagens(TEXT);

CREATE OR REPLACE FUNCTION public.process_step_5_criar_mensagens(video_youtube_id_param TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_video_db_id BIGINT;
    v_project_id BIGINT;
    v_current_step INTEGER;
    v_total_leads INTEGER;
    v_messages_result RECORD;
    v_total_mensagens INTEGER := 0;
    v_mensagens_produto INTEGER := 0;
    v_mensagens_engajamento INTEGER := 0;
BEGIN
    -- Buscar dados do vídeo na pipeline
    SELECT video_db_id, project_id, current_step, total_comentarios_com_sentimento
    INTO v_video_db_id, v_project_id, v_current_step, v_total_leads
    FROM pipeline_processing
    WHERE video_youtube_id = video_youtube_id_param;

    -- Verificar se vídeo existe na pipeline
    IF v_video_db_id IS NULL THEN
        RETURN 'ERROR: Vídeo ' || video_youtube_id_param || ' não encontrado na pipeline ou video_db_id NULL.';
    END IF;

    -- Verificar se está no step correto
    IF v_current_step != 4 THEN
        RETURN 'ERROR: Vídeo ' || video_youtube_id_param || ' não está no step 4. Current step: ' || v_current_step;
    END IF;

    -- Verificar se tem leads para criar mensagens
    IF v_total_leads IS NULL OR v_total_leads = 0 THEN
        -- Sem leads, avançar step mesmo assim
        UPDATE pipeline_processing
        SET
            mensagens_criadas = TRUE,
            mensagens_criadas_at = NOW(),
            total_mensagens_geradas = 0,  -- Total geral
            total_mensagens_produto = 0,  -- Detalhamento
            total_mensagens_engajamento = 0,  -- Detalhamento
            mensagens_error = NULL,
            current_step = 5,  -- Avançar para step 5 (completo)
            pipeline_completo = TRUE,
            pipeline_completo_at = NOW(),
            updated_at = NOW()
        WHERE video_youtube_id = video_youtube_id_param;

        RETURN 'WARNING: Vídeo ' || video_youtube_id_param || ' sem leads para criar mensagens. Pipeline completo.';
    END IF;

    -- Chamar função de criação de mensagens do sistema atual
    -- NOTA: process_and_create_messages_engagement cria mensagens para comentários não respondidos
    BEGIN
        -- Processar criação de mensagens
        -- A função retorna TABLE(message_id, cp_id, status)
        FOR v_messages_result IN
            SELECT * FROM process_and_create_messages_engagement(v_project_id::INTEGER, v_video_db_id)
        LOOP
            -- Contar mensagens criadas
            IF v_messages_result.message_id IS NOT NULL THEN
                v_total_mensagens := v_total_mensagens + 1;

                -- Contar por tipo (produto vs engajamento)
                IF v_messages_result.status LIKE '%produto%' THEN
                    v_mensagens_produto := v_mensagens_produto + 1;
                ELSE
                    v_mensagens_engajamento := v_mensagens_engajamento + 1;
                END IF;
            END IF;
        END LOOP;

        -- Verificar se pelo menos uma mensagem foi criada
        IF v_total_mensagens = 0 THEN
            UPDATE pipeline_processing
            SET
                mensagens_error = 'Nenhuma mensagem foi criada (possível erro no Claude)',
                retry_count = retry_count + 1,
                last_retry_at = NOW(),
                updated_at = NOW()
            WHERE video_youtube_id = video_youtube_id_param;

            RETURN 'ERROR: Nenhuma mensagem criada para vídeo ' || video_youtube_id_param;
        END IF;

        -- Atualizar pipeline_processing com sucesso
        UPDATE pipeline_processing
        SET
            mensagens_criadas = TRUE,
            mensagens_criadas_at = NOW(),
            total_mensagens_geradas = v_total_mensagens,  -- Total geral
            total_mensagens_produto = v_mensagens_produto,  -- Detalhamento
            total_mensagens_engajamento = v_mensagens_engajamento,  -- Detalhamento
            mensagens_error = NULL,
            retry_count = 0,
            current_step = 5,  -- Avançar para step 5 (completo)
            pipeline_completo = TRUE,
            pipeline_completo_at = NOW(),
            updated_at = NOW()
        WHERE video_youtube_id = video_youtube_id_param;

        RETURN 'SUCCESS: ' || v_total_mensagens || ' mensagens criadas (' ||
               v_mensagens_produto || ' produto, ' || v_mensagens_engajamento ||
               ' engajamento). Pipeline completo! ✅';

    EXCEPTION
        WHEN OTHERS THEN
            -- Erro ao chamar criação de mensagens
            UPDATE pipeline_processing
            SET
                mensagens_error = 'Erro ao criar mensagens: ' || SQLERRM,
                retry_count = retry_count + 1,
                last_retry_at = NOW(),
                updated_at = NOW()
            WHERE video_youtube_id = video_youtube_id_param;

            RETURN 'ERROR: Falha na criação de mensagens do vídeo ' || video_youtube_id_param || ': ' || SQLERRM;
    END;
END;
$function$;

-- =============================================
-- COMENTÁRIOS
-- =============================================
-- STEP 5: Criar Mensagens Orientadas com Claude
--
-- FUNCIONAMENTO:
-- 1. Verifica se está no step 4 (comentários analisados)
-- 2. Busca video_db_id, project_id e total_comentarios_com_sentimento
-- 3. Chama process_and_create_messages_engagement(project_id)
--    - Função chama process_engagement_comments_with_claude() internamente
--    - Claude AI cria mensagens personalizadas usando contexto do vídeo
--    - Sistema de menções ao produto (percentual dinâmico)
--    - Validação de timestamps, anti-duplicata, variação de frases
-- 4. Conta mensagens criadas por tipo (produto vs engajamento)
-- 5. Atualiza pipeline_processing:
--    - mensagens_criadas = TRUE
--    - total_mensagens_produto = N
--    - total_mensagens_engajamento = M
--    - current_step = 5 (completo)
--    - pipeline_completo = TRUE
--
-- CASOS ESPECIAIS:
-- - Vídeo sem leads: Avança step com warning, marca pipeline completo
-- - Erro na criação: Marca erro, incrementa retry, NÃO avança
-- - Nenhuma mensagem criada: Trata como erro (possível falha Claude)
--
-- INTEGRAÇÃO:
-- - USA função existente: process_and_create_messages_engagement(project_id)
-- - Esta função chama process_engagement_comments_with_claude() para criação com Claude
-- - Insere mensagens na tabela Mensagens:
--   * mensagem = texto da resposta
--   * Comentario_Principais = ID do comentário
--   * tipo_resposta = 'produto' ou 'engajamento'
--   * justificativa = explicação da resposta
--   * video_comment_count = total de comentários do vídeo
--   * max_product_mentions = limite de menções ao produto
-- - Atualiza Comentarios_Principais.mensagem = TRUE (já respondido)
-- - NÃO modifica funções do sistema atual
-- - Apenas lê resultado e atualiza pipeline
--
-- IMPORTANTE:
-- - process_engagement_comments_with_claude() usa Claude Sonnet 4 com timeout 300s
-- - Função processa APENAS comentários não respondidos (mensagem = FALSE)
-- - Sistema de percentual dinâmico de menções ao produto (padrão 50%)
-- - Validação rigorosa de timestamps (apenas timestamps válidos da transcrição)
-- - Anti-duplicata (evita mensagens idênticas)
-- - Variação de estrutura de frases (evita padrões repetitivos)
-- - Truncamento de transcrição em 30 minutos (otimização de tokens)
-- - Enriquecimento com dados do autor (opcional)
--
-- USO:
-- SELECT process_step_5_criar_mensagens('JBeQDU6WIPU');
-- =============================================
