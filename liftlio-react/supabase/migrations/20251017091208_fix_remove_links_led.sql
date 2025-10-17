-- =============================================
-- Migration: Remover links do prompt process_lead_comments_with_claude
-- Descrição: Remove instruções sobre incluir links/URLs no prompt
-- Criado: 2025-10-17
-- =============================================

DROP FUNCTION IF EXISTS public.process_lead_comments_with_claude(integer, integer);

CREATE OR REPLACE FUNCTION public.process_lead_comments_with_claude(p_project_id integer, p_limit integer DEFAULT 5)
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
    v_json_start INTEGER;
    v_json_end INTEGER;
    v_extracted_json TEXT;
BEGIN
    -- Obter a transcrição do vídeo
    SELECT vt.trancription INTO v_transcript
    FROM "Comentarios_Principais" cp
    JOIN "Videos" v ON v.id = cp.video_id
    JOIN "Videos_trancricao" vt ON vt.id = v.transcript
    WHERE cp.project_id = p_project_id
    LIMIT 1;

    -- Obter os comentários e o país do projeto (fixo tipo 1 para LED)
    SELECT jsonb_agg(row_to_json(t)), MAX(p."País")
    INTO v_comments, v_project_country
    FROM get_lead_comments_for_processing(p_project_id::BIGINT, p_limit, 1) t
    LEFT JOIN "Projeto" p ON p.id = p_project_id;

    -- Buscar exemplos de mensagens LED
    SELECT string_agg(mensagem, E'\n')
    INTO v_template_messages
    FROM (
        SELECT mensagem
        FROM "Mensagens"
        WHERE tipo_msg = 1
          AND template = true
        ORDER BY created_at DESC
        LIMIT 20
    ) t;

   -- Preparar o prompt para o Claude incluindo transcrição
    v_prompt := format(
        'Você é um usuário experiente do youtube. Sua tarefa é responder aos seguintes comentários de vídeos do YouTube, considerando o contexto do vídeo, transcrição e do projeto. Sua resposta deve ser prestativa, empática e promover sutilmente %s quando apropriado.

Nome do Produto: %s
Descrição do Projeto: %s

Contexto do Vídeo:
Título: %s
Descrição: %s
Transcrição: %s

Veja os exemplos de mensagens a seguir e siga sempre que possível, se estiver vazio desconsidere, mas se estiverem aqui de mais peso a elas para se basear:
%s

Comentários a serem respondidos:

%s

Instruções importantes:
1. Sempre responda na lIngua do projeto especificado
2. Sempre leia a transcrição a fim de gerar melhor afinidade e engajamento adicione timestamp de alguma parte do video sempre que houver contexto.
3. Responda naturalmente, como se fosse um usuário real.
4. Quando apropriado, mencione sua experiência com o produto ou serviço do projeto de forma natural (apenas o NOME, sem URLs ou links).
5. Cada resposta deve ter no máximo 3 frases
6.10.JAMAIS USE @NAME
7. Os videos não são seus, você apenas esta comentando como um usuario comum, então não vai responder como se o video fosse seu.

O objetivo é fazer com que eles se interessem pelo produto, então quero que todos os comentários pareçam ser de um usuário genuíno defendendo o produto %s e apenas tentando ajudar.

Forneça suas respostas no seguinte formato JSON:

[
  {
    "comment_id": [Comment ID],
    "response": "Your response to the comment"
  }
]

Respond only with the requested JSON array, with no additional text.',
        replace(v_comments->0->>'project_name', '"', ''''),
        replace(v_comments->0->>'project_name', '"', ''''),
        replace(v_comments->0->>'project_description', '"', ''''),
        replace(v_comments->0->>'video_title', '"', ''''),
        replace(v_comments->0->>'video_description', '"', ''''),
        COALESCE(v_transcript, 'Transcrição não disponível'),
        COALESCE(replace(v_template_messages, '"', ''''), 'Sem exemplos disponíveis'),
        (SELECT string_agg(
            format(
                'Comment %s:
Author: %s
Text: %s',
                c->>'comment_id',
                replace(c->>'author_name', '"', ''''),
                replace(c->>'comment_text', '"', ''')
            ),
            E'\n\n'
        ) FROM jsonb_array_elements(v_comments) c),
        replace(v_comments->0->>'project_name', '"', '''')
    );

    -- Chamar o Claude
    SELECT claude_complete(
        v_prompt,
        format('You are an experienced YouTube user. You MUST respond ONLY with a valid JSON array. No explanatory text. The response must start with [ and end with ]. Language: %s',
               COALESCE(v_project_country, 'Português')),
        4000,
        0.7
    ) INTO v_claude_response;

    -- Tentar extrair JSON da resposta (caso venha com texto adicional)
    v_json_start := POSITION('[' IN v_claude_response);
    v_json_end := LENGTH(v_claude_response) - POSITION(']' IN REVERSE(v_claude_response)) + 1;

    IF v_json_start > 0 AND v_json_end > v_json_start THEN
        v_extracted_json := SUBSTRING(v_claude_response FROM v_json_start FOR (v_json_end - v_json_start + 1));
        RETURN v_extracted_json::JSONB;
    ELSE
        -- Se não encontrar [ ], tentar a resposta completa
        RETURN v_claude_response::JSONB;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao processar resposta do Claude: % %. Response preview: %',
            SQLERRM, SQLSTATE, LEFT(v_claude_response, 200);
        RETURN NULL;
END;
$function$;

COMMENT ON FUNCTION public.process_lead_comments_with_claude(integer, integer) IS
'Processa comentários de leads usando Claude AI. Gera respostas naturais mencionando o produto APENAS pelo nome (sem links).';
