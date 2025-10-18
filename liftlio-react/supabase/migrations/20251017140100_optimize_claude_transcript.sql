-- =============================================
-- Migration: Optimize transcript size for Claude API
-- Data: 2025-10-17 14:01
-- Problema: Transcrições muito grandes causam timeout
-- Solução: Limitar transcrição a 15000 chars e só processar se tiver transcrição
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
BEGIN
    -- Obter a transcrição do vídeo (LIMITADA a 15000 caracteres para evitar timeout)
    SELECT
        CASE
            WHEN LENGTH(vt.trancription) > 15000
            THEN LEFT(vt.trancription, 15000) || '... [transcrição truncada]'
            ELSE vt.trancription
        END INTO v_transcript
    FROM "Comentarios_Principais" cp
    JOIN "Videos" v ON v.id = cp.video_id
    LEFT JOIN "Videos_trancricao" vt ON vt.id = v.transcript
    WHERE cp.project_id = p_project_id
    AND cp.mensagem = false
    AND vt.trancription IS NOT NULL  -- Só processar se tiver transcrição
    LIMIT 1;

    -- Se não houver transcrição, não processar
    IF v_transcript IS NULL THEN
        RAISE NOTICE 'Nenhuma transcrição disponível para o projeto %', p_project_id;
        RETURN NULL;
    END IF;

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

    RAISE NOTICE 'Vídeo tem % comentários. Limite de menções: %. Processando % comentários neste lote.',
                 v_video_comment_count, v_max_product_mentions, p_limit;

    -- Obter templates de mensagens (LIMITADO)
    SELECT string_agg(mensagem, E'\\n')
    INTO v_template_messages
    FROM (
        SELECT mensagem
        FROM "Mensagens"
        WHERE tipo_msg = 2
          AND template = true
        ORDER BY created_at DESC
        LIMIT 10  -- Reduzido de 20 para 10
    ) t;

    -- Obter exemplos de respostas que o usuário gostou (LIMITADO)
    SELECT string_agg(CONCAT('Mensagem: ', mensagem, E'\\nJustificativa: ', justificativa), E'\\n\\n')
    INTO v_user_liked_examples
    FROM (
        SELECT mensagem, justificativa
        FROM "Mensagens"
        WHERE project_id = p_project_id
        AND template = true
        AND justificativa IS NOT NULL
        ORDER BY id
        LIMIT 10  -- Reduzido de 20 para 10
    ) t;

    -- Construir prompt SIMPLIFICADO
    v_prompt := format(
        'Você é um usuário engajado do YouTube respondendo a comentários de videos aleatórios que não são seus. Sua tarefa é criar respostas curtas e naturais que demonstrem conexão com o comentário original e com o conteúdo do vídeo.

REGRA CRÍTICA DE MENÇÕES AO PRODUTO:
Este vídeo tem %s comentários totais.
Você DEVE mencionar o produto %s em NO MÁXIMO %s respostas.
Priorize mencionar o produto para comentários marcados como "is_lead": true.

Contexto do Produto:
Nome: %s
Descrição: %s
Keywords: %s

Contexto do Vídeo:
Título: %s
Transcrição: %s

Exemplos de mensagens (se disponível): %s

Comentários a serem respondidos:
%s

Instruções:
1. Responda em %s
2. SEMPRE incluir timestamp da transcrição (ex: 15:30, 2:45)
3. Use APENAS timestamps da transcrição fornecida
4. Máximo 2 frases por resposta
5. Inclua "tipo_resposta": "produto" se mencionar o produto, "engajamento" caso contrário
6. Inclua "justificativa" em inglês explicando seu raciocínio

Envie exatamente nesta estrutura:
[
  {
    "comment_id": "ID",
    "response": "response",
    "tipo_resposta": "produto" ou "engajamento",
    "justificativa": "I used first person..."
  }
]

Respond only with the requested JSON, with no additional text.',
        v_video_comment_count,
        v_product_name,
        v_max_product_mentions,
        v_product_name,
        v_project_description,
        v_project_keywords,
        replace(v_comments->0->>'video_title', '"', ''''),
        COALESCE(v_transcript, 'Transcrição não disponível'),
        COALESCE(replace(v_template_messages, '"', ''''), 'Sem exemplos'),
        (SELECT string_agg(
            format('Comment %s: %s (Is Lead: %s)',
                c->>'comment_id',
                replace(c->>'text_display', '"', ''''),
                c->>'is_lead'
            ), E'\\n\\n'
        ) FROM jsonb_array_elements(v_comments) c),
        COALESCE(v_project_country, 'Português')
    );

    -- Chamada Claude com timeout aumentado implicitamente
    SELECT claude_complete(
        v_prompt,
        format('You are a regular YouTube viewer creating authentic responses.

CRITICAL:
- Every response MUST include a timestamp from transcript
- Use ONLY provided timestamps
- Respond ONLY with valid JSON array
- Include "tipo_resposta" and "justificativa" fields

Language: %s
Product mentions limit: %s

Structure:
[{"comment_id": "ID", "response": "text", "tipo_resposta": "produto|engajamento", "justificativa": "..."}]',
               COALESCE(v_project_country, 'Português'),
               v_max_product_mentions),
        4000,
        0.7
    ) INTO v_claude_response;

    -- Validar resposta
    IF v_claude_response IS NULL THEN
        RAISE NOTICE 'Claude retornou NULL';
        RETURN NULL;
    END IF;

    -- Converter para JSONB
    BEGIN
        v_result := v_claude_response::JSONB;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao converter resposta do Claude: %', SQLERRM;
        RETURN jsonb_build_object('error', 'Invalid JSON from Claude', 'response', v_claude_response);
    END;

    -- Validar menções
    SELECT COUNT(*) INTO v_product_mention_count
    FROM jsonb_array_elements(v_result) elem
    WHERE elem->>'tipo_resposta' = 'produto';

    IF v_product_mention_count > v_max_product_mentions THEN
        RAISE NOTICE 'Claude excedeu limite: % menções (limite: %)', v_product_mention_count, v_max_product_mentions;
    ELSE
        RAISE NOTICE 'Menções OK: % de %', v_product_mention_count, v_max_product_mentions;
    END IF;

    -- Enriquecer resposta
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
                'video_id', (SELECT c->>'video_id' FROM jsonb_array_elements(v_comments) c WHERE c->>'comment_id' = element->>'comment_id' LIMIT 1),
                'cp_id', (SELECT c->>'cp_id' FROM jsonb_array_elements(v_comments) c WHERE c->>'comment_id' = element->>'comment_id' LIMIT 1),
                'project_id', p_project_id,
                'video_comment_count', v_video_comment_count,
                'max_product_mentions', v_max_product_mentions
            ) AS enriched
        FROM claude_json
    )
    SELECT jsonb_agg(enriched) INTO v_result FROM enriched_elements;

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro na função: % %', SQLERRM, SQLSTATE;
        RETURN jsonb_build_object('error', SQLERRM);
END;
$function$;
