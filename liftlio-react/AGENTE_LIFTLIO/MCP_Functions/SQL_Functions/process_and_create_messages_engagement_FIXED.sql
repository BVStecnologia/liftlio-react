-- =============================================
-- FUNÇÃO COMPLETA: process_engagement_comments_with_claude
-- Data: 2025-01-21
-- Inclui TODO o prompt e lógica de processamento com Claude
-- =============================================

DROP FUNCTION IF EXISTS process_engagement_comments_with_claude(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION process_engagement_comments_with_claude(p_project_id INTEGER, p_limit INT DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_comments JSONB;
    v_claude_response TEXT;
    v_prompt TEXT;
    v_project_country TEXT;
    v_template_messages TEXT;
    v_transcript TEXT;
    v_project_name TEXT;
    v_project_description TEXT;
    v_project_keywords TEXT;
    v_product_name TEXT;
    v_result JSONB;
    v_user_liked_examples TEXT;
    v_user_special_instructions TEXT;
    v_video_comment_count INTEGER;
    v_max_product_mentions INTEGER;
    v_product_mention_count INTEGER;
    v_validation_msg TEXT;
BEGIN
    -- Obter a transcrição do vídeo
    SELECT vt.trancription INTO v_transcript
    FROM "Comentarios_Principais" cp
    JOIN "Videos" v ON v.id = cp.video_id
    LEFT JOIN "Videos_trancricao" vt ON vt.id = v.transcript
    WHERE cp.project_id = p_project_id
    AND cp.mensagem = false
    LIMIT 1;

    -- Obter dados do projeto
    WITH project_data AS (
        SELECT
            "País",
            COALESCE(
                SUBSTRING("description service" FROM 'Company or product name: ([^,]+)'),
                "Project name"
            ) as product_name,
            "description service",
            "Keywords",
            prompt_user
        FROM "Projeto"
        WHERE id = p_project_id
    )
    SELECT
        "País",
        product_name,
        "description service",
        "Keywords",
        prompt_user
    INTO
        v_project_country,
        v_product_name,
        v_project_description,
        v_project_keywords,
        v_user_special_instructions
    FROM project_data;

    -- Obter comentários e contar total do vídeo
    WITH primeiro_comentario AS (
        SELECT cp.video_id
        FROM "Comentarios_Principais" cp
        WHERE cp.project_id = p_project_id
          AND cp.mensagem = false
        ORDER BY cp.id
        LIMIT 1
    ),
    video_info AS (
        SELECT
            v.id AS video_id,
            v."VIDEO" AS youtube_video_id,
            v.video_title,
            v.video_description,
            v.video_tags,
            v.content_category,
            vt.trancription,
            (SELECT COUNT(*)
             FROM "Comentarios_Principais" cp2
             WHERE cp2.video_id = v.id) as total_comments
        FROM primeiro_comentario pc
        JOIN "Videos" v ON v.id = pc.video_id
        LEFT JOIN "Videos_trancricao" vt ON vt.id = v.transcript
        LIMIT 1
    )
    SELECT
        vi.total_comments,
        jsonb_agg(
            jsonb_build_object(
                'comment_id', cp.id_do_comentario,
                'author_name', cp.author_name,
                'text_display', cp.text_display,
                'video_id', vi.video_id,
                'video_title', vi.video_title,
                'video_description', vi.video_description,
                'cp_id', cp.id,
                'is_lead', CASE WHEN cp.lead_score IS NOT NULL AND cp.lead_score != '' THEN true ELSE false END
            ) ORDER BY
                CASE WHEN cp.lead_score IS NOT NULL AND cp.lead_score != '' THEN 0 ELSE 1 END,
                cp.id
        )
    INTO
        v_video_comment_count,
        v_comments
    FROM "Comentarios_Principais" cp
    CROSS JOIN video_info vi
    WHERE cp.video_id = vi.video_id
      AND cp.mensagem = false
    GROUP BY vi.total_comments
    LIMIT p_limit;

    -- Se não houver comentários, retornar NULL
    IF v_comments IS NULL THEN
        RAISE NOTICE 'Nenhum comentário pendente encontrado para o projeto %', p_project_id;
        RETURN NULL;
    END IF;

    -- Calcular limite de menções baseado no tamanho do vídeo
    v_max_product_mentions := CASE
        WHEN v_video_comment_count < 30 THEN 1
        WHEN v_video_comment_count < 100 THEN 2
        WHEN v_video_comment_count < 500 THEN 5
        WHEN v_video_comment_count < 1000 THEN 8
        ELSE 10
    END;

    RAISE NOTICE 'Vídeo tem % comentários. Limite de menções: %',
                 v_video_comment_count, v_max_product_mentions;

    -- Obter templates de mensagens
    SELECT string_agg(mensagem, E'\n')
    INTO v_template_messages
    FROM (
        SELECT mensagem
        FROM "Mensagens"
        WHERE tipo_msg = 2
          AND template = true
        ORDER BY created_at DESC
        LIMIT 20
    ) t;

    -- Obter exemplos de respostas que o usuário gostou
    SELECT string_agg(CONCAT('Mensagem: ', mensagem, E'\nJustificativa: ', justificativa), E'\n\n')
    INTO v_user_liked_examples
    FROM (
        SELECT mensagem, justificativa
        FROM "Mensagens"
        WHERE project_id = p_project_id
        AND template = true
        AND justificativa IS NOT NULL
        ORDER BY id
        LIMIT 20
    ) t;

    -- Construir prompt com limite de menções - ARGUMENTOS CORRIGIDOS
    v_prompt := format(
        'Você é um usuário engajado do YouTube respondendo a comentários de videos aleatórios que não são seus. Sua tarefa é criar respostas curtas e naturais que demonstrem conexão com o comentário original e com o conteúdo do vídeo.

REGRA CRÍTICA DE MENÇÕES AO PRODUTO:
Este vídeo tem %s comentários totais.
Você DEVE mencionar o produto %s em NO MÁXIMO %s respostas.
Priorize mencionar o produto para comentários marcados como "is_lead": true.
Para as demais respostas, foque apenas em engajamento sem mencionar o produto.

Contexto do Produto (use naturalmente quando relevante):
Nome: %s
Descrição: %s
Nicho/Keywords: %s

Contexto do Vídeo:
Título: %s
Descrição: %s
Transcrição: %s

Veja os exemplos de mensagens a seguir e siga sempre que possível, se estiver vazio desconsidere:
%s

Aqui exemplos de respostas que o usuário gostou:
%s

INSTRUÇÕES ESPECIAIS DO DO QUE NAO DEVE FAZER AO GERAR UMA RESPOSTA A UMA COMANTARIO (siga estas instruções específicas ao criar respostas, se estiver vazio desconsidere):
%s

Comentários a serem respondidos:
%s

Instruções importantes:
1. Sempre responda na língua do projeto especificado (%s)
2. SEMPRE RESPONDA AO CONTEXTO DO COMENTÁRIO ORIGINAL
3. CRUCIAL: Cada resposta DEVE incluir pelo menos um timestamp da transcrição no formato simples (15:30, 2:45, etc)
4. CRUCIAL: Use detalhes específicos da transcrição do vídeo, como termos técnicos, exemplos ou conceitos mencionados no vídeo
5. Mantenha as respostas curtas - máximo 2 frases
6. Demonstre que você realmente assistiu ao vídeo usando timestamps específicos
7. Gere uma conversa natural e engajadora como um USUÁRIO COMUM (não como especialista)
8. Jamais use @mentions
9. Evite respostas genéricas - sempre referencie partes específicas do vídeo
10. Raramente mencione o tempo do vídeo duas vezes na mesma resposta
11. Sempre responda, jamais dê uma mensagem de erro
12. Quando usar timestamp semre use confoeme a tracricao, Jamais deve investar ou usar algo que nao esteja na trancricao
13. Para cada resposta, forneça uma justificativa em inglês em primeira pessoa explicando seu raciocínio (sem usar a palavra "strategy")
14. IMPORTANTE: Adicione "tipo_resposta" em cada resposta: "produto" se mencionar o produto, "engajamento" caso contrário

Exemplos dos tipos de respostas (USE TIMESTAMPS DA TRANSCRIÇÃO DE FORMA NATURAL. OBS:SOMENTE OQUE VOCE RECEBE EM TRANCRICAO JAMIS DEVE INVENTAR ALGO QUE NAO ETEJA NA TRANCRICAO QUE RECEBEU):

TYPE 1 - Quando falar sobre criação de conteúdo/afiliados (COM MENÇÃO):
"Adorei aquela dica em 15:30! Tenho usado %s para meu blog e realmente faz toda diferença na qualidade do conteúdo."

TYPE 2 - Quando mencionar marketing/vendas (COM MENÇÃO):
"Esse método em 12:45 resolveu meu problema de conversão! Comecei a usar %s recentemente e já notei melhora nas minhas vendas."

TYPE 3 - Quando falar de IA/automação (COM MENÇÃO):
"A parte em 10:10 sobre IA me chamou atenção! %s tem me ajudado com textos que realmente parecem escritos por mim."

TYPE 4 - Sem contexto relevante (SEM MENÇÃO - APENAS ENGAJAMENTO):
"A explicação em 18:22 foi exatamente o que eu precisava para resolver meu problema!"

PARE... RESPIRE FUNDO E PRESTE ATENÇÃO:

Regras de Menção ao Produto:
1. MENCIONE %s naturalmente quando:
   - O comentário for de um lead (is_lead: true)
   - Falar de criação de conteúdo (ex: "content creation", "writing", "content")
   - Mencionar marketing de afiliados (ex: "affiliate", "commission")
   - Discutir ferramentas de IA (ex: "AI tools", "automation")
   - Falar sobre escrita ou textos
   - Mencionar conversão ou vendas

2. Formas naturais de mencionar:
   - "Tenho usado %s há algumas semanas e está funcionando bem pra mim"
   - "Experimentei %s depois de ver essa dica e tem ajudado bastante"
   - "Consegui resultados parecidos com %s recentemente"

3. NÃO mencione quando:
   - Já atingiu o limite de %s menções
   - For sobre crypto, investimentos
   - For sobre outros produtos específicos
   - Não tiver relação com: %s

LEMBRE-SE:
✅ Respeite o limite de %s menções ao produto
✅ Priorize menções para leads (is_lead: true)
✅ Priorize autenticidade sobre quantidade de menções
✅ Jamais indique outro produto que se assimile ao do projeto
✅ Use apenas informações reais da descrição do produto
✅ Melhor não mencionar do que forçar uma menção
✅ JAMAIS CITE ALGO QUE O PRODRUTO FAZ QUE NAO ESTEJA NA DESCRICAO DO PRODUTO, JAMIS ESQUECA DISSO.
✅ O comentário deve fazer sentido mesmo sem a menção ao produto
✅ Quando usar timestamp semre use confoeme a tracricao, Jamais deve investar ou usar algo que nao esteja na trancricao
✅ Mantenha o tom de usuário genuíno sempre - como alguém compartilhando sua experiência pessoal, não dando conselhos como especialista

PARE... RESPIRE FUNDO E PRESTE ATENÇÃO: OS COMENTARIOS DEVEM IR DIRETO AO PONTO SEM INTRODUÇÃO OU CUMPRIMENTOS, OS VIDEOS NÃO SÃO SEUS, SÃO VÍDEOS ALEATÓRIOS

Envie exatamente nesta estrutura:
[
  {
    "comment_id": "ID",
    "response": "response",
    "tipo_resposta": "produto" ou "engajamento",
    "justificativa": "I [used first person] to explain my reasoning while keeping the comment authentic..."
  }
]

Respond only with the requested JSON, with no additional text.',
        -- ARGUMENTOS NA ORDEM CORRETA (24 no total):
        v_video_comment_count,     -- 1: Este vídeo tem %s comentários
        v_product_name,             -- 2: mencionar o produto %s
        v_max_product_mentions,     -- 3: em NO MÁXIMO %s respostas
        v_product_name,             -- 4: Nome: %s
        v_project_description,      -- 5: Descrição: %s
        v_project_keywords,         -- 6: Nicho/Keywords: %s
        replace(v_comments->0->>'video_title', '"', ''''),       -- 7: Título: %s
        replace(v_comments->0->>'video_description', '"', ''''), -- 8: Descrição: %s
        COALESCE(v_transcript, 'Transcrição não disponível'),    -- 9: Transcrição: %s
        COALESCE(replace(v_template_messages, '"', ''''), 'Sem exemplos disponíveis'),           -- 10: exemplos: %s
        COALESCE(replace(v_user_liked_examples, '"', ''''), 'Sem exemplos adicionais'),          -- 11: respostas que gostou: %s
        COALESCE(replace(v_user_special_instructions, '"', ''''), 'Sem instruções especiais'),   -- 12: instruções especiais: %s
        (SELECT string_agg(
            format(
                'Comment %s:
Author: %s
Text: %s
Is Lead: %s',
                c->>'comment_id',
                replace(c->>'author_name', '"', ''''),
                replace(c->>'text_display', '"', ''''),
                c->>'is_lead'
            ),
            E'\n\n'
        ) FROM jsonb_array_elements(v_comments) c),              -- 13: Comentários: %s
        COALESCE(v_project_country, 'Português'),                -- 14: língua: %s
        v_product_name,             -- 15: TYPE 1: %s
        v_product_name,             -- 16: TYPE 2: %s
        v_product_name,             -- 17: TYPE 3: %s
        v_product_name,             -- 18: MENCIONE %s naturalmente
        v_product_name,             -- 19: Tenho usado %s
        v_product_name,             -- 20: Experimentei %s
        v_product_name,             -- 21: resultados com %s
        v_max_product_mentions,     -- 22: limite de %s menções
        v_project_keywords,         -- 23: relação com: %s
        v_max_product_mentions      -- 24: Respeite limite de %s menções
    );

    -- Chamada Claude com novo sistema de instruções
    SELECT claude_complete(
        v_prompt,
        format('You are an engaged YouTube viewer. Create short, natural responses that MUST include timestamps from the video transcript. Reply only with the requested JSON. Remember to:
1. Always respond in %s
2. Keep responses short (max 2 sentences)
3. ALWAYS use natural timestamps from the transcript (like 15:30 or 2:45) OBS: DEVE USAR AS TIMESTAMPS DA TRANCRICAO E JAMAIS INVENTAR NADA PARA SER DADOS REAIS
4. Focus on specific video moments and use actual terminology from the video
5. Never use @mentions
6. Show genuine interest as a regular user, not an expert
7. Avoid generic responses, jamais indique produtos que se assimile ao que queremos promover indiretamente. O nosso em primeiro lugar.
8. Make each response unique and focused on specific content from the video
9. GO DIRECTLY TO THE POINT without introductions
10. Make comments as short as possible
11. Rarely mention video timestamps twice in the same response
12. Include a justification in FIRST PERSON for each response explaining your reasoning in English (without using the word "strategy")
13. CRITICAL: You can only mention the product %s in a MAXIMUM of %s responses
14. Prioritize product mentions for comments marked as "is_lead": true
15. Always include "tipo_resposta" field: "produto" if mentioning product, "engajamento" otherwise
16. Always respond exactly in this structure [
  {
    "comment_id": "ID",
    "response": "response",
    "tipo_resposta": "produto" or "engajamento",
    "justificativa": "I referenced a specific timestamp and mentioned the product naturally as something I personally use..."
  }
]

Good example justifications in first person:
- "I connected my response to the specific timestamp where they discuss this topic and mentioned my personal experience with the product"
- "I focused on the educational part of the video first to build credibility before subtly mentioning my use of the product"
- "I chose not to mention the product here since the comment was about a technical issue unrelated to our solution"
- "I used terminology from the video transcript to make my response sound more authentic and knowledgeable"
- "This is a lead comment so I prioritized mentioning the product naturally while discussing the relevant video content"

QUANDO PUDER CIDE O TIMESTAMP E OQUE FOI FALADO CASO VOCE TENHA USADO ALGUMA INFOMACAO DA TRANCRICAO PARA GERAR O COMENTARIO, ISSO DA MAIS VALOR A JUSTIFICATIVA

Respond only with the requested JSON array of responses, with no additional text.',
               COALESCE(v_project_country, 'Português'),
               v_product_name,
               v_max_product_mentions),
        4000,
        0.7
    ) INTO v_claude_response;

    -- Validar resposta
    IF v_claude_response IS NULL THEN
        RAISE NOTICE 'Claude retornou NULL';
        RETURN NULL;
    END IF;

    -- Tentar converter para JSONB
    BEGIN
        v_result := v_claude_response::JSONB;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao converter resposta do Claude: %', SQLERRM;
        RETURN jsonb_build_object('error', 'Invalid JSON from Claude', 'response', v_claude_response);
    END;

    -- Validar se Claude respeitou o limite de menções
    SELECT COUNT(*)
    INTO v_product_mention_count
    FROM jsonb_array_elements(v_result) elem
    WHERE elem->>'tipo_resposta' = 'produto';

    IF v_product_mention_count > v_max_product_mentions THEN
        v_validation_msg := format('Claude excedeu limite de menções: %s menções (limite: %s)',
                                  v_product_mention_count, v_max_product_mentions);
        RAISE NOTICE '%', v_validation_msg;
    ELSE
        v_validation_msg := format('Menções dentro do limite: %s de %s',
                                  v_product_mention_count, v_max_product_mentions);
        RAISE NOTICE '%', v_validation_msg;
    END IF;

    -- Enriquecer resposta com dados adicionais
    WITH claude_json AS (
        SELECT jsonb_array_elements(v_result) AS element
    ),
    enriched_elements AS (
        SELECT
            jsonb_build_object(
                'comment_id', element->>'comment_id',
                'response', element->>'response',
                'tipo_resposta', element->>'tipo_resposta',
                'justificativa', element->>'justificativa',
                'video_id', (
                    SELECT c->>'video_id'
                    FROM jsonb_array_elements(v_comments) c
                    WHERE c->>'comment_id' = element->>'comment_id'
                    LIMIT 1
                ),
                'cp_id', (
                    SELECT c->>'cp_id'
                    FROM jsonb_array_elements(v_comments) c
                    WHERE c->>'comment_id' = element->>'comment_id'
                    LIMIT 1
                ),
                'project_id', p_project_id,
                'video_comment_count', v_video_comment_count,
                'max_product_mentions', v_max_product_mentions
            ) AS enriched
        FROM claude_json
    )
    SELECT
        jsonb_agg(enriched)
    INTO
        v_result
    FROM
        enriched_elements;

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro na função: % %', SQLERRM, SQLSTATE;
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- =============================================
-- FUNÇÃO: process_and_create_messages_engagement
-- COM CHAMADA PARA agendar_postagens_diarias
-- =============================================

DROP FUNCTION IF EXISTS process_and_create_messages_engagement(INTEGER);

CREATE OR REPLACE FUNCTION process_and_create_messages_engagement(p_project_id INTEGER)
RETURNS TABLE(message_id BIGINT, cp_id TEXT, status TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_raw_result JSONB;
    v_fixed_json TEXT;
    v_messages JSONB;
    v_item RECORD;
    v_message_id BIGINT;
    v_count INTEGER := 0;
    v_start_time TIMESTAMP;
    v_batch_size INTEGER := 10;
    v_total_messages INTEGER;
    v_product_mention_count INTEGER := 0;
    v_engagement_only_count INTEGER := 0;
    v_posts_scheduled INTEGER := 0; -- NOVO: contador de posts agendados
BEGIN
    v_start_time := clock_timestamp();
    RAISE NOTICE 'Iniciando processamento para projeto % em %', p_project_id, v_start_time;

    -- Obter o resultado com os novos campos
    SELECT process_engagement_comments_with_claude(p_project_id) INTO v_raw_result;
    RAISE NOTICE 'Dados obtidos do Claude em % segundos', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time));

    -- Se não há resultado, retornar
    IF v_raw_result IS NULL THEN
        RETURN QUERY SELECT NULL::BIGINT, NULL::TEXT, 'Nenhum comentário pendente ou erro ao processar';
        RETURN;
    END IF;

    -- Converter para texto e limpar escape duplo
    v_fixed_json := REPLACE(v_raw_result::TEXT, '\\\\\"\\\"', '\"');
    v_fixed_json := REPLACE(v_fixed_json, '\\\"\\\\', '\"\\\\');
    v_fixed_json := REPLACE(v_fixed_json, '\\\\\"\\\"', '\"');
    v_fixed_json := TRIM(BOTH '[]\"' FROM v_fixed_json);

    -- Se já for um array JSON válido, usar diretamente
    IF v_raw_result::TEXT LIKE '[%]' THEN
        v_messages := v_raw_result;
    ELSE
        v_fixed_json := '[' || v_fixed_json || ']';
        v_messages := v_fixed_json::JSONB;
    END IF;

    -- Verificar total de mensagens
    v_total_messages := jsonb_array_length(v_messages);
    RAISE NOTICE 'Processando % mensagens em lotes de %', v_total_messages, v_batch_size;

    -- Processar cada mensagem
    FOR v_item IN
        SELECT
            TRIM(BOTH '\"' FROM (elem->>'cp_id')) as cp_id_text,
            TRIM(BOTH '\"' FROM (elem->>'response')) as response,
            TRIM(BOTH '\"' FROM (elem->>'justificativa')) as justificativa,
            COALESCE((elem->>'project_id')::INTEGER, p_project_id) as project_id,
            (elem->>'video_id')::BIGINT as video_id,
            COALESCE(elem->>'tipo_resposta', 'engajamento') as tipo_resposta,
            (elem->>'video_comment_count')::INTEGER as video_comment_count,
            (elem->>'max_product_mentions')::INTEGER as max_product_mentions,
            row_number() OVER () as row_num
        FROM jsonb_array_elements(v_messages) as elem
    LOOP
        -- Log de progresso a cada 10 itens
        IF v_item.row_num % 10 = 0 THEN
            RAISE NOTICE 'Processando mensagem % de % (% segundos decorridos)',
                v_item.row_num, v_total_messages,
                EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time));
        END IF;

        BEGIN
            -- Converter cp_id para BIGINT
            DECLARE
                v_cp_id BIGINT := v_item.cp_id_text::BIGINT;
            BEGIN
                -- Verificar existência do comentário
                IF EXISTS (SELECT 1 FROM "Comentarios_Principais" WHERE id = v_cp_id) THEN
                    -- Inserir na tabela Mensagens com os novos campos
                    WITH msg_insert AS (
                        INSERT INTO public."Mensagens" (
                            created_at,
                            mensagem,
                            "Comentario_Principais",
                            tipo_msg,
                            template,
                            respondido,
                            justificativa,
                            project_id,
                            video,
                            tipo_resposta,
                            video_comment_count,
                            max_product_mentions
                        ) VALUES (
                            NOW(),
                            v_item.response,
                            v_cp_id,
                            2,
                            false,
                            false,
                            v_item.justificativa,
                            v_item.project_id,
                            v_item.video_id,
                            v_item.tipo_resposta,
                            v_item.video_comment_count,
                            v_item.max_product_mentions
                        ) RETURNING id
                    ),
                    comment_update AS (
                        UPDATE public."Comentarios_Principais"
                        SET mensagem = true
                        WHERE id = v_cp_id
                    )
                    SELECT id INTO v_message_id FROM msg_insert;

                    v_count := v_count + 1;

                    -- Contar tipos de resposta
                    IF v_item.tipo_resposta = 'produto' THEN
                        v_product_mention_count := v_product_mention_count + 1;
                    ELSE
                        v_engagement_only_count := v_engagement_only_count + 1;
                    END IF;

                    -- Log específico para menções ao produto
                    IF v_item.tipo_resposta = 'produto' THEN
                        RAISE NOTICE 'Mensagem % contém menção ao produto (vídeo com % comentários, limite: %)',
                            v_message_id, v_item.video_comment_count, v_item.max_product_mentions;
                    END IF;

                    RETURN QUERY SELECT v_message_id, v_item.cp_id_text,
                        'Processado com sucesso (' || v_item.tipo_resposta || ')';
                ELSE
                    RETURN QUERY SELECT NULL::BIGINT, v_item.cp_id_text,
                        'Comentário não encontrado no banco de dados';
                END IF;
            END;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT NULL::BIGINT, v_item.cp_id_text, 'Erro: ' || SQLERRM;
        END;

        -- Commit a cada lote para evitar transações muito longas
        IF v_item.row_num % v_batch_size = 0 THEN
            RAISE NOTICE 'Commit do lote % (mensagens % a %)',
                v_item.row_num / v_batch_size,
                v_item.row_num - v_batch_size + 1,
                v_item.row_num;
        END IF;
    END LOOP;

    -- =============================================
    -- CORREÇÃO CRÍTICA: AGENDAR POSTAGENS
    -- =============================================
    IF v_count > 0 THEN
        BEGIN
            -- Chamar função de agendamento
            SELECT agendar_postagens_diarias(p_project_id) INTO v_posts_scheduled;

            IF v_posts_scheduled > 0 THEN
                RAISE NOTICE '✅ SUCESSO: % postagens agendadas em Settings messages posts', v_posts_scheduled;

                -- Adicionar informação ao retorno
                RETURN QUERY SELECT
                    NULL::BIGINT,
                    'AGENDAMENTO'::TEXT,
                    format('%s postagens agendadas com sucesso', v_posts_scheduled);
            ELSE
                RAISE WARNING '⚠️ ATENÇÃO: Nenhuma postagem foi agendada (projeto pode estar inativo)';
            END IF;

        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '❌ ERRO ao agendar postagens: %', SQLERRM;
            RETURN QUERY SELECT
                NULL::BIGINT,
                'ERRO_AGENDAMENTO'::TEXT,
                'Erro ao agendar: ' || SQLERRM;
        END;
    END IF;
    -- =============================================
    -- FIM DA CORREÇÃO
    -- =============================================

    -- Estatísticas finais
    RAISE NOTICE 'Processamento concluído em % segundos.',
        EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time));
    RAISE NOTICE 'Total: % mensagens (% com produto, % apenas engajamento)',
        v_count, v_product_mention_count, v_engagement_only_count;
    RAISE NOTICE 'Postagens agendadas: %', v_posts_scheduled;

    -- Resumo se nenhuma mensagem foi processada
    IF v_count = 0 THEN
        RETURN QUERY SELECT NULL::BIGINT, NULL::TEXT,
            'Nenhuma mensagem processada com sucesso de ' || v_total_messages || ' tentativas';
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro global após % segundos: %',
        EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)), SQLERRM;
    RETURN QUERY SELECT NULL::BIGINT, NULL::TEXT, 'Erro global: ' || SQLERRM;
END;
$$;

COMMENT ON FUNCTION process_and_create_messages_engagement IS
'VERSÃO CORRIGIDA: Processa comentários com Claude, cria mensagens E agenda postagens via Settings messages posts';