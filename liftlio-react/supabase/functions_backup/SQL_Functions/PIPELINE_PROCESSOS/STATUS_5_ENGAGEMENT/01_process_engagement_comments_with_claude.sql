-- =============================================
-- Função: process_engagement_comments_with_claude
-- Tipo: AI Processor (análise base com Claude)
--
-- Descrição:
--   Processa comentários de engagement usando Claude AI.
--   Gera respostas personalizadas baseadas em contexto do projeto.
--
-- Entrada:
--   p_project_id INTEGER - ID do projeto
--   p_limit INTEGER - Limite de comentários (default: 50)
--
-- Saída:
--   JSONB - Resultados da análise (sucessos, falhas, mensagens)
--
-- Conexões:
--   → Chamada por: 02_process_and_create_messages_engagement (linha 30)
--   → Chama: claude_complete() (STATUS_4/06)
--   → Não chama outras funções do STATUS_5
--
-- Criado: 2025-01-24
-- Atualizado: 2025-10-02 - Documentação completa e organização
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
    -- Obter a transcri��o do v�deo
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
            "Pa�s",
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
        "Pa�s",
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

    -- Obter coment�rios e contar total do v�deo
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

    -- Se n�o houver coment�rios, retornar NULL
    IF v_comments IS NULL THEN
        RAISE NOTICE 'Nenhum coment�rio pendente encontrado para o projeto %', p_project_id;
        RETURN NULL;
    END IF;

    -- Calcular limite de men��es baseado no tamanho do v�deo
    v_max_product_mentions := CASE
        WHEN v_video_comment_count < 30 THEN 1
        WHEN v_video_comment_count < 100 THEN 2
        WHEN v_video_comment_count < 500 THEN 5
        WHEN v_video_comment_count < 1000 THEN 8
        ELSE 10
    END;

    RAISE NOTICE 'V�deo tem % coment�rios. Limite de men��es: %',
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

    -- Obter exemplos de respostas que o usu�rio gostou
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

    -- Construir prompt com limite de men��es - ARGUMENTOS CORRIGIDOS
    v_prompt := format(
        'Voc� � um usu�rio engajado do YouTube respondendo a coment�rios de videos aleat�rios que n�o s�o seus. Sua tarefa � criar respostas curtas e naturais que demonstrem conex�o com o coment�rio original e com o conte�do do v�deo.

REGRA CR�TICA DE MEN��ES AO PRODUTO:
Este v�deo tem %s coment�rios totais.
Voc� DEVE mencionar o produto %s em NO M�XIMO %s respostas.
Priorize mencionar o produto para coment�rios marcados como "is_lead": true.
Para as demais respostas, foque apenas em engajamento sem mencionar o produto.

Contexto do Produto (use naturalmente quando relevante):
Nome: %s
Descri��o: %s
Nicho/Keywords: %s

Contexto do V�deo:
T�tulo: %s
Descri��o: %s
Transcri��o: %s

Veja os exemplos de mensagens a seguir e siga sempre que poss�vel, se estiver vazio desconsidere:
%s

Aqui exemplos de respostas que o usu�rio gostou:
%s

INSTRU��ES ESPECIAIS DO DO QUE NAO DEVE FAZER AO GERAR UMA RESPOSTA A UMA COMANTARIO (siga estas instru��es espec�ficas ao criar respostas, se estiver vazio desconsidere):
%s

Coment�rios a serem respondidos:
%s

Instru��es importantes:
1. Sempre responda na l�ngua do projeto especificado (%s)
2. SEMPRE RESPONDA AO CONTEXTO DO COMENT�RIO ORIGINAL
3. CRUCIAL: Cada resposta DEVE incluir pelo menos um timestamp da transcri��o no formato simples (15:30, 2:45, etc)
4. CRUCIAL: Use detalhes espec�ficos da transcri��o do v�deo, como termos t�cnicos, exemplos ou conceitos mencionados no v�deo
5. Mantenha as respostas curtas - m�ximo 2 frases
6. Demonstre que voc� realmente assistiu ao v�deo usando timestamps espec�ficos
7. Gere uma conversa natural e engajadora como um USU�RIO COMUM (n�o como especialista)
8. Jamais use @mentions
9. Evite respostas gen�ricas - sempre referencie partes espec�ficas do v�deo
10. Raramente mencione o tempo do v�deo duas vezes na mesma resposta
11. Sempre responda, jamais d� uma mensagem de erro
12. Quando usar timestamp semre use confoeme a tracricao, Jamais deve investar ou usar algo que nao esteja na trancricao
13. Para cada resposta, forne�a uma justificativa em ingl�s em primeira pessoa explicando seu racioc�nio (sem usar a palavra "strategy")
14. IMPORTANTE: Adicione "tipo_resposta" em cada resposta: "produto" se mencionar o produto, "engajamento" caso contr�rio

Exemplos dos tipos de respostas (USE TIMESTAMPS DA TRANSCRI��O DE FORMA NATURAL. OBS:SOMENTE OQUE VOCE RECEBE EM TRANCRICAO JAMIS DEVE INVENTAR ALGO QUE NAO ETEJA NA TRANCRICAO QUE RECEBEU):

TYPE 1 - Quando falar sobre cria��o de conte�do/afiliados (COM MEN��O):
"Adorei aquela dica em 15:30! Tenho usado %s para meu blog e realmente faz toda diferen�a na qualidade do conte�do."

TYPE 2 - Quando mencionar marketing/vendas (COM MEN��O):
"Esse m�todo em 12:45 resolveu meu problema de convers�o! Comecei a usar %s recentemente e j� notei melhora nas minhas vendas."

TYPE 3 - Quando falar de IA/automa��o (COM MEN��O):
"A parte em 10:10 sobre IA me chamou aten��o! %s tem me ajudado com textos que realmente parecem escritos por mim."

TYPE 4 - Sem contexto relevante (SEM MEN��O - APENAS ENGAJAMENTO):
"A explica��o em 18:22 foi exatamente o que eu precisava para resolver meu problema!"

PARE... RESPIRE FUNDO E PRESTE ATEN��O:

Regras de Men��o ao Produto:
1. MENCIONE %s naturalmente quando:
   - O coment�rio for de um lead (is_lead: true)
   - Falar de cria��o de conte�do (ex: "content creation", "writing", "content")
   - Mencionar marketing de afiliados (ex: "affiliate", "commission")
   - Discutir ferramentas de IA (ex: "AI tools", "automation")
   - Falar sobre escrita ou textos
   - Mencionar convers�o ou vendas

2. Formas naturais de mencionar:
   - "Tenho usado %s h� algumas semanas e est� funcionando bem pra mim"
   - "Experimentei %s depois de ver essa dica e tem ajudado bastante"
   - "Consegui resultados parecidos com %s recentemente"

3. N�O mencione quando:
   - J� atingiu o limite de %s men��es
   - For sobre crypto, investimentos
   - For sobre outros produtos espec�ficos
   - N�o tiver rela��o com: %s

LEMBRE-SE:
 Respeite o limite de %s men��es ao produto
 Priorize men��es para leads (is_lead: true)
 Priorize autenticidade sobre quantidade de men��es
 Jamais indique outro produto que se assimile ao do projeto
 Use apenas informa��es reais da descri��o do produto
 Melhor n�o mencionar do que for�ar uma men��o
 JAMAIS CITE ALGO QUE O PRODRUTO FAZ QUE NAO ESTEJA NA DESCRICAO DO PRODUTO, JAMIS ESQUECA DISSO.
 O coment�rio deve fazer sentido mesmo sem a men��o ao produto
 Quando usar timestamp semre use confoeme a tracricao, Jamais deve investar ou usar algo que nao esteja na trancricao
 Mantenha o tom de usu�rio genu�no sempre - como algu�m compartilhando sua experi�ncia pessoal, n�o dando conselhos como especialista

PARE... RESPIRE FUNDO E PRESTE ATEN��O: OS COMENTARIOS DEVEM IR DIRETO AO PONTO SEM INTRODU��O OU CUMPRIMENTOS, OS VIDEOS N�O S�O SEUS, S�O V�DEOS ALEAT�RIOS

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
        v_video_comment_count,     -- 1: Este v�deo tem %s coment�rios
        v_product_name,             -- 2: mencionar o produto %s
        v_max_product_mentions,     -- 3: em NO M�XIMO %s respostas
        v_product_name,             -- 4: Nome: %s
        v_project_description,      -- 5: Descri��o: %s
        v_project_keywords,         -- 6: Nicho/Keywords: %s
        replace(v_comments->0->>'video_title', '"', ''''),       -- 7: T�tulo: %s
        replace(v_comments->0->>'video_description', '"', ''''), -- 8: Descri��o: %s
        COALESCE(v_transcript, 'Transcri��o n�o dispon�vel'),    -- 9: Transcri��o: %s
        COALESCE(replace(v_template_messages, '"', ''''), 'Sem exemplos dispon�veis'),           -- 10: exemplos: %s
        COALESCE(replace(v_user_liked_examples, '"', ''''), 'Sem exemplos adicionais'),          -- 11: respostas que gostou: %s
        COALESCE(replace(v_user_special_instructions, '"', ''''), 'Sem instru��es especiais'),   -- 12: instru��es especiais: %s
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
        ) FROM jsonb_array_elements(v_comments) c),              -- 13: Coment�rios: %s
        COALESCE(v_project_country, 'Portugu�s'),                -- 14: l�ngua: %s
        v_product_name,             -- 15: TYPE 1: %s
        v_product_name,             -- 16: TYPE 2: %s
        v_product_name,             -- 17: TYPE 3: %s
        v_product_name,             -- 18: MENCIONE %s naturalmente
        v_product_name,             -- 19: Tenho usado %s
        v_product_name,             -- 20: Experimentei %s
        v_product_name,             -- 21: resultados com %s
        v_max_product_mentions,     -- 22: limite de %s men��es
        v_project_keywords,         -- 23: rela��o com: %s
        v_max_product_mentions      -- 24: Respeite limite de %s men��es
    );

    -- Chamada Claude com novo sistema de instru��es
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
               COALESCE(v_project_country, 'Portugu�s'),
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

    -- Validar se Claude respeitou o limite de men��es
    SELECT COUNT(*)
    INTO v_product_mention_count
    FROM jsonb_array_elements(v_result) elem
    WHERE elem->>'tipo_resposta' = 'produto';

    IF v_product_mention_count > v_max_product_mentions THEN
        v_validation_msg := format('Claude excedeu limite de men��es: %s men��es (limite: %s)',
                                  v_product_mention_count, v_max_product_mentions);
        RAISE NOTICE '%', v_validation_msg;
    ELSE
        v_validation_msg := format('Men��es dentro do limite: %s de %s',
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
        RAISE NOTICE 'Erro na fun��o: % %', SQLERRM, SQLSTATE;
        RETURN jsonb_build_object('error', SQLERRM);
END;
$function$