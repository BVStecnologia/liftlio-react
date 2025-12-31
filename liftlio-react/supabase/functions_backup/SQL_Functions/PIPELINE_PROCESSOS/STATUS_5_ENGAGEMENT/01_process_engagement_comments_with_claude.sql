-- =============================================
-- Função: process_engagement_comments_with_claude
-- Tipo: Message Generator (Claude AI)
--
-- Descrição:
--   Gera mensagens de engajamento usando Claude AI.
--   Processa comentários de vídeos e cria respostas personalizadas.
--
-- Última atualização: 2025-12-30
-- FIX CRÍTICO: Adicionada seção "O QUE FAZ O PRODUTO" para evitar
--              que Claude invente funcionalidades do produto
--
-- PROBLEMA RESOLVIDO:
--   Claude estava inventando funcionalidades como:
--   - "Liftlio ajuda a encontrar produtos"
--   - "Liftlio ajuda com targeting de ads"
--   - "Liftlio analisa nichos de música"
--
-- SOLUÇÃO:
--   Adicionada seção explícita no prompt dizendo:
--   - O que o produto FAZ (monitorar conversas, visibilidade, leads)
--   - O que o produto NÃO FAZ (encontrar produtos, ads, e-commerce)
--   - Instrução para usar tipo="engajamento" quando comentário
--     pergunta sobre algo que o produto não faz
--
-- Parâmetros:
--   p_project_id INTEGER - ID do projeto
--   p_limit INTEGER DEFAULT 10 - Limite de comentários
--   p_video_id BIGINT DEFAULT NULL - ID do vídeo específico (opcional)
--
-- Retorno:
--   JSONB - Array de mensagens geradas com campos:
--     - comment_id, response, tipo_resposta, justificativa
--     - video_id, cp_id, project_id
--     - video_comment_count, max_product_mentions
-- =============================================

DROP FUNCTION IF EXISTS public.process_engagement_comments_with_claude(integer, integer, bigint);

CREATE OR REPLACE FUNCTION public.process_engagement_comments_with_claude(p_project_id integer, p_limit integer DEFAULT 10, p_video_id bigint DEFAULT NULL::bigint)
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
    v_duplicate_count INTEGER := 0;
    v_total_responses INTEGER := 0;
    v_unique_comment_ids INTEGER := 0;
    v_percentual_mencoes INTEGER;
    v_total_comentarios_processados INTEGER;
    v_pos_cut INTEGER;
    v_i INTEGER;
    v_valid_timestamps TEXT[];
    v_timestamp_examples TEXT;
    v_invalid_timestamp_count INTEGER := 0;
    v_invalid_timestamp_rate NUMERIC;
    v_forbidden_patterns TEXT;
    v_comments_formatted TEXT;
    v_product_name_match TEXT[];
    v_target_video_id BIGINT;
BEGIN
    -- NOVO: Se p_video_id passado, usar esse vídeo; senão, pegar primeiro pendente
    IF p_video_id IS NOT NULL THEN
        v_target_video_id := p_video_id;
    ELSE
        SELECT cp.video_id INTO v_target_video_id
        FROM "Comentarios_Principais" cp
        WHERE cp.project_id = p_project_id
        AND cp.mensagem = false
        ORDER BY cp.id
        LIMIT 1;
    END IF;

    -- Se não há vídeo, retornar NULL
    IF v_target_video_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Buscar transcrição do vídeo alvo
    SELECT vt.trancription INTO v_transcript
    FROM "Videos" v
    LEFT JOIN "Videos_trancricao" vt ON vt.id = v.transcript
    WHERE v.id = v_target_video_id;

    IF v_transcript IS NOT NULL THEN
        v_transcript := regexp_replace(v_transcript, '\[0?0:(0[0-9]|1[0-4])\]', '', 'g');

        v_pos_cut := position('[15:' in v_transcript);

        IF v_pos_cut = 0 THEN
            v_i := 16;
            WHILE v_i <= 59 AND v_pos_cut = 0 LOOP
                v_pos_cut := position('[' || v_i::text || ':' in v_transcript);
                v_i := v_i + 1;
            END LOOP;
        END IF;

        IF v_pos_cut = 0 THEN
            v_pos_cut := position('[0:15:' in v_transcript);
            IF v_pos_cut = 0 THEN
                v_pos_cut := position('[1:15:' in v_transcript);
            END IF;
        END IF;

        IF v_pos_cut > 0 THEN
            v_transcript := substring(v_transcript from 1 for v_pos_cut - 1);
        END IF;

        SELECT array_agg(DISTINCT ts ORDER BY ts)
        INTO v_valid_timestamps
        FROM regexp_matches(v_transcript, '\[(\d{1,2}:\d{2})\]', 'g') AS matches(ts);

        IF v_valid_timestamps IS NOT NULL AND array_length(v_valid_timestamps, 1) > 0 THEN
            v_timestamp_examples := format(
                'MANDATORY: Use ONLY these timestamps from the video:
%s

Pick timestamps naturally from this list. NEVER invent timestamps.',
                array_to_string(v_valid_timestamps, ', ')
            );
        ELSE
            v_timestamp_examples := NULL;
        END IF;
    END IF;

    -- Padrões proibidos (mensagens deletadas)
    WITH message_words AS (
        SELECT
            regexp_split_to_array(
                lower(regexp_replace(mensagem, '[^\w\s]', '', 'g')),
                '\s+'
            ) as words
        FROM "Mensagens"
        WHERE project_id = p_project_id
            AND respondido = TRUE
            AND deleted_at IS NOT NULL
            AND created_at >= NOW() - INTERVAL '60 days'
    ),
    trigrams AS (
        SELECT
            array_to_string(words[i:i+2], ' ') as pattern
        FROM message_words,
            generate_series(1, array_length(words, 1) - 2) as i
        WHERE array_length(words, 1) >= 3
    ),
    repeated_patterns AS (
        SELECT
            pattern,
            COUNT(*) as repeat_count
        FROM trigrams
        GROUP BY pattern
        HAVING COUNT(*) >= 2
    )
    SELECT string_agg(
        '- "' || pattern || '" (' || repeat_count || 'x deletado)',
        E'\n'
        ORDER BY repeat_count DESC
    )
    INTO v_forbidden_patterns
    FROM repeated_patterns
    LIMIT 50;

    -- Dados do projeto
    SELECT
        "País",
        "description service",
        "Keywords",
        prompt_user,
        COALESCE(percentual_mencoes_produto, 50),
        "Project name"
    INTO
        v_project_country,
        v_project_description,
        v_project_keywords,
        v_user_special_instructions,
        v_percentual_mencoes,
        v_product_name
    FROM "Projeto"
    WHERE id = p_project_id;

    SELECT regexp_matches(v_project_description, 'Company or product name:\s+(\S+)')
    INTO v_product_name_match;

    IF v_product_name_match IS NOT NULL AND array_length(v_product_name_match, 1) > 0 THEN
        v_product_name := v_product_name_match[1];
    END IF;

    -- MODIFICADO: Buscar comentários do vídeo ESPECÍFICO
    WITH video_info AS (
        SELECT
            v.id AS video_id,
            v."VIDEO" AS youtube_video_id,
            v.video_title,
            v.video_description,
            v.video_tags,
            v.content_category,
            (SELECT COUNT(*)
             FROM "Comentarios_Principais" cp2
             WHERE cp2.video_id = v.id
             AND cp2.mensagem = false) as total_comments
        FROM "Videos" v
        WHERE v.id = v_target_video_id
        LIMIT 1
    ),
    limited_comments AS (
        SELECT
            cp.id,
            cp.id_do_comentario,
            cp.author_name,
            cp.text_display,
            cp.lead_score,
            vi.video_id,
            vi.video_title,
            vi.video_description,
            vi.total_comments
        FROM "Comentarios_Principais" cp
        CROSS JOIN video_info vi
        WHERE cp.video_id = vi.video_id
          AND cp.mensagem = false
        ORDER BY
            CASE WHEN cp.lead_score IS NOT NULL AND cp.lead_score != '' THEN 0 ELSE 1 END,
            cp.id
        LIMIT p_limit
    )
    SELECT
        total_comments,
        jsonb_agg(
            jsonb_build_object(
                'comment_id', id_do_comentario,
                'author_name', author_name,
                'text_display', text_display,
                'video_id', video_id,
                'video_title', video_title,
                'video_description', video_description,
                'cp_id', id,
                'is_lead', CASE WHEN lead_score IS NOT NULL AND lead_score != '' THEN true ELSE false END
            )
        )
    INTO
        v_video_comment_count,
        v_comments
    FROM limited_comments
    GROUP BY total_comments;

    IF v_comments IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT jsonb_array_length(v_comments) INTO v_total_comentarios_processados;

    v_max_product_mentions := GREATEST(
        1,
        CEIL(v_total_comentarios_processados * v_percentual_mencoes / 100.0)
    );

    -- Templates
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

    SELECT string_agg(
        format(
            'Comment %s:
Author: %s
Text: %s
Is Lead: %s',
            c->>'comment_id',
            replace(replace(c->>'author_name', '%', '%%'), '"', ''''),
            replace(replace(c->>'text_display', '%', '%%'), '"', ''''),
            c->>'is_lead'
        ),
        E'\n\n'
    )
    INTO v_comments_formatted
    FROM jsonb_array_elements(v_comments) c;

    -- =============================================
    -- PROMPT ATUALIZADO 2025-12-30: Adicionada seção "O QUE FAZ O PRODUTO"
    -- =============================================
    v_prompt := format(
        'Você é um espectador engajado respondendo a comentários em vídeos que você assistiu.

🎯 REGRA DE OURO: CONECTE PRIMEIRO, PRODUTO DEPOIS
1️⃣ PRIMEIRO: Conecte com o comentário (concordar, validar, perguntar)
2️⃣ DEPOIS: Se tipo="produto", mencione %s naturalmente

🚨 CRÍTICO - QUAL PRODUTO MENCIONAR:
✅ MENCIONE APENAS: %s (produto do PROJETO)
🚫 NUNCA MENCIONE: Produtos do vídeo (GoHighLevel, ClickFunnels, etc)
✅ CORRETO: "I''ve been using %s to find..."
❌ ERRADO: "he talks about using GoHighLevel..." (produto DO VÍDEO!)

🎯 O QUE FAZ O PRODUTO (RESPEITE RIGOROSAMENTE!):
O produto monitora conversas relevantes no YouTube e ajuda marcas a serem
descobertas em comentários onde seu público já está conversando sobre
problemas que o produto resolve. É uma ferramenta de VISIBILIDADE e
DESCOBERTA DE LEADS através de monitoramento de conversas.

✅ FORMAS CORRETAS DE MENCIONAR O PRODUTO:
- "PRODUCTNAME helped me find relevant conversations in my niche"
- "With PRODUCTNAME I discovered where my audience is already talking"
- "PRODUCTNAME monitors discussions so I can engage authentically"
- "I use PRODUCTNAME to find where people discuss problems I can help with"

❌ O PRODUTO NÃO FAZ (NUNCA INVENTE!):
- NÃO encontra produtos ou fornecedores
- NÃO ajuda com anúncios/ads/targeting de campanhas
- NÃO faz pesquisa de mercado ou análise de e-commerce
- NÃO analisa nichos de música ou gêneros de conteúdo
- NÃO faz bundling, upsells ou estratégias de preço
- NÃO responde perguntas técnicas sobre outros produtos/ferramentas
- NÃO ajuda com tax/impostos ou questões legais/financeiras

⚠️ SE O COMENTÁRIO PERGUNTA SOBRE ALGO QUE O PRODUTO NÃO FAZ:
Use tipo="engajamento" e responda a pergunta SEM mencionar o produto!

🚫 NUNCA RESPONDA A:
- Saudações religiosas (Ameen, Amen, God bless, Alhamdulillah)
- Frases puramente emocionais sem conteúdo substantivo
- Conecte com o TÓPICO do comentário, não com saudações

📊 DISTRIBUIÇÃO OBRIGATÓRIA:
→ Total: %s comentários = %s tipo "produto" (menciona %s) + %s tipo "engajamento"

🔥 ANTI-REPETIÇÃO (evite estes padrões deletados):
%s

✅ BONS EXEMPLOS (2-3 frases, 40-60 palavras, VARIE!):
• Produto curto: "Great point! I''ve been using PRODUCTNAME for this and it''s been super helpful."
• Produto médio: "Totally agree! The strategy at 08:45 is solid. I found PRODUCTNAME recently and it helped me discover where these conversations happen."
• Engajamento: "Exactly! At 12:30 she explains this perfectly. Have you tried implementing it yet?"

🚫 NUNCA: Plataformas (YouTube/Instagram/etc), travessões (-), respostas longas (60+ palavras)
✅ SEMPRE: Energia positiva, concisão, variar tamanho (alguns 2 frases, outros 3)

🎬 CONTEXTO DO VÍDEO:
Título: %s
Descrição: %s
%s
Transcrição: %s

📝 TEMPLATES (siga se disponível):
%s

👍 EXEMPLOS APROVADOS PELO USUÁRIO:
%s

⛔ INSTRUÇÕES ESPECIAIS - NÃO FAZER:
%s

💬 COMENTÁRIOS A RESPONDER:
%s

📋 REGRAS FINAIS:
• Língua: %s
• Timestamps: Use da lista válida, NUNCA invente, NÃO use [00:00] a [00:14]
• Varie estrutura: concordar, perguntar, compartilhar, sugerir
• Usuário comum (não especialista/vendedor)
• Direto ao ponto (sem introduções)
• JAMAIS use travessões (-)

ESTRUTURA DE RESPOSTA:
[{"comment_id": "ID", "response": "...", "tipo_resposta": "produto"/"engajamento", "justificativa": "I..."}]

Respond only with JSON, no additional text.',
        v_product_name,                         -- 1: mencione naturalmente
        v_product_name,                         -- 2: MENCIONE APENAS
        v_product_name,                         -- 3: CORRETO: "I've been using %s..."
        v_total_comentarios_processados,        -- 4: Total comentários
        v_max_product_mentions,                 -- 5: tipo produto
        v_product_name,                         -- 6: menciona
        (v_total_comentarios_processados - v_max_product_mentions), -- 7: engajamento
        COALESCE(replace(v_forbidden_patterns, '%', '%%'), 'Nenhum padrão deletado ainda'), -- 8: Anti-repetição
        replace(v_comments->0->>'video_title', '"', ''''),          -- 9: Título
        replace(v_comments->0->>'video_description', '"', ''''),    -- 10: Descrição
        CASE WHEN v_timestamp_examples IS NOT NULL                  -- 11: Timestamps
             THEN E'\n\n' || v_timestamp_examples || E'\n'
             ELSE ''
        END,
        COALESCE(replace(v_transcript, '%', '%%'), 'Transcrição não disponível'), -- 12: Transcrição
        COALESCE(replace(replace(v_template_messages, '%', '%%'), '"', ''''), 'Sem exemplos disponíveis'), -- 13: Templates
        COALESCE(replace(replace(v_user_liked_examples, '%', '%%'), '"', ''''), 'Sem exemplos adicionais'), -- 14: Liked
        COALESCE(replace(replace(v_user_special_instructions, '%', '%%'), '"', ''''), 'Sem instruções especiais'), -- 15: Special
        COALESCE(v_comments_formatted, 'ERRO: Nenhum comentário processado'), -- 16: Comments
        COALESCE(v_project_country, 'Português') -- 17: Língua
    );

    -- =============================================
    -- SYSTEM MESSAGE ATUALIZADO 2025-12-30
    -- =============================================
    SELECT claude_complete(
        v_prompt,
        format('Regular video viewer creating authentic responses. BE FRIENDLY!

🎯 GOLDEN RULE: CONNECT FIRST, mention %s SECOND (if tipo="produto")

🚨 CRITICAL - WHICH PRODUCT TO MENTION:
✅ MENTION ONLY: %s (PROJECT product)
🚫 NEVER MENTION: Video products (GoHighLevel, ClickFunnels, etc)
✅ CORRECT: "I''ve been using %s to find..."
❌ WRONG: "he talks about using GoHighLevel..." (VIDEO product!)

🎯 WHAT THE PRODUCT DOES (RESPECT THIS!):
The product monitors relevant YouTube conversations and helps brands get discovered.
It is a VISIBILITY and LEAD DISCOVERY tool through conversation monitoring.
✅ CORRECT: "PRODUCTNAME helped me find conversations", "monitors discussions"
❌ WRONG: Finding products, ads help, market research, music niches, bundling

⚠️ IF COMMENT ASKS ABOUT SOMETHING THE PRODUCT DOESNT DO:
Use tipo="engajamento" and answer WITHOUT mentioning the product!

🚫 NEVER RESPOND TO: Religious greetings (Ameen, Amen, God bless)
Connect with the TOPIC, not greetings!

CRITICAL:
• BREVITY: 2-3 sentences MAX, 40-60 words (VARY length!)
• DISTRIBUTION: %s comments = %s "produto" + %s "engajamento"
• 🔥 ANTI-REPETITION: Avoid these patterns: %s
• 🚫 NEVER: Platform names, dashes (-), "Audience description"
• ✅ ALWAYS: Positive energy, direct to point, vary structure

Language: %s
Response: [{"comment_id": "ID", "response": "...", "tipo_resposta": "produto"/"engajamento", "justificativa": "I..."}]',
               v_product_name,                         -- 1: mention %s SECOND
               v_product_name,                         -- 2: MENTION ONLY (PROJECT product)
               v_product_name,                         -- 3: CORRECT: "I've been using %s..."
               v_total_comentarios_processados,        -- 4: Total comments
               v_max_product_mentions,                 -- 5: tipo produto
               (v_total_comentarios_processados - v_max_product_mentions), -- 6: engajamento
               COALESCE(replace(v_forbidden_patterns, '%', '%%'), 'No deleted patterns'), -- 7: Anti-repetition
               COALESCE(v_project_country, 'Português') -- 8: Language
        ),
        4000,
        0.7,
        120000
    ) INTO v_claude_response;

    IF v_claude_response IS NULL THEN
        RETURN NULL;
    END IF;

    BEGIN
        v_claude_response := regexp_replace(v_claude_response, '^\s*```json\s*', '', 'i');
        v_claude_response := regexp_replace(v_claude_response, '\s*```\s*$', '');
        v_claude_response := trim(v_claude_response);
        v_result := v_claude_response::JSONB;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('error', 'Invalid JSON from Claude', 'response', v_claude_response);
    END;

    SELECT COUNT(*) INTO v_total_responses
    FROM jsonb_array_elements(v_result);

    SELECT COUNT(DISTINCT elem->>'comment_id') INTO v_unique_comment_ids
    FROM jsonb_array_elements(v_result) elem;

    v_duplicate_count := v_total_responses - v_unique_comment_ids;

    IF v_duplicate_count > 0 THEN
        RAISE WARNING '⚠️ Claude gerou % respostas duplicadas! Removendo duplicatas...', v_duplicate_count;

        WITH ranked_responses AS (
            SELECT
                elem,
                ROW_NUMBER() OVER (PARTITION BY elem->>'comment_id' ORDER BY ordinality) as rn
            FROM jsonb_array_elements(v_result) WITH ORDINALITY elem
        )
        SELECT jsonb_agg(elem)
        INTO v_result
        FROM ranked_responses
        WHERE rn = 1;
    END IF;

    SELECT COUNT(*)
    INTO v_product_mention_count
    FROM jsonb_array_elements(v_result) elem
    WHERE elem->>'tipo_resposta' = 'produto';

    IF v_product_mention_count > v_max_product_mentions THEN
        v_validation_msg := format('⚠️ ALERTA: Claude excedeu limite de menções: %s menções (limite: %s)',
                                  v_product_mention_count, v_max_product_mentions);
        RAISE WARNING '%', v_validation_msg;
    ELSIF v_product_mention_count < v_max_product_mentions THEN
        v_validation_msg := format('⚠️ ALERTA: Claude ficou abaixo do limite: %s menções (esperado: %s)',
                                  v_product_mention_count, v_max_product_mentions);
        RAISE WARNING '%', v_validation_msg;
    END IF;

    IF v_valid_timestamps IS NOT NULL THEN
        WITH response_timestamps AS (
            SELECT
                elem->>'comment_id' as comment_id,
                (regexp_matches(elem->>'response', '(\d{1,2}:\d{2})', 'g'))[1] as ts_used
            FROM jsonb_array_elements(v_result) elem
        )
        SELECT COUNT(*)
        INTO v_invalid_timestamp_count
        FROM response_timestamps rt
        WHERE rt.ts_used IS NOT NULL
        AND NOT (rt.ts_used = ANY(v_valid_timestamps));

        IF v_total_responses > 0 THEN
            v_invalid_timestamp_rate := (v_invalid_timestamp_count::numeric / v_total_responses::numeric) * 100;
        ELSE
            v_invalid_timestamp_rate := 0;
        END IF;

        IF v_invalid_timestamp_count > 0 THEN
            RAISE WARNING '⚠️ TIMESTAMPS INVÁLIDOS: % de % respostas (%%%) usam timestamps que NÃO existem na transcrição',
                         v_invalid_timestamp_count, v_total_responses, ROUND(v_invalid_timestamp_rate);
        END IF;
    END IF;

    WITH comment_map AS (
        SELECT
            c->>'comment_id' as comment_id,
            c->>'video_id' as video_id,
            c->>'cp_id' as cp_id
        FROM jsonb_array_elements(v_comments) c
    ),
    enriched_elements AS (
        SELECT
            element || jsonb_build_object(
                'video_id', cm.video_id,
                'cp_id', cm.cp_id,
                'project_id', p_project_id,
                'video_comment_count', v_video_comment_count,
                'max_product_mentions', v_max_product_mentions
            ) AS enriched
        FROM jsonb_array_elements(v_result) element
        LEFT JOIN comment_map cm ON cm.comment_id = element->>'comment_id'
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
        RETURN jsonb_build_object('error', SQLERRM);
END;
$function$;

-- =============================================
-- CHANGELOG:
-- ✅ 2025-12-30: FIX CRÍTICO - Adicionada seção "O QUE FAZ O PRODUTO"
--   - Claude estava inventando funcionalidades (encontrar produtos, ajudar com ads, etc)
--   - Adicionada lista explícita do que o produto FAZ e NÃO FAZ
--   - Adicionada regra para não responder saudações religiosas
--   - Adicionada instrução para usar tipo="engajamento" quando comentário
--     pergunta sobre algo que o produto não faz
-- ✅ 2025-11-17: FIX PRODUTO ERRADO
--   - Claude mencionava produtos DO VÍDEO ao invés do produto DO PROJETO
-- ✅ 2025-11-16: Múltiplas otimizações
--   - Timeout aumentado de 60s para 120s
--   - Prompt simplificado (28 → 17 parâmetros)
--   - Anti-repetição com trigrams de mensagens deletadas
-- =============================================
