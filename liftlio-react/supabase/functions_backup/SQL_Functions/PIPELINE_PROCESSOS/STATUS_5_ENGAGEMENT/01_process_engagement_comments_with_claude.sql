-- =============================================
-- Migration: Melhoria do prompt universal para process_engagement_comments_with_claude
-- Data: 2025-10-17 14:00
-- Atualizado: 2025-10-25 - Adicionada regra anti-travessão
-- Descrição: Simplifica e universaliza o prompt mantendo estrutura eficaz
--           Remove exemplos específicos de nicho, torna aplicável a qualquer produto
--           Baseado no prompt antigo que funcionava melhor (mais direto)
--           + Regra crítica: JAMAIS usar travessões (-) para separar frases
-- =============================================

DROP FUNCTION IF EXISTS process_engagement_comments_with_claude(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.process_engagement_comments_with_claude(p_project_id integer, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
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
    SELECT string_agg(mensagem, E'\\n')
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
    SELECT string_agg(CONCAT('Mensagem: ', mensagem, E'\\nJustificativa: ', justificativa), E'\\n\\n')
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

    -- Construir prompt SIMPLIFICADO e UNIVERSAL
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

INSTRUÇÕES ESPECIAIS DO QUE NÃO DEVE FAZER AO GERAR UMA RESPOSTA A UM COMENTÁRIO (siga estas instruções específicas ao criar respostas, se estiver vazio desconsidere):
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
12. Quando usar timestamp sempre use conforme a transcrição, JAMAIS deve inventar ou usar algo que não esteja na transcrição
13. Para cada resposta, forneça uma justificativa em inglês em primeira pessoa explicando seu raciocínio
14. IMPORTANTE: Adicione "tipo_resposta" em cada resposta: "produto" se mencionar o produto, "engajamento" caso contrário
15. CRÍTICO: JAMAIS use travessões (-) para conectar ou separar frases. Use ponto final (.) para separar sentenças

Exemplos dos tipos de respostas (USE TIMESTAMPS DA TRANSCRIÇÃO DE FORMA NATURAL):

TYPE 1 - Quando houver relação com o produto (COM MENÇÃO):
"Adorei aquela dica em 15:30! Tenho usado %s para resolver isso e realmente faz toda diferença."

TYPE 2 - Quando mencionar problema que o produto resolve (COM MENÇÃO):
"Esse método em 12:45 resolveu meu problema! Comecei a usar %s recentemente e já notei melhora."

TYPE 3 - Quando falar de algo relacionado (COM MENÇÃO):
"A parte em 10:10 me chamou atenção! %s tem me ajudado com isso."

TYPE 4 - Sem contexto relevante (SEM MENÇÃO - APENAS ENGAJAMENTO):
"A explicação em 18:22 foi exatamente o que eu precisava!"

Regras de Menção ao Produto:
1. MENCIONE %s naturalmente quando:
   - O comentário for de um lead (is_lead: true) - PRIORIDADE
   - O comentário mencionar problema/desafio que o produto resolve
   - Houver conexão genuína com keywords: %s
   - Você conseguir criar gancho natural via timestamp

2. Formas naturais de mencionar (como USUÁRIO, não vendedor):
   - "Tenho usado %s há algumas semanas e está funcionando bem pra mim"
   - "Experimentei %s depois de ver essa dica e tem ajudado bastante"
   - "Consegui resultados parecidos com %s recentemente"
   - "%s tem me ajudado com [problema específico]"

3. NÃO mencione quando:
   - Já atingiu o limite de %s menções
   - Não houver relação genuína
   - For sobre outros produtos/serviços que competem
   - Forçaria uma menção não-natural

LEMBRE-SE:
✅ Respeite o limite de %s menções ao produto
✅ Priorize menções para leads (is_lead: true)
✅ Priorize autenticidade sobre quantidade de menções
✅ Jamais indique outro produto que se assimile ao do projeto
✅ Use apenas informações reais da descrição do produto
✅ Melhor não mencionar do que forçar uma menção
✅ JAMAIS CITE ALGO QUE O PRODUTO FAZ QUE NÃO ESTEJA NA DESCRIÇÃO DO PRODUTO
✅ O comentário deve fazer sentido mesmo sem a menção ao produto
✅ Quando usar timestamp sempre use conforme a transcrição, JAMAIS invente
✅ Mantenha o tom de usuário genuíno sempre - compartilhando experiência pessoal, não dando conselhos como especialista

OS COMENTÁRIOS DEVEM IR DIRETO AO PONTO SEM INTRODUÇÃO OU CUMPRIMENTOS

Envie exatamente nesta estrutura:
[
  {
    "comment_id": "ID",
    "response": "response",
    "tipo_resposta": "produto" ou "engajamento",
    "justificativa": "I used first person to explain my reasoning..."
  }
]

Respond only with the requested JSON, with no additional text.',
        -- ARGUMENTOS NA ORDEM CORRETA (28 no total):
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
            E'\\n\\n'
        ) FROM jsonb_array_elements(v_comments) c),              -- 13: Comentários: %s
        COALESCE(v_project_country, 'Português'),                -- 14: língua: %s
        v_product_name,             -- 15: TYPE 1: Tenho usado %s
        v_product_name,             -- 16: TYPE 2: Comecei a usar %s
        v_product_name,             -- 17: TYPE 3: %s tem me ajudado
        v_product_name,             -- 18: MENCIONE %s naturalmente
        v_project_keywords,         -- 19: conexão genuína com keywords: %s
        v_product_name,             -- 20: Tenho usado %s
        v_product_name,             -- 21: Experimentei %s
        v_product_name,             -- 22: resultados com %s
        v_product_name,             -- 23: %s tem me ajudado
        v_max_product_mentions,     -- 24: limite de %s menções
        v_max_product_mentions,     -- 25: Respeite limite de %s menções
        v_max_product_mentions,     -- 26: ✅ Respeite o limite de %s menções (LEMBRE-SE)
        v_max_product_mentions,     -- 27: (repetido para manter compatibilidade)
        v_max_product_mentions      -- 28: (repetido para manter compatibilidade)
    );

    -- Chamada Claude com SYSTEM MESSAGE SIMPLIFICADO
    SELECT claude_complete(
        v_prompt,
        format('You are a regular YouTube viewer creating authentic responses.

CRITICAL RULES:
1. EVERY response MUST include at least ONE video timestamp in format: "15:30", "em 2:45", "At 5:30"
2. Use ONLY timestamps from the provided transcript - NEVER invent timestamps
3. Mention product/service INDIRECTLY as a regular user sharing personal experience (not as salesperson)
4. You MUST respond ONLY with a valid JSON array
5. No explanatory text outside JSON

Language: %s

Remember:
- Use timestamps naturally to show you watched the video
- Keep responses short (max 2 sentences)
- Never use @mentions
- GO DIRECTLY TO THE POINT without introductions or greetings
- Include justification in FIRST PERSON explaining your reasoning
- You can ONLY mention product %s in MAXIMUM %s responses
- Prioritize product mentions for comments marked as "is_lead": true
- Always include "tipo_resposta" field: "produto" if mentioning product, "engajamento" otherwise
- CRITICAL: NEVER use dashes (-) to connect sentences. Use periods (.) to separate sentences

Always respond exactly in this structure:
[
  {
    "comment_id": "ID",
    "response": "response WITH TIMESTAMP",
    "tipo_resposta": "produto" or "engajamento",
    "justificativa": "I [first person] explanation..."
  }
]

Respond only with the requested JSON array, with no additional text.',
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

    -- Validar se todas as respostas têm timestamps
    DECLARE
        v_response_without_timestamp INTEGER := 0;
    BEGIN
        SELECT COUNT(*)
        INTO v_response_without_timestamp
        FROM jsonb_array_elements(v_result) elem
        WHERE
            elem->>'response' NOT LIKE '%[%:%]%' AND
            elem->>'response' NOT LIKE '%:%' AND
            elem->>'response' NOT LIKE '%em %:%';

        IF v_response_without_timestamp > 0 THEN
            RAISE WARNING '% respostas sem timestamp detectadas', v_response_without_timestamp;
        ELSE
            RAISE NOTICE '✅ Todas as respostas contêm timestamps';
        END IF;
    END;

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
$function$;

-- =============================================
-- COMMIT MESSAGE NOTES:
-- ✅ Baseado no prompt antigo (estrutura comprovadamente eficaz)
-- ✅ Removidos exemplos específicos de nicho (affiliate, AI tools, etc)
-- ✅ Tornados TYPE 1-4 UNIVERSAIS para qualquer produto/serviço
-- ✅ Mantidas validações e controles
-- ✅ System message simplificado (mais direto)
-- ✅ Mantida lógica de timestamps e menções naturais
-- ✅ Adicionada regra anti-travessão (instrução 15 + system message)
-- =============================================
