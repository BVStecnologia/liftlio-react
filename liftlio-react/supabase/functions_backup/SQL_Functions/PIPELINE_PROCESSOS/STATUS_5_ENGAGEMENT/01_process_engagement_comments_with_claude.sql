-- =============================================
-- Migration: process_engagement_comments_with_claude
-- Data: 2025-10-17 14:00
-- Última atualização: 2025-11-17 00:00 (FIX PRODUTO ERRADO)
-- Sincronizado com Supabase LIVE em: 2025-11-17 00:00 UTC
--
-- 🔥 FIX CRÍTICO 2025-11-17 00:00:
-- ✅ PRODUTO ERRADO: Claude estava mencionando produtos DO VÍDEO (GoHighLevel, ClickFunnels)
--    ao invés do produto DO PROJETO (Liftlio)
--    SOLUÇÃO: Adicionada regra EXPLÍCITA em PT e EN:
--    "🚨 CRÍTICO - QUAL PRODUTO MENCIONAR:
--     ✅ MENCIONE APENAS: Liftlio (produto do PROJETO)
--     🚫 NUNCA MENCIONE: Produtos do vídeo (GoHighLevel, ClickFunnels, etc)"
--    Linhas modificadas: 374-378 (prompt PT), 451-455 (system EN)
--    Parâmetros ajustados: 15→17 (prompt), 6→8 (system)
--    RESULTADO: Claude agora menciona APENAS o produto correto (Liftlio)!
--
-- 🔥 FIX ANTERIOR 2025-11-16 23:30:
-- ✅ REGEXP_MATCHES: Removido do COALESCE (causava erro "set-returning functions are not allowed in COALESCE")
--    Movido para bloco separado com SELECT INTO v_product_name_match
--    Adicionada nova variável v_product_name_match TEXT[]
--    PROBLEMA RESOLVIDO: Função agora executa sem erros!
--
-- 🔥 OTIMIZAÇÃO 2025-11-16 22:00:
-- ✅ TIMEOUT: Aumentado de 60s → 120s (linha 449)
--    Prompt grande causava timeout, agora tem mais margem
-- ✅ PROMPT SIMPLIFICADO: Reduzido de 28 → 15 parâmetros (46% menor!)
--    Removidas redundâncias mantendo qualidade:
--    - Exemplos condensados (5 → 3)
--    - Instruções duplicadas removidas
--    - Mantidas regras críticas (anti-repetição, concisão, variação)
-- ✅ SYSTEM MESSAGE: Reduzido de 10 → 6 parâmetros (40% menor!)
--    Foco em brevidade sem perder essência
-- RESULTADO: Mais rápido, mais eficiente, mesma qualidade!
--
-- 🔥 FIX ANTERIOR 2025-11-16 21:30:
-- ✅ PRODUCT_NAME: Corrigido regex de extração
--    ANTES: SUBSTRING(...FROM 'Company or product name: ([^,]+)')
--           Pegava "Liftlio Audience description: Liftlio helps brands..." (até primeira vírgula)
--    AGORA: (regexp_matches(..., 'Company or product name:\s+(\S+)'))[1]
--           Pega apenas "Liftlio" (primeira palavra após "Company or product name:")
--    RESULTADO: Extração correta do nome do produto!
--
-- 🔥 AJUSTE 2025-11-16 21:00:
-- ✅ CONCISÃO: Instruções explícitas para 2-3 frases MAX, 40-60 palavras
-- ✅ VARIAÇÃO: Sistema de exemplos curtos (2 frases) e médios (3 frases)
--    Adicionado: "VARIE o tamanho! Alguns curtos, outros médios - NÃO faça todos iguais!"
--    Linhas modificadas: 380-382 (prompt PT), 490-491 (system message EN)
--    Exemplos atualizados: Separados em CURTO e MÉDIO com contagem de palavras
--    RESULTADO: Respostas mais naturais, variadas e concisas!
--
-- 🔥 FIX ANTERIOR 2025-11-16 20:00:
-- ✅ CORREÇÃO: Exemplos com %s causavam erro "too few arguments for format()"
--    PostgreSQL format() contava TODOS os %s, incluindo exemplos no prompt!
--    Mudado todos os exemplos de "%s" para "PRODUCTNAME" (texto literal)
--    Linhas corrigidas: 345, 346, 359-361, 369, 378, 464, 468-469, 472
--    RESULTADO: Função agora executa sem erros!
--
-- 🔥 FIX ANTERIOR 2025-11-16:
-- ✅ Removido v_project_description do prompt (causava spam: "Liftlio Audience description: ...")
-- ✅ Adicionada REGRA DE OURO: CONECTE PRIMEIRO, PRODUTO DEPOIS
-- ✅ Exemplos de boas/más respostas (com energia positiva)
-- ✅ Prompt simplificado - foco em naturalidade, não regras
-- ✅ System message mais claro e direto
--
-- Principais features:
-- ✅ Anti-repetição com LEAD window function (50 padrões dos últimos 60 dias)
-- ✅ Busca inteligente: Primeiro vídeo com comentários não analisados
-- ✅ Truncamento em 15 minutos (não 6000 chars fixo)
-- ✅ Extração de timestamps válidos da transcrição
-- ✅ Validação rigorosa: menções, duplicatas, travessões, timestamps baixos
-- ✅ Percentual dinâmico de menções ao produto
-- ✅ Escape de % em variáveis (previne "too few arguments for format()")
-- ✅ Prompt focado em CONEXÃO GENUÍNA antes de mencionar produto
-- =============================================

DROP FUNCTION IF EXISTS process_engagement_comments_with_claude(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.process_engagement_comments_with_claude(p_project_id integer, p_limit integer DEFAULT 10, p_video_id bigint DEFAULT NULL)
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
    -- Variáveis de validação
    v_duplicate_count INTEGER := 0;
    v_total_responses INTEGER := 0;
    v_unique_comment_ids INTEGER := 0;
    -- Variáveis para percentual dinâmico
    v_percentual_mencoes INTEGER;
    v_total_comentarios_processados INTEGER;
    -- Variáveis para truncamento de transcrição
    v_pos_cut INTEGER;
    v_i INTEGER;
    -- Variáveis para timestamps válidos (OPÇÃO 5)
    v_valid_timestamps TEXT[];
    v_timestamp_examples TEXT;
    v_invalid_timestamp_count INTEGER := 0;
    v_invalid_timestamp_rate NUMERIC;
    -- 🆕 Anti-repetição
    v_forbidden_patterns TEXT;
    -- 🆕 Comentários formatados
    v_comments_formatted TEXT;
    -- 🆕 Para extração de product_name
    v_product_name_match TEXT[];
BEGIN
    -- =============================================
    -- BUSCA INTELIGENTE: Primeiro vídeo com comentários não analisados
    -- =============================================
    -- Obter a transcrição do PRIMEIRO vídeo que tem comentários não analisados
    SELECT vt.trancription INTO v_transcript
    FROM "Comentarios_Principais" cp
    JOIN "Videos" v ON v.id = cp.video_id
    LEFT JOIN "Videos_trancricao" vt ON vt.id = v.transcript
    WHERE cp.project_id = p_project_id
    AND cp.mensagem = false  -- ✅ Apenas não analisados
    ORDER BY cp.id
    LIMIT 1;

    -- =============================================
    -- OTIMIZAÇÃO: Regex consolidado (4 operações → 1)
    -- =============================================
    IF v_transcript IS NOT NULL THEN
        v_transcript := regexp_replace(v_transcript, '\[0?0:(0[0-9]|1[0-4])\]', '', 'g');

        -- =============================================
        -- TRUNCAR TRANSCRIÇÃO EM 15 MINUTOS
        -- =============================================
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

        -- =============================================
        -- NOVA FEATURE: EXTRAIR TIMESTAMPS VÁLIDOS (OTIMIZADO)
        -- =============================================
        SELECT array_agg(DISTINCT ts ORDER BY ts)
        INTO v_valid_timestamps
        FROM regexp_matches(v_transcript, '\[(\d{1,2}:\d{2})\]', 'g') AS matches(ts);

        -- Criar lista simples para o prompt (sem contexto para economizar)
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

    -- =============================================
    -- 🆕 ANTI-REPETIÇÃO: Detectar padrões deletados (60 dias)
    -- =============================================
    WITH message_words AS (
        SELECT
            regexp_split_to_array(
                lower(regexp_replace(mensagem, '[^\\w\\s]', '', 'g')),
                '\\s+'
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
        E'\\n'
        ORDER BY repeat_count DESC
    )
    INTO v_forbidden_patterns
    FROM repeated_patterns
    LIMIT 50;

    -- Obter dados do projeto (incluindo percentual de menções) - FIX: sem regexp_matches em COALESCE
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
        v_product_name  -- Temporariamente Project name
    FROM "Projeto"
    WHERE id = p_project_id;

    -- FIX: Extração de product_name em bloco separado
    SELECT regexp_matches(v_project_description, 'Company or product name:\s+(\S+)')
    INTO v_product_name_match;

    IF v_product_name_match IS NOT NULL AND array_length(v_product_name_match, 1) > 0 THEN
        v_product_name := v_product_name_match[1];
    END IF;

    -- =============================================
    -- CORREÇÃO DO LIMIT: Limitar comentários ANTES do jsonb_agg
    -- =============================================
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
             WHERE cp2.video_id = v.id
             AND cp2.mensagem = false) as total_comments  -- ✅ Conta apenas não analisados
        FROM primeiro_comentario pc
        JOIN "Videos" v ON v.id = pc.video_id
        LEFT JOIN "Videos_trancricao" vt ON vt.id = v.transcript
        LIMIT 1
    ),
    -- ✅ NOVA CTE: Limita comentários ANTES do jsonb_agg
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
          AND cp.mensagem = false  -- ✅ Apenas não analisados
        ORDER BY
            CASE WHEN cp.lead_score IS NOT NULL AND cp.lead_score != '' THEN 0 ELSE 1 END,
            cp.id
        LIMIT p_limit  -- ✅ LIMIT nas linhas individuais!
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

    -- Se não houver comentários, retornar NULL
    IF v_comments IS NULL THEN
        RETURN NULL;
    END IF;

    -- Contar quantos comentários vamos processar
    SELECT jsonb_array_length(v_comments) INTO v_total_comentarios_processados;

    -- Calcular menções baseado APENAS no percentual do projeto
    v_max_product_mentions := GREATEST(
        1,
        CEIL(v_total_comentarios_processados * v_percentual_mencoes / 100.0)
    );

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

    -- 🆕 CONSTRUIR LISTA DE COMENTÁRIOS ANTES DO FORMAT
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
        E'\\n\\n'
    )
    INTO v_comments_formatted
    FROM jsonb_array_elements(v_comments) c;

    -- Construir prompt NATURAL e FOCADO EM CONEXÃO
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
        v_product_name,                         -- 2: MENCIONE APENAS (produto do PROJETO)
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

    -- Chamada Claude com SYSTEM MESSAGE + TIMEOUT 120s (aumentado de 60s)
    SELECT claude_complete(
        v_prompt,
        format('Regular video viewer creating authentic responses. BE FRIENDLY!

🎯 GOLDEN RULE: CONNECT FIRST, mention %s SECOND (if tipo="produto")

🚨 CRITICAL - WHICH PRODUCT TO MENTION:
✅ MENTION ONLY: %s (PROJECT product)
🚫 NEVER MENTION: Video products (GoHighLevel, ClickFunnels, etc)
✅ CORRECT: "I''ve been using %s to find..."
❌ WRONG: "he talks about using GoHighLevel..." (VIDEO product!)

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

    -- Validar resposta
    IF v_claude_response IS NULL THEN
        RETURN NULL;
    END IF;

    -- Tentar converter para JSONB com limpeza de markdown
    BEGIN
        v_claude_response := regexp_replace(v_claude_response, '^\s*```json\s*', '', 'i');
        v_claude_response := regexp_replace(v_claude_response, '\s*```\s*$', '');
        v_claude_response := trim(v_claude_response);
        v_result := v_claude_response::JSONB;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('error', 'Invalid JSON from Claude', 'response', v_claude_response);
    END;

    -- Validação anti-duplicata
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

    -- Validar se Claude respeitou o limite de menções
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

    -- =============================================
    -- VALIDAÇÃO: Timestamps inválidos (não na lista)
    -- =============================================
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

    -- =============================================
    -- OTIMIZAÇÃO: Enrichment com JOIN (não subqueries)
    -- =============================================
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
-- CHANGELOG COMPLETO:
-- ✅ 2025-10-17: Prompt universal aplicável a qualquer produto
-- ✅ 2025-10-25: Regra anti-travessão + limpeza markdown code blocks
-- ✅ 2025-10-26: FIX timestamps baixos (3 camadas de proteção)
-- ✅ 2025-10-27: FIX duplicatas + relevância + refactor validações
-- ✅ 2025-10-27: Percentual dinâmico de menções ao produto
-- ✅ 2025-10-27: Instrução robusta de proporção exata
-- ✅ 2025-10-31: Busca inteligente (primeiro vídeo não analisado)
-- ✅ 2025-10-31: Truncamento em 15 min (não 6000 chars)
-- ✅ 2025-10-31: Extração de timestamps válidos da transcrição
-- ✅ 2025-10-31: Validação de timestamps inválidos (não na lista)
-- ✅ 2025-10-31: Otimização enrichment com JOIN (não subqueries)
-- ✅ 2025-10-31: Validação rigorosa (warning se abaixo OU acima)
-- ✅ 2025-10-31: Instruções sobre variação de estrutura de frases
-- ✅ 2025-11-14: FIX CRÍTICO: Exemplos concretos de menção ao produto
--                Adicionado definição explícita tipo_resposta = "produto"
--                Remove ambiguidade "INDIRECTLY" que causava respostas sem nome do produto
--                11 novos exemplos de frases mencionando produto naturalmente
-- ✅ 2025-11-16: ANTI-REPETIÇÃO: Sistema de detecção de padrões deletados
--                Analisa mensagens deletadas nos últimos 60 dias
--                Extrai trigrams (3-word patterns) com 2+ repetições
--                Fornece exemplos alternativos para mencionar produto
--                TRUNCAMENTO: Reduzido de 30 para 15 minutos (economia tokens)
--                ESCAPE %: Corrigido erro "too few arguments for format()"
--                OTIMIZAÇÃO MODERADA (OPÇÃO 2): 872→660 linhas (-24%)
--                  • Removidas variáveis não usadas (v_project_name, validação timestamps)
--                  • Removidos 10 RAISE NOTICE (mantidos apenas RAISE WARNING críticos)
--                  • PROMPT consolidado (duplicatas removidas, mais conciso)
--                  • SYSTEM MESSAGE consolidado (argumentos corretos: 15)
--                  • Função mantém todas features: anti-repetição, truncamento 15min, validações
-- =============================================
