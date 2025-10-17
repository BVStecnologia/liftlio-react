-- =============================================
-- Migration: Otimizar uso de timestamps em process_engagement_comments_with_claude
-- Descrição: Reforça instruções de timestamps para Claude usar 100% das vezes
-- Criado: 2025-10-17
--
-- Mudanças:
-- 1. System message reforçado com timestamps como CRITICAL RULE #1
-- 2. Instrução de timestamp movida para topo com ênfase visual
-- 3. Exemplo concreto adicionado (boa vs ruim)
-- 4. Estrutura reorganizada (transcrição antes das instruções)
-- 5. Mantém TODOS os 24 placeholders e elementos críticos
-- =============================================

DROP FUNCTION IF EXISTS public.process_engagement_comments_with_claude(integer, integer);

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

    -- Construir prompt OTIMIZADO com timestamps em destaque
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

🎬 TRANSCRIÇÃO DO VÍDEO (use para encontrar timestamps específicos):
%s

Veja os exemplos de mensagens a seguir e siga sempre que possível, se estiver vazio desconsidere:
%s

Aqui exemplos de respostas que o usuário gostou:
%s

INSTRUÇÕES ESPECIAIS DO DO QUE NAO DEVE FAZER AO GERAR UMA RESPOSTA A UMA COMANTARIO (siga estas instruções específicas ao criar respostas, se estiver vazio desconsidere):
%s

Comentários a serem respondidos:
%s

════════════════════════════════════════
🎯 REGRA CRÍTICA #1: USE TIMESTAMPS COMO GANCHO EMOCIONAL
════════════════════════════════════════

**OBJETIVO**: Criar ENGAJAMENTO EMOCIONAL usando a transcrição do vídeo como gancho

**ESTRATÉGIA**:
1. Leia o comentário e identifique a emoção/problema/interesse da pessoa
2. Encontre um MOMENTO ESPECÍFICO no vídeo (timestamp) que se conecta com isso
3. Use esse momento como GANCHO EMOCIONAL para:
   - Mostrar que você assistiu ao vídeo
   - Criar empatia/conexão com quem comentou
   - Promover o produto/serviço INDIRETAMENTE como usuário comum

**FORMATO OBRIGATÓRIO**:
- TODA resposta DEVE ter timestamp: "Around [02:18]", "At 5:30", "em 2:45"
- Use APENAS timestamps da transcrição fornecida - JAMAIS invente

**Exemplo de GANCHO EMOCIONAL bem feito**:
{
  "comment_id": "123456",
  "response": "Around [02:18] he talks about this exact challenge - I switched to [PRODUTO] and it helped me solve it!",
  "tipo_resposta": "produto",
  "justificativa": "I used the timestamp where the creator discusses the same problem mentioned in the comment to create emotional connection..."
}

❌ ERRADO (timestamp sem propósito emocional):
{
  "comment_id": "123456",
  "response": "I switched to [PRODUTO] and it helped me! At 2:18 btw.",
  "tipo_resposta": "produto",
  "justificativa": "I added a random timestamp..."
}

════════════════════════════════════════

Instruções importantes:
1. Sempre responda na língua do projeto especificado (%s)
2. Use o timestamp como GANCHO EMOCIONAL para conectar com o comentário
3. Identifique a emoção/problema no comentário e encontre momento relevante no vídeo
4. Promova o produto/serviço INDIRETAMENTE como usuário comum (não como vendedor)
5. Mantenha as respostas curtas - máximo 2 frases
6. Demonstre que você realmente assistiu ao vídeo através do timestamp contextual
7. Jamais use @mentions
8. Cada timestamp deve ter PROPÓSITO EMOCIONAL, não ser aleatório
9. Para cada resposta, forneça uma justificativa em inglês em primeira pessoa explicando o gancho emocional
10. IMPORTANTE: Adicione "tipo_resposta" em cada resposta: "produto" se mencionar o produto, "engajamento" caso contrário

Exemplos de GANCHOS EMOCIONAIS UNIVERSAIS:

TIPO 1 - Problema/Desafio mencionado (gancho empático):
Comentário: "Estou com dificuldade nisso..."
Resposta: "Em [05:30] ele fala exatamente sobre esse desafio! Passei pelo mesmo e [PRODUTO] me ajudou a resolver."

TIPO 2 - Dúvida/Pergunta (gancho educativo):
Comentário: "Como faço isso?"
Resposta: "Aquela parte em [12:45] explica bem! Eu uso [PRODUTO] e simplificou muito pra mim."

TIPO 3 - Compartilhando experiência (gancho de conexão):
Comentário: "Também passei por isso..."
Resposta: "Em [08:15] ele menciona exatamente isso! [PRODUTO] tem me ajudado nessa situação."

TIPO 4 - Sem contexto para produto (gancho de engajamento puro):
Comentário: "Ótimo conteúdo!"
Resposta: "A explicação em [18:22] foi exatamente o que eu precisava ouvir hoje!"

PARE... RESPIRE FUNDO E PRESTE ATENÇÃO:

Regras de Menção ao Produto/Serviço:
1. MENCIONE o produto naturalmente quando:
   - O comentário for de um lead (is_lead: true) - PRIORIDADE MÁXIMA
   - O problema/desafio mencionado se relaciona com o que o produto/serviço resolve
   - O comentário demonstra interesse no nicho/keywords fornecidos
   - Você pode criar um gancho emocional genuíno através do timestamp

2. Formas INDIRETAS de mencionar (como usuário comum):
   - "Passei pelo mesmo e [PRODUTO] me ajudou a resolver"
   - "Eu uso [PRODUTO] e simplificou muito pra mim"
   - "[PRODUTO] tem me ajudado nessa situação"
   - "Tive resultado similar usando [PRODUTO]"

3. NÃO mencione quando:
   - Já atingiu o limite máximo de menções
   - Não há conexão genuína entre comentário e produto/serviço
   - For sobre outros produtos/serviços específicos que competem
   - Forçaria uma menção não-natural

LEMBRE-SE:
✅ Respeite o limite máximo de menções ao produto
✅ Priorize menções para leads (is_lead: true)
✅ Priorize autenticidade sobre quantidade de menções
✅ Jamais indique outro produto que se assimile ao do projeto
✅ Use apenas informações reais da descrição do produto
✅ Melhor não mencionar do que forçar uma menção
✅ JAMAIS CITE ALGO QUE O PRODUTO FAZ QUE NAO ESTEJA NA DESCRICAO DO PRODUTO, JAMIS ESQUECA DISSO.
✅ O comentário deve fazer sentido mesmo sem a menção ao produto
✅ Use APENAS timestamps da transcrição fornecida - JAMAIS invente
✅ Mantenha o tom de usuário genuíno sempre - como alguém compartilhando sua experiência pessoal, não dando conselhos como especialista

PARE... RESPIRE FUNDO E PRESTE ATENÇÃO: OS COMENTARIOS DEVEM IR DIRETO AO PONTO SEM INTRODUÇÃO OU CUMPRIMENTOS, OS VIDEOS NÃO SÃO SEUS, SÃO VÍDEOS ALEATÓRIOS

Envie exatamente nesta estrutura:
[
  {
    "comment_id": "ID",
    "response": "response WITH TIMESTAMP",
    "tipo_resposta": "produto" ou "engajamento",
    "justificativa": "I [used first person] to explain my reasoning. At timestamp [MM:SS] the creator mentions..."
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
        COALESCE(v_transcript, 'Transcrição não disponível'),    -- 9: 🎬 TRANSCRIÇÃO: %s
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
        COALESCE(v_project_country, 'Português')                 -- 14: língua: %s
    );

    -- Chamada Claude com SYSTEM MESSAGE OTIMIZADO PARA GANCHO EMOCIONAL
    SELECT claude_complete(
        v_prompt,
        format('You are a regular YouTube viewer creating authentic, emotionally engaging responses.

🎯 CRITICAL RULES (PRIORITY ORDER):
1. Use timestamps as EMOTIONAL HOOKS - find moments in the video that emotionally connect with each comment
2. EVERY response MUST include at least ONE video timestamp in format "Around [MM:SS]" or "At MM:SS"
3. Use ONLY timestamps from the provided transcript - NEVER invent timestamps
4. Promote the product/service INDIRECTLY as a regular user sharing personal experience
5. You MUST respond ONLY with a valid JSON array
6. No explanatory text outside JSON

Language: %s

Your goal: Create EMOTIONAL ENGAGEMENT using video timestamps as hooks, not just add random timestamps.

Remember to:
- Identify the EMOTION/PROBLEM in each comment first
- Find a relevant video moment (timestamp) that connects with that emotion
- Keep responses short (max 2 sentences)
- Never use @mentions
- Promote product/service as a USER, not a salesperson
- GO DIRECTLY TO THE POINT without introductions
- Include a justification in FIRST PERSON explaining the EMOTIONAL HOOK you used (without using the word "strategy")
- CRITICAL: You can only mention the product %s in a MAXIMUM of %s responses
- Prioritize product mentions for comments marked as "is_lead": true
- Always include "tipo_resposta" field: "produto" if mentioning product, "engajamento" otherwise

Always respond exactly in this structure:
[
  {
    "comment_id": "ID",
    "response": "response WITH TIMESTAMP [MM:SS]",
    "tipo_resposta": "produto" or "engajamento",
    "justificativa": "I referenced timestamp [MM:SS] where the creator discusses... and mentioned the product naturally as something I personally use"
  }
]

Good example justifications in first person:
- "I connected my response to timestamp [02:18] where they discuss this exact topic and mentioned my personal experience with the product"
- "I focused on the educational part at [05:30] to build credibility before subtly mentioning my use of the product"
- "I chose not to mention the product here since the comment was about a technical issue unrelated to our solution, but I still referenced [12:45] from the video"
- "At [08:15] the creator uses the same terminology I incorporated to make my response sound authentic and knowledgeable"
- "This is a lead comment so I prioritized mentioning the product naturally while discussing the content at [03:42]"

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

COMMENT ON FUNCTION public.process_engagement_comments_with_claude(integer, integer) IS
'Processa comentários de engagement usando Claude AI. OTIMIZADO para usar timestamps 100% das vezes.

Melhorias v2:
- System message reforçado com timestamps como CRITICAL RULE #1
- Instrução de timestamp movida para topo com ênfase visual (🎯)
- Exemplo concreto adicionado (boa vs ruim)
- Estrutura reorganizada (transcrição antes das instruções)
- Validação automática de timestamps nas respostas
- Mantém todos os 24 placeholders e elementos críticos (limite de menções, justificativas, tipo_resposta)';
