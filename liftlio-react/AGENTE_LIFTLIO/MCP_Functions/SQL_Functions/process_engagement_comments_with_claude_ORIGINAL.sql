-- FUNÇÃO ORIGINAL - BACKUP ANTES DAS MODIFICAÇÕES
-- Data: 29/01/2025
-- Status: FUNCIONANDO EM PRODUÇÃO
-- Descrição: Gera mensagens de engajamento para comentários usando Claude
-- Problema identificado: Não limita menções em vídeos pequenos

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
BEGIN
    -- Obter a transcrição do vídeo
    SELECT vt.trancription INTO v_transcript
    FROM "Comentarios_Principais" cp
    JOIN "Videos" v ON v.id = cp.video_id
    JOIN "Videos_trancricao" vt ON vt.id = v.transcript
    WHERE cp.id = p_project_id;

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

    -- MODIFICAÇÃO: Nova consulta que obtém todos os comentários para processamento
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
            vt.trancription
        FROM primeiro_comentario pc
        JOIN "Videos" v ON v.id = pc.video_id
        LEFT JOIN "Videos_trancricao" vt ON vt.id = v.transcript
        LIMIT 1
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'comment_id', cp.id_do_comentario,
            'author_name', cp.author_name,
            'text_display', cp.text_display,
            'video_id', vi.video_id,
            'video_title', vi.video_title,
            'video_description', vi.video_description,
            'cp_id', cp.id  -- Adicionando o id de Comentarios_Principais
        )
    ) INTO v_comments
    FROM "Comentarios_Principais" cp
    CROSS JOIN video_info vi
    WHERE cp.video_id = vi.video_id
      AND cp.mensagem = false
    LIMIT p_limit;

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

    -- O restante da função permanece igual
    v_prompt := format(
        'Você é um usuário engajado do YouTube respondendo a comentários de videos aleatórios que não são seus. Sua tarefa é criar respostas curtas e naturais que demonstrem conexão com o comentário original e com o conteúdo do vídeo.

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

Exemplos dos tipos de respostas (USE TIMESTAMPS DA TRANSCRIÇÃO DE FORMA NATURAL. OBS:SOMENTE OQUE VOCE RECEBE EM TRANCRICAO JAMIS DEVE INVENTAR ALGO QUE NAO ETEJA NA TRANCRICAO QUE RECEBEU):

TYPE 1 - Quando falar sobre criação de conteúdo/afiliados:
"Adorei aquela dica em 15:30! Tenho usado %s para meu blog e realmente faz toda diferença na qualidade do conteúdo."

TYPE 2 - Quando mencionar marketing/vendas:
"Esse método em 12:45 resolveu meu problema de conversão! Comecei a usar %s recentemente e já notei melhora nas minhas vendas."

TYPE 3 - Quando falar de IA/automação:
"A parte em 10:10 sobre IA me chamou atenção! %s tem me ajudado com textos que realmente parecem escritos por mim."

TYPE 4 - Sem contexto relevante (não mencionar o produto):
"A explicação em 18:22 foi exatamente o que eu precisava para resolver meu problema!"

PARE... RESPIRE FUNDO E PRESTE ATENÇÃO:

Regras de Menção ao Produto:
1. MENCIONE %s naturalmente quando:
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
   - For sobre crypto, investimentos
   - For sobre outros produtos específicos
   - Não tiver relação com: %s

LEMBRE-SE:
✅ Priorize autenticidade sobre quantidade de menções
✅ Jamais indique outro produto que se assimile ao do projeto
✅ Use apenas informações reais da descrição do produto
✅ Melhor não mencionar do que forçar uma menção
✅ JAMAIS CITE ALGO QUE O PRODRUTO FAZ QUE NAO ESTEJA NA DESCRICAO DO PRODUTO, JAMIS ESQUECA DISSO.
✅ O comentário deve fazer sentido mesmo sem a menção ao produto
✅Quando usar timestamp semre use confoeme a tracricao, Jamais deve investar ou usar algo que nao esteja na trancricao
✅ Mantenha o tom de usuário genuíno sempre - como alguém compartilhando sua experiência pessoal, não dando conselhos como especialista

PARE... RESPIRE FUNDO E PRESTE ATENÇÃO: OS COMENTARIOS DEVEM IR DIRETO AO PONTO SEM INTRODUÇÃO OU CUMPRIMENTOS, OS VIDEOS NÃO SÃO SEUS, SÃO VÍDEOS ALEATÓRIOS

Envie exatamente nesta estrutura:
[
  {
    "comment_id": "ID",
    "response": "response",
    "justificativa": "I [used first person] to explain my reasoning while keeping the comment authentic..."
  }
]

Respond only with the requested JSON, with no additional text.',
        v_product_name,
        v_project_description,
        v_project_keywords,
        replace(v_comments->0->>'video_title', '"', ''''),
        replace(v_comments->0->>'video_description', '"', ''''),
        COALESCE(v_transcript, 'Transcrição não disponível'),
        COALESCE(replace(v_template_messages, '"', ''''), 'Sem exemplos disponíveis'),
        COALESCE(replace(v_user_liked_examples, '"', ''''), 'Sem exemplos adicionais disponíveis'),
        COALESCE(replace(v_user_special_instructions, '"', ''''), 'Sem instruções especiais'),
        (SELECT string_agg(
            format(
                'Comment %s:
Author: %s
Text: %s',
                c->>'comment_id',
                replace(c->>'author_name', '"', ''''),
                replace(c->>'text_display', '"', '''')
            ),
            E'\n\n'
        ) FROM jsonb_array_elements(v_comments) c),
        COALESCE(v_project_country, 'Português'),
        v_product_name,
        v_product_name,
        v_product_name,
        v_product_name,
        v_product_name,
        v_product_name,
        v_product_name,
        v_project_keywords
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
13. Always respond exactly in this structure [
  {
    "comment_id": "ID",
    "response": "response",
    "justificativa": "I referenced a specific timestamp and mentioned the product naturally as something I personally use..."
  }
]

Good example justifications in first person:
- "I connected my response to the specific timestamp where they discuss this topic and mentioned my personal experience with the product"
- "I focused on the educational part of the video first to build credibility before subtly mentioning my use of the product"
- "I chose not to mention the product here since the comment was about a technical issue unrelated to our solution"
- "I used terminology from the video transcript to make my response sound more authentic and knowledgeable"

QUANDO PUDER CIDE O TIMESTAMP E OQUE FOI FALADO CASO VOCE TENHA USADO ALGUMA INFOMACAO DA TRANCRICAO PARA GERAR O COMENTARIO, ISSO DA MAIS VALOR A JUSTIFICATIVA

Respond only with the requested JSON array of responses, with no additional text.
', 
               COALESCE(v_project_country, 'Português')),
        4000,
        0.7
    ) INTO v_claude_response;

    -- Modificar a resposta para incluir os dados adicionais solicitados
    WITH claude_json AS (
        SELECT jsonb_array_elements(v_claude_response::JSONB) AS element
    ),
    enriched_elements AS (
        SELECT 
            jsonb_build_object(
                'comment_id', element->>'comment_id',
                'response', element->>'response',
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
                'project_id', p_project_id
            ) AS enriched
        FROM claude_json
    )
    SELECT 
        jsonb_agg(enriched)
    INTO 
        v_result
    FROM 
        enriched_elements;

    -- Retornar resultado enriquecido
    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        -- Melhorar a mensagem de erro para debug
        RAISE NOTICE 'Erro detalhado na função: % %', SQLERRM, SQLSTATE;
        RETURN NULL;
END;
$$;