-- =============================================
-- Funcao: create_initial_video_comment_with_claude
-- Tipo: Funcao BASE (nao faz INSERT)
--
-- Descricao:
--   Gera comentario EGO-FIRST para video do YouTube usando Strategy #4.
--   ZERO mencao a produto/servico - foco 100% em ego boost + pergunta estrategica.
--   Pergunta e construida para ABRIR espaco para reply mencionar produto naturalmente.
--
-- Estrategia (Comment Pair - Part 1):
--   1. Analisa transcricao para identificar pain point que produto resolve
--   2. Cria ego boost sobre esse ponto especifico (com timestamp)
--   3. Faz pergunta sobre como creator LIDA/ABORDA esse desafio
--   4. Adiciona variabilidade (tom casual 6-9/10, imperfeicoes naturais)
--
-- Archetypes Psicologicos (escolhido dinamicamente):
--   - RECOGNITION: Elogia clareza + pergunta sobre dificuldades comuns
--   - CURIOSITY: Reflexao "what if" + pergunta exploratoria
--   - ALIGNMENT: Concordancia forte + pergunta sobre processo
--   - APPRECIATION: Agradecimento + pergunta sobre detalhe critico
--
-- Entrada:
--   p_project_id INTEGER - ID do projeto (busca pais, produto, keywords, instrucoes)
--   p_video_id INTEGER   - ID do video (busca titulo, descricao, transcricao, categoria)
--
-- Saida:
--   JSONB contendo:
--   - comment: texto do comentario (EGO + PERGUNTA, zero produto)
--   - justificativa: explicacao do raciocinio usado
--   - youtube_video_id: ID do video no YouTube
--   - debug_info: informacoes de debug de cada etapa
--
-- Conexoes:
--    Chamada por: 02_create_and_save_initial_comment (que faz o INSERT)
--    NAO faz INSERT - apenas retorna o texto gerado
--
-- Criado: 2025-01-23
-- Atualizado: 2025-10-01 - Documentacao melhorada
-- Atualizado: 2025-10-24 - JSON parsing robusto com regex cleanup + erro propagado
-- Atualizado: 2025-01-12 - REDESIGN: Strategy #4 (ego-first, zero produto, pergunta estrategica)
-- Atualizado: 2025-01-17 - Anti-spam improvements: removed business triggers, casual language
-- Atualizado: 2025-01-20 - Anti-repetition system (60 dias, trigrams, padroes deletados)
-- =============================================

DROP FUNCTION IF EXISTS create_initial_video_comment_with_claude(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION create_initial_video_comment_with_claude(p_project_id INTEGER, p_video_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_claude_response TEXT;
    v_json_clean TEXT;
    v_prompt TEXT;
    v_project_country TEXT;
    v_transcript TEXT;
    v_project_description TEXT;
    v_project_keywords TEXT;
    v_product_name TEXT;
    v_result JSONB;
    v_user_liked_examples TEXT;
    v_user_special_instructions TEXT;
    v_video_data JSONB;
    v_debug_info JSONB := '{}';

    -- Variáveis de randomização para anti-spam detection
    v_tone_variance INTEGER;
    v_target_word_count INTEGER;
    v_imperfection_type TEXT;
    v_use_emoji BOOLEAN;

    -- 🆕 Anti-repetição (60 dias)
    v_forbidden_patterns TEXT;
    -- 🆕 Anti-repetição de aberturas (primeiras 5 palavras)
    v_forbidden_openings TEXT;
BEGIN
    -- Registrar início da execução
    v_debug_info := v_debug_info || jsonb_build_object('step', 'start', 'timestamp', clock_timestamp());

    -- Randomizar variáveis para anti-spam detection
    v_tone_variance := floor(random() * 4) + 6;           -- Tom casual: 6-9
    v_target_word_count := floor(random() * 9) + 16;      -- Palavras: 16-24
    v_use_emoji := (random() > 0.65);                     -- 35% chance de emoji

    -- Selecionar tipo de imperfeição aleatoriamente
    v_imperfection_type := CASE floor(random() * 5)
        WHEN 0 THEN 'honestly'
        WHEN 1 THEN 'kind of'
        WHEN 2 THEN 'lowkey'
        WHEN 3 THEN 'pretty wild'
        ELSE 'none'
    END;

    v_debug_info := v_debug_info || jsonb_build_object(
        'step', 'randomization',
        'tone_variance', v_tone_variance,
        'target_word_count', v_target_word_count,
        'imperfection_type', v_imperfection_type,
        'use_emoji', v_use_emoji
    );

    -- =============================================
    -- 🆕 ANTI-REPETIÇÃO: Detectar padrões deletados (60 dias)
    -- =============================================
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
        E'
'
        ORDER BY repeat_count DESC
    )
    INTO v_forbidden_patterns
    FROM repeated_patterns
    LIMIT 50;

    -- Obter a transcricao do video
    -- =============================================
    -- 🆕 ANTI-REPETIÇÃO: Detectar padrões de abertura (últimas 20 mensagens)
    -- =============================================
    WITH recent_openings AS (
        SELECT
            ARRAY_TO_STRING(
                (STRING_TO_ARRAY(mensagem, ' '))[1:5],
                ' '
            ) as opening_pattern
        FROM "Mensagens"
        WHERE project_id = p_project_id
            AND "Comentario_Principais" IS NULL
        ORDER BY created_at DESC
        LIMIT 20
    ),
    unique_openings AS (
        SELECT
            opening_pattern,
            COUNT(*) as usage_count
        FROM recent_openings
        GROUP BY opening_pattern
    )
    SELECT string_agg(
        '- "' || opening_pattern || '" (' || usage_count || 'x usado)',
        E'
'
        ORDER BY usage_count DESC
    )
    INTO v_forbidden_openings
    FROM unique_openings;
    BEGIN
        SELECT vt.trancription INTO v_transcript
        FROM "Videos" v
        LEFT JOIN "Videos_trancricao" vt ON vt.id = v.transcript
        WHERE v.id = p_video_id;

        v_debug_info := v_debug_info || jsonb_build_object('step', 'transcript', 'success', v_transcript IS NOT NULL);
    EXCEPTION WHEN OTHERS THEN
        v_debug_info := v_debug_info || jsonb_build_object('step', 'transcript', 'error', SQLERRM);
        RAISE;
    END;

    -- Obter dados do projeto
    BEGIN
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

        v_debug_info := v_debug_info || jsonb_build_object('step', 'project_data',
                                                         'success', v_product_name IS NOT NULL,
                                                         'country', v_project_country,
                                                         'product', v_product_name);
    EXCEPTION WHEN OTHERS THEN
        v_debug_info := v_debug_info || jsonb_build_object('step', 'project_data', 'error', SQLERRM);
        RAISE;
    END;

    -- Obter informações do video
    BEGIN
        SELECT jsonb_build_object(
            'video_id', v.id,
            'youtube_video_id', v."VIDEO",
            'video_title', v.video_title,
            'video_description', v.video_description,
            'video_tags', v.video_tags,
            'content_category', v.content_category
        ) INTO v_video_data
        FROM "Videos" v
        WHERE v.id = p_video_id;

        v_debug_info := v_debug_info || jsonb_build_object('step', 'video_data',
                                                         'success', v_video_data IS NOT NULL);
    EXCEPTION WHEN OTHERS THEN
        v_debug_info := v_debug_info || jsonb_build_object('step', 'video_data', 'error', SQLERRM);
        RAISE;
    END;

    -- Obter exemplos de mensagens que o usuario gostou
    BEGIN
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

        v_debug_info := v_debug_info || jsonb_build_object('step', 'user_examples',
                                                         'success', true,
                                                         'has_examples', v_user_liked_examples IS NOT NULL AND v_user_liked_examples != '');
    EXCEPTION WHEN OTHERS THEN
        v_debug_info := v_debug_info || jsonb_build_object('step', 'user_examples', 'error', SQLERRM);
        -- Não vamos interromper aqui se esta parte falhar
        v_user_liked_examples := 'Sem exemplos disponíveis';
    END;

    -- Criar o prompt MELHORADO (Strategy #4: Ego-First + Anti-Spam)
    BEGIN
        v_prompt := format(
            '🎯 STRATEGY #4: EGO-FIRST COMMENT (Zero Product Mention)

You are creating the FIRST comment in a two-part engagement strategy.
This comment will later be replied to with a second comment that mentions the product.

═══════════════════════════════════════════════════════════════

📹 VIDEO CONTEXT:
Title: %s
Category: %s
Tags: %s

📝 TRANSCRIPT (analyze for pain points):
%s

🛠️ PRODUCT/SERVICE CONTEXT (DO NOT MENTION - Use only to guide question strategy):
What it does: %s
This helps you identify pain points in the video that the product solves.

💡 APPROVED EXAMPLES (tone/style reference only):
%s

🚫 USER RESTRICTIONS (what NOT to do):
%s

🔥 ANTI-REPETITION (avoid these deleted patterns from last 60 days):
%s

CRITICAL: Do NOT use these word combinations - they were repeatedly deleted!

🎭 PADRÕES DE ABERTURA PROIBIDOS (NÃO comece com estes - usados nas últimas 20 mensagens):
%s

CRÍTICO: Escolha uma estrutura de abertura COMPLETAMENTE DIFERENTE!


═══════════════════════════════════════════════════════════════

🎯 YOUR TASK:

1️⃣ ANALYZE TRANSCRIPT:
   - Identify ONE pain point, challenge, or workflow issue mentioned
   - This should be something the product helps solve (but DON''T mention it!)
   - Find a REAL timestamp from the transcript where this is discussed
   - CRITICAL: Use ONLY timestamps that actually appear in the transcript provided
   - DO NOT invent or guess timestamps - extract them from the transcript text

2️⃣ CREATE EGO-FIRST COMMENT:
   Structure: [Ego Boost] + [Casual Question]

   Sentence 1: Ego boost about that specific point (with timestamp)
   Sentence 2: Casual question about creator''s experience/approach
   
   ⚠️ ANTI-SPAM RULES (CRITICAL):
   NEVER use these business/sales terms:
   - scale, scaling, scaled
   - optimize, optimization
   - ROI, metrics, KPIs
   - clients, customers, accounts
   - agencies, businesses
   - track, tracking
   - prove, proof, results
   - Numbers + nouns (50+ clients, 1000+ entries, 100 accounts, etc.)
   
   ALWAYS use personal/experiential language:
   - "How do you...", "When did you...", "What helped you..."
   - "Have you tried...", "Did you find...", "Would you..."
   - Focus on creator''s EXPERIENCE, not business metrics

3️⃣ ARCHETYPE SELECTION (choose one dynamically):

   🏆 RECOGNITION (best for educational/tutorial videos):
   "This breakdown at 12:45 really clarified things. Do most people miss that detail?"

   🤔 CURIOSITY (best for innovative/experimental content):
   "Never thought about doing it in reverse. Have you tried that approach?"

   🤝 ALIGNMENT (best for opinion/mindset videos):
   "Totally agree with your take. What made you land on this approach?"

   🙏 APPRECIATION (best for problem-solving videos):
   "This explanation at 8:30 helped a lot. When did it finally click for you?"

═══════════════════════════════════════════════════════════════

⚙️ VARIABILITY PARAMETERS (randomize to avoid spam detection):
- Tone casual level: %s/10
- Target word count: %s words (±3)
- Add imperfection: "%s" (if not "none", use it naturally)
- Emoji allowed: %s

═══════════════════════════════════════════════════════════════

✅ RULES:
1. Language: %s
2. ZERO product/service mentions (critical!)
3. MUST include timestamp that EXISTS in the transcript (format: 12:45, 8:30, etc.)
   → Extract it directly from the transcript text, DO NOT invent timestamps
4. MUST reference specific detail from transcript (quote, term, concept mentioned)
5. Question should be CASUAL and EXPERIENTIAL (not business-focused)
6. 2 sentences maximum
7. Natural, casual YouTube tone
8. No greetings, no clichés, no @mentions
9. Go straight to the point
10. Sound like a regular viewer, not a consultant/marketer

❌ BAD EXAMPLES (avoid these patterns):
"Great video! What tools do you use?" (generic, obvious setup)
"How do you handle this when you scale to 1000+ entries?" (business language + numbers)
"What''s your ROI on this approach?" (sales terminology)
"How do you prove this to clients?" (business context)

✅ GOOD EXAMPLES (follow these patterns):
"That point at 12:45 about manual work hit different. How did you used to handle this?"
(specific timestamp, casual tone, experiential question)

"The way you explained that at 8:30 makes so much sense. When did you figure this out?"
(timestamp, personal question about their journey)

"Never thought about it from that angle at 15:20. Have you always done it this way?"
(timestamp, curiosity about their experience)

═══════════════════════════════════════════════════════════════

RETURN JSON (only this, no extra text):
{
  "comment": "Your ego-first comment here",
  "justificativa": "I identified pain point X at timestamp Y, chose [archetype] because..."
}

CRITICAL: Start response with { and end with }. No markdown, no code blocks, no extra text.',
            v_video_data->>'video_title',
            v_video_data->>'content_category',
            v_video_data->>'video_tags',
            COALESCE(v_transcript, 'Transcrição não disponível'),
            v_project_description,
            COALESCE(v_user_liked_examples, 'Sem exemplos disponíveis'),
            COALESCE(v_user_special_instructions, 'Sem instruções específicas'),
            COALESCE(replace(v_forbidden_patterns, '%', '%%'), 'Nenhum padrão deletado ainda'), -- 🆕 Anti-repetição
            COALESCE(v_forbidden_openings, 'Nenhum padrão de abertura detectado ainda'),
            v_tone_variance,
            v_target_word_count,
            v_imperfection_type,
            CASE WHEN v_use_emoji THEN 'yes' ELSE 'no' END,
            COALESCE(v_project_country, 'Português')
        );

        v_debug_info := v_debug_info || jsonb_build_object('step', 'prompt_creation', 'success', true);
    EXCEPTION WHEN OTHERS THEN
        v_debug_info := v_debug_info || jsonb_build_object('step', 'prompt_creation', 'error', SQLERRM);
        RAISE;
    END;

    -- Chamada Claude com SYSTEM MESSAGE MELHORADO (Anti-Spam)
    BEGIN
        v_debug_info := v_debug_info || jsonb_build_object('step', 'before_claude_call', 'timestamp', clock_timestamp());

        SELECT claude_complete(
            v_prompt,
            format('You are an expert at creating authentic, casual YouTube comments that avoid spam detection.

STRATEGY: Comment Pair System (Part 1 of 2)
- This is the FIRST comment (ego boost + casual question)
- A SECOND comment (reply) will mention the product later
- Your comment must sound like a REGULAR VIEWER, not a marketer

CORE OBJECTIVES:
1. Make creator feel SEEN and RESPECTED (ego trigger)
2. Ask EXPERIENTIAL question (about their journey/experience)
3. Use REAL timestamp from transcript + specific detail to prove you watched
   → CRITICAL: Extract timestamp directly from transcript, do NOT invent
4. Zero promotional tone - 100%% authentic community member
5. Avoid ALL business/sales language that triggers spam filters

SPAM FILTER AVOIDANCE (CRITICAL):
YouTube filters comments via API more aggressively. NEVER use:
❌ Business terms: scale, optimize, ROI, metrics, clients, agencies, tracking
❌ Numbers + nouns: "50+ clients", "1000+ entries", "100 accounts"
❌ Sales language: prove, results, performance, conversion
✅ Use instead: Personal questions about their experience/journey

ARCHETYPE SELECTION:
- Recognition: Educational content → compliment clarity + ask about common mistakes
- Curiosity: Innovative content → express wonder + ask if they tried variations
- Alignment: Opinion content → agree + ask what led them to this view
- Appreciation: Problem-solving → thank + ask when it clicked for them

CRITICAL RULES:
- Language: %s
- ZERO product mentions (this is part 1!)
- ZERO business terminology
- Timestamp required (from transcript)
- 2 sentences max
- Casual, imperfect tone (like real person)
- Experiential questions only ("How did you...", "When did...", "Have you...")

TONE: Sound like someone who genuinely watched and found value, asking about
the creator''s personal experience - NOT a marketer doing outreach.

JSON FORMAT (only this, no extra text):
{
  "comment": "Your ego-first comment here",
  "justificativa": "I identified pain point X at Y timestamp, chose Z archetype because..."
}',
                   COALESCE(v_project_country, 'Português')),
            4000,
            0.7
        ) INTO v_claude_response;

        v_debug_info := v_debug_info || jsonb_build_object('step', 'claude_call',
                                                         'success', v_claude_response IS NOT NULL,
                                                         'response_length', length(v_claude_response));
    EXCEPTION WHEN OTHERS THEN
        v_debug_info := v_debug_info || jsonb_build_object('step', 'claude_call', 'error', SQLERRM);
        RAISE;
    END;

    -- Limpar e validar a resposta JSON
    BEGIN
        -- Remover texto antes do primeiro { e depois do último }
        v_json_clean := regexp_replace(v_claude_response, '^[^{]*', ''); -- Remove tudo antes de {
        v_json_clean := regexp_replace(v_json_clean, '[^}]*$', '');      -- Remove tudo depois de }

        -- Adicionar debug info sobre a limpeza
        v_debug_info := v_debug_info || jsonb_build_object(
            'step', 'json_cleaning',
            'original_length', length(v_claude_response),
            'cleaned_length', length(v_json_clean),
            'removed_prefix', length(v_claude_response) - length(regexp_replace(v_claude_response, '^[^{]*', ''))
        );

        -- Testar se o JSON limpo é válido
        PERFORM (v_json_clean::jsonb)->>'comment';

        -- Se chegou aqui, o JSON é válido - substituir a resposta original
        v_claude_response := v_json_clean;

        v_debug_info := v_debug_info || jsonb_build_object('step', 'json_validation', 'success', true);
    EXCEPTION WHEN OTHERS THEN
        -- Adicionar informações detalhadas de erro para debug
        v_debug_info := v_debug_info || jsonb_build_object(
            'step', 'json_validation',
            'error', SQLERRM,
            'error_state', SQLSTATE,
            'response_preview', left(v_claude_response, 200),
            'cleaned_preview', left(v_json_clean, 200)
        );

        -- Propagar o erro em vez de usar fallback silencioso
        RAISE EXCEPTION 'Failed to parse Claude response as valid JSON. Error: %. Preview: %',
                        SQLERRM,
                        left(v_claude_response, 100);
    END;

    -- Processar resposta e preparar resultado
    BEGIN
        SELECT jsonb_build_object(
            'video_id', p_video_id,
            'project_id', p_project_id,
            'youtube_video_id', v_video_data->>'youtube_video_id',
            'comment', (v_claude_response::jsonb)->>'comment',
            'justificativa', (v_claude_response::jsonb)->>'justificativa',
            'created_at', now(),
            'has_special_instructions', v_user_special_instructions IS NOT NULL AND v_user_special_instructions != ''
        ) INTO v_result;

        v_debug_info := v_debug_info || jsonb_build_object('step', 'result_creation', 'success', true);
    EXCEPTION WHEN OTHERS THEN
        v_debug_info := v_debug_info || jsonb_build_object('step', 'result_creation', 'error', SQLERRM);
        RAISE;
    END;

    -- Adicionar informações de debug ao resultado
    v_result := v_result || jsonb_build_object('debug_info', v_debug_info);

    -- Retornar resultado
    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        v_debug_info := v_debug_info || jsonb_build_object('step', 'exception',
                                                         'error', SQLERRM,
                                                         'state', SQLSTATE,
                                                         'timestamp', clock_timestamp());

        RETURN jsonb_build_object(
            'error', SQLERRM,
            'state', SQLSTATE,
            'debug_info', v_debug_info,
            'project_id', p_project_id,
            'video_id', p_video_id
        );
END;
$$;
