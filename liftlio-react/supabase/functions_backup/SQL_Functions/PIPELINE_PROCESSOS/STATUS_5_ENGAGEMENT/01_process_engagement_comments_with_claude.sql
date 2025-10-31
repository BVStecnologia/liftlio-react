-- =============================================
-- Migration: process_engagement_comments_with_claude
-- Data: 2025-10-17 14:00
-- Última atualização completa: 2025-10-31
-- Sincronizado com Supabase LIVE em: 2025-10-31
--
-- Principais features:
-- ✅ Busca inteligente: Primeiro vídeo com comentários não analisados
-- ✅ Truncamento em 30 minutos (não 6000 chars fixo)
-- ✅ Extração de timestamps válidos da transcrição
-- ✅ Validação de timestamps inválidos (não na lista)
-- ✅ Otimização de enrichment com JOIN (não subqueries)
-- ✅ Validação rigorosa de menções (warning se abaixo OU acima)
-- ✅ Percentual dinâmico de menções ao produto
-- ✅ Anti-duplicata, anti-travessão, anti-timestamps-baixos
-- ✅ Instruções sobre variação de estrutura de frases
-- =============================================

DROP FUNCTION IF EXISTS process_engagement_comments_with_claude(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.process_engagement_comments_with_claude(p_project_id integer, p_limit integer DEFAULT 10)
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
    -- Variáveis de validação
    v_response_without_timestamp INTEGER := 0;
    v_response_with_low_timestamp INTEGER := 0;
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
        RAISE NOTICE 'Transcrição filtrada: timestamps < 00:15 removidos';

        -- =============================================
        -- TRUNCAR TRANSCRIÇÃO EM 30 MINUTOS
        -- =============================================
        v_pos_cut := position('[30:' in v_transcript);

        IF v_pos_cut = 0 THEN
            v_i := 31;
            WHILE v_i <= 59 AND v_pos_cut = 0 LOOP
                v_pos_cut := position('[' || v_i::text || ':' in v_transcript);
                v_i := v_i + 1;
            END LOOP;
        END IF;

        IF v_pos_cut = 0 THEN
            v_pos_cut := position('[0:30:' in v_transcript);
            IF v_pos_cut = 0 THEN
                v_pos_cut := position('[1:30:' in v_transcript);
            END IF;
        END IF;

        IF v_pos_cut > 0 THEN
            v_transcript := substring(v_transcript from 1 for v_pos_cut - 1);
            RAISE NOTICE '✂️ Transcrição truncada em 30 minutos';
        ELSE
            RAISE NOTICE '✅ Transcrição < 30 min (mantida completa)';
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
            RAISE NOTICE '🎯 Timestamps válidos extraídos: %', array_length(v_valid_timestamps, 1);
        ELSE
            v_timestamp_examples := NULL;
        END IF;
    END IF;

    -- Obter dados do projeto (incluindo percentual de menções)
    WITH project_data AS (
        SELECT
            "País",
            COALESCE(
                SUBSTRING("description service" FROM 'Company or product name: ([^,]+)'),
                "Project name"
            ) as product_name,
            "description service",
            "Keywords",
            prompt_user,
            COALESCE(percentual_mencoes_produto, 50) as percentual_mencoes
        FROM "Projeto"
        WHERE id = p_project_id
    )
    SELECT
        "País",
        product_name,
        "description service",
        "Keywords",
        prompt_user,
        percentual_mencoes
    INTO
        v_project_country,
        v_product_name,
        v_project_description,
        v_project_keywords,
        v_user_special_instructions,
        v_percentual_mencoes
    FROM project_data;

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
        RAISE NOTICE 'Nenhum comentário pendente encontrado para o projeto %', p_project_id;
        RETURN NULL;
    END IF;

    -- Contar quantos comentários vamos processar
    SELECT jsonb_array_length(v_comments) INTO v_total_comentarios_processados;

    -- Calcular menções baseado APENAS no percentual do projeto
    v_max_product_mentions := GREATEST(
        1,
        CEIL(v_total_comentarios_processados * v_percentual_mencoes / 100.0)
    );

    -- Logging detalhado
    RAISE NOTICE '✅ Vídeo: % comentários não analisados | Processando: % comentários | Percentual configurado: %%% | Menções produto: %',
                 v_video_comment_count, v_total_comentarios_processados, v_percentual_mencoes, v_max_product_mentions;

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

REGRA OBRIGATÓRIA DE PROPORÇÃO - LEIA COM ATENÇÃO:
Você receberá %s comentários para analisar.
Este vídeo tem %s comentários não analisados no total.
Configuração deste projeto: %s%%%% produto + %s%%%% engajamento

OBRIGATÓRIO - Você DEVE responder TODOS os comentários com EXATAMENTE esta distribuição:
→ EXATAMENTE %s respostas tipo "produto" (menciona produto %s naturalmente)
→ EXATAMENTE %s respostas tipo "engajamento" (apenas engajamento, SEM mencionar produto)

ATENÇÃO: Não é "até %s menções" ou "no máximo %s". É EXATAMENTE %s menções ao produto, nem mais, nem menos.

ESTRATÉGIA OBRIGATÓRIA DE DISTRIBUIÇÃO:
1. SEMPRE use tipo "produto" para comentários com "is_lead": true PRIMEIRO
2. Se houver MENOS leads que slots de produto disponíveis:
   - Use tipo "produto" em TODOS os leads
   - Complete os slots restantes de produto com não-leads que demonstrem maior interesse/problema
3. Se houver MAIS leads que slots de produto disponíveis:
   - Priorize leads com contexto mais forte de problema/necessidade específica
   - Use tipo "engajamento" nos leads menos qualificados
4. Use tipo "engajamento" nos comentários restantes:
   - Foque em criar conexão genuína SEM mencionar o produto
   - Demonstre que assistiu ao vídeo usando timestamps e contexto

CRÍTICO: Você DEVE responder TODOS OS %s COMENTÁRIOS RECEBIDOS.
Total de respostas: %s produto + %s engajamento = %s respostas

Contexto do Produto (use naturalmente quando relevante):
Nome: %s
Descrição: %s
Nicho/Keywords: %s

Contexto do Vídeo:
Título: %s
Descrição: %s
%s
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
3. CRUCIAL: Use APENAS timestamps da lista acima - NUNCA invente timestamps
4. CRUCIAL: Use detalhes específicos da transcrição do vídeo
5. Mantenha as respostas curtas - máximo 2 frases
6. Demonstre que você realmente assistiu ao vídeo usando timestamps específicos
7. Gere uma conversa natural e engajadora como um USUÁRIO COMUM (não como especialista)
8. Jamais use @mentions
9. Evite respostas genéricas - sempre referencie partes específicas do vídeo
10. Sempre responda, jamais dê uma mensagem de erro
11. Para cada resposta, forneça uma justificativa em inglês em primeira pessoa explicando seu raciocínio
12. IMPORTANTE: Adicione "tipo_resposta" em cada resposta: "produto" se mencionar o produto, "engajamento" caso contrário
13. CRÍTICO: JAMAIS use travessões (-) para conectar ou separar frases. Use ponto final (.) para separar sentenças
14. CRÍTICO: VARIE a estrutura das frases com timestamps - NÃO comece TODAS com "At X:XX" ou "Em X:XX"
    Exemplos de variação:
    ✓ "At 12:30 she mentions..." (início)
    ✓ "She talks about this at 12:30..." (meio)
    ✓ "That''s exactly what she said at 12:30" (fim)
    ✓ "Around 12:30 she..." (casual)
    ✓ "The 12:30 section about..." (sem "at")
    ✓ "I loved when she said at 08:20..." (primeira pessoa)
    MISTURE essas estruturas! Cada resposta deve ter estrutura DIFERENTE.

⚠️ TIMESTAMPS PROIBIDOS: [00:00] a [00:14] (NÃO USE!)

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
        v_total_comentarios_processados,
        v_video_comment_count,
        v_percentual_mencoes,
        (100 - v_percentual_mencoes),
        v_max_product_mentions,
        v_product_name,
        (v_total_comentarios_processados - v_max_product_mentions),
        v_max_product_mentions,
        v_max_product_mentions,
        v_max_product_mentions,
        v_total_comentarios_processados,
        v_max_product_mentions,
        (v_total_comentarios_processados - v_max_product_mentions),
        v_total_comentarios_processados,
        v_product_name,
        v_project_description,
        v_project_keywords,
        replace(v_comments->0->>'video_title', '"', ''''),
        replace(v_comments->0->>'video_description', '"', ''''),
        CASE WHEN v_timestamp_examples IS NOT NULL
             THEN E'\n\n' || v_timestamp_examples || E'\n'
             ELSE ''
        END,
        COALESCE(v_transcript, 'Transcrição não disponível'),
        COALESCE(replace(v_template_messages, '"', ''''), 'Sem exemplos disponíveis'),
        COALESCE(replace(v_user_liked_examples, '"', ''''), 'Sem exemplos adicionais'),
        COALESCE(replace(v_user_special_instructions, '"', ''''), 'Sem instruções especiais'),
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
        ) FROM jsonb_array_elements(v_comments) c),
        COALESCE(v_project_country, 'Português')
    );

    -- Chamada Claude com SYSTEM MESSAGE + TIMEOUT 60s
    SELECT claude_complete(
        v_prompt,
        format('You are a regular YouTube viewer creating authentic responses.

CRITICAL RULES:
1. EVERY response MUST include at least ONE video timestamp
2. Use ONLY timestamps from the VALID TIMESTAMPS LIST provided above - NEVER invent
3. NEVER use timestamps below 00:15 (video intro/vignette)
4. Mention product/service INDIRECTLY as a regular user sharing personal experience
5. You MUST respond ONLY with a valid JSON array
6. No explanatory text outside JSON
7. CRITICAL: VARY your timestamp sentence structures - DO NOT start every response with "At X:XX"
   Mix these formats:
   • "At 12:30 she..." (start)
   • "She mentions at 12:30..." (middle)
   • "That''s what she covered at 12:30" (end)
   • "Around 12:30 she..." (casual)
   • "The 12:30 part about..." (no "at")
   Each response should use a DIFFERENT structure.

⚠️ FORBIDDEN: Inventing timestamps not in the provided list
⚠️ FORBIDDEN: Starting ALL responses with "At X:XX"
⚠️ FORBIDDEN: Exceeding the product mention limit
✅ REQUIRED: Use ONLY timestamps from the valid list
✅ REQUIRED: Vary your sentence structures
✅ REQUIRED: EXACTLY %s product mentions (not "up to" - EXACTLY)

Language: %s

CRITICAL PROPORTION RULE - READ CAREFULLY:
- You MUST respond to ALL %s comments received
- EXACTLY %s responses tipo "produto" (mentioning %s) - NOT MORE, NOT LESS
- EXACTLY %s responses tipo "engajamento" (NO product mention) - NOT MORE, NOT LESS
- This is NOT "maximum" or "up to". This is MANDATORY EXACT COUNT.
- Total responses must be: %s product + %s engagement = %s total

Remember:
- Pick timestamps from the VALID LIST ONLY
- VARY your timestamp sentence structures (not all "At X:XX")
- Use timestamps naturally to show you watched the video
- Keep responses short (max 2 sentences)
- Never use @mentions
- GO DIRECTLY TO THE POINT without introductions or greetings
- Include justification in FIRST PERSON explaining your reasoning
- ALWAYS use tipo "produto" for comments with "is_lead": true FIRST
- CRITICAL: Generate EXACTLY %s product mentions, no more, no less

Always respond exactly in this structure:
[
  {
    "comment_id": "ID",
    "response": "response WITH TIMESTAMP FROM VALID LIST",
    "tipo_resposta": "produto" or "engajamento",
    "justificativa": "I [first person] explanation..."
  }
]

Respond only with the requested JSON array, with no additional text.',
               v_max_product_mentions,
               COALESCE(v_project_country, 'Português'),
               v_total_comentarios_processados,
               v_max_product_mentions,
               v_product_name,
               (v_total_comentarios_processados - v_max_product_mentions),
               v_max_product_mentions,
               (v_total_comentarios_processados - v_max_product_mentions),
               v_total_comentarios_processados,
               v_max_product_mentions
        ),
        4000,
        0.7,
        60000
    ) INTO v_claude_response;

    -- Validar resposta
    IF v_claude_response IS NULL THEN
        RAISE NOTICE 'Claude retornou NULL';
        RETURN NULL;
    END IF;

    -- Tentar converter para JSONB com limpeza de markdown
    BEGIN
        v_claude_response := regexp_replace(v_claude_response, '^\s*```json\s*', '', 'i');
        v_claude_response := regexp_replace(v_claude_response, '\s*```\s*$', '');
        v_claude_response := trim(v_claude_response);
        v_result := v_claude_response::JSONB;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao converter resposta do Claude: %', SQLERRM;
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

        RAISE NOTICE '✅ Duplicatas removidas. Total de respostas: % → %', v_total_responses, v_unique_comment_ids;
    ELSE
        RAISE NOTICE '✅ Nenhuma duplicata detectada (%s respostas únicas)', v_total_responses;
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
    ELSE
        v_validation_msg := format('✅ Menções perfeitas: %s de %s',
                                  v_product_mention_count, v_max_product_mentions);
        RAISE NOTICE '%', v_validation_msg;
    END IF;

    -- Validação: Timestamps presentes
    SELECT COUNT(*)
    INTO v_response_without_timestamp
    FROM jsonb_array_elements(v_result) elem
    WHERE
        elem->>'response' NOT LIKE '%[%:%]%' AND
        elem->>'response' NOT LIKE '%:%' AND
        elem->>'response' NOT LIKE '%em %:%';

    IF v_response_without_timestamp > 0 THEN
        RAISE WARNING '⚠️ % respostas sem timestamp detectadas', v_response_without_timestamp;
    ELSE
        RAISE NOTICE '✅ Todas as respostas contêm timestamps';
    END IF;

    -- Validação: Detectar timestamps baixos < 00:15
    SELECT COUNT(*)
    INTO v_response_with_low_timestamp
    FROM jsonb_array_elements(v_result) elem
    WHERE
        elem->>'response' ~ '(\s|em\s|At\s)(00:|0:)(0[0-9]|1[0-4])(\s|\.|\!|,)';

    IF v_response_with_low_timestamp > 0 THEN
        RAISE WARNING '⚠️ ALERTA: % respostas com timestamps muito baixos (< 00:15) detectadas', v_response_with_low_timestamp;
    ELSE
        RAISE NOTICE '✅ Nenhum timestamp baixo (< 00:15) detectado';
    END IF;

    -- =============================================
    -- NOVA VALIDAÇÃO: Timestamps inválidos (não na lista)
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
            RAISE WARNING '⚠️ TIMESTAMPS INVÁLIDOS: % de % respostas (%.1f%%) usam timestamps que NÃO existem na transcrição',
                         v_invalid_timestamp_count, v_total_responses, v_invalid_timestamp_rate;
        ELSE
            RAISE NOTICE '✅ Todos os timestamps usados são válidos (existem na transcrição)';
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
        RAISE NOTICE 'Erro na função: % %', SQLERRM, SQLSTATE;
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
-- ✅ 2025-10-31: Truncamento em 30 min (não 6000 chars)
-- ✅ 2025-10-31: Extração de timestamps válidos da transcrição
-- ✅ 2025-10-31: Validação de timestamps inválidos (não na lista)
-- ✅ 2025-10-31: Otimização enrichment com JOIN (não subqueries)
-- ✅ 2025-10-31: Validação rigorosa (warning se abaixo OU acima)
-- ✅ 2025-10-31: Instruções sobre variação de estrutura de frases
-- =============================================
