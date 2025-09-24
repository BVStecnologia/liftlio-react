CREATE OR REPLACE FUNCTION public.regenerate_single_comment_response(p_comment_cp_id integer, p_response_type text DEFAULT 'auto'::text, p_custom_instruction text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_project_id INTEGER;
    v_comment_data JSONB;
    v_claude_response TEXT;
    v_prompt TEXT;
    v_project_country TEXT;
    v_transcript TEXT;
    v_product_name TEXT;
    v_project_description TEXT;
    v_project_keywords TEXT;
    v_user_special_instructions TEXT;
    v_video_title TEXT;
    v_video_description TEXT;
    v_result JSONB;
    v_msg_id BIGINT;
    v_force_product_mention BOOLEAN := FALSE;
    v_force_engagement_only BOOLEAN := FALSE;
BEGIN
    -- Determinar tipo de resposta
    IF p_response_type = 'product' THEN
        v_force_product_mention := TRUE;
    ELSIF p_response_type = 'engagement' THEN
        v_force_engagement_only := TRUE;
    END IF;

    -- 1. Buscar dados do comentário específico e projeto
    SELECT
        cp.project_id,
        cp.id,
        jsonb_build_object(
            'comment_id', cp.id_do_comentario,
            'author_name', cp.author_name,
            'text_display', cp.text_display,
            'video_id', cp.video_id,
            'video_title', v.video_title,
            'video_description', v.video_description,
            'cp_id', cp.id,
            'is_lead', CASE WHEN cp.lead_score IS NOT NULL AND cp.lead_score != '' THEN true ELSE false END
        )
    INTO v_project_id, v_msg_id, v_comment_data
    FROM "Comentarios_Principais" cp
    JOIN "Videos" v ON v.id = cp.video_id
    WHERE cp.id = p_comment_cp_id;

    IF v_comment_data IS NULL THEN
        RETURN jsonb_build_object('error', 'Comentário não encontrado');
    END IF;

    -- 2. Buscar transcrição do vídeo
    SELECT vt.trancription
    INTO v_transcript
    FROM "Videos" v
    LEFT JOIN "Videos_trancricao" vt ON vt.id = v.transcript
    WHERE v.id = (v_comment_data->>'video_id')::INTEGER;

    -- 3. Buscar dados do projeto
    SELECT
        "País",
        COALESCE(
            SUBSTRING("description service" FROM 'Company or product name: ([^,]+)'),
            "Project name"
        ),
        "description service",
        "Keywords",
        prompt_user
    INTO
        v_project_country,
        v_product_name,
        v_project_description,
        v_project_keywords,
        v_user_special_instructions
    FROM "Projeto"
    WHERE id = v_project_id;

    -- 4. Extrair informações do vídeo
    v_video_title := v_comment_data->>'video_title';
    v_video_description := v_comment_data->>'video_description';

    -- 5. Construir prompt baseado no tipo de resposta
    IF v_force_engagement_only THEN
        -- Prompt para APENAS engajamento SEM menção ao produto
        v_prompt := format(
            'Você é um usuário engajado do YouTube respondendo a um comentário.
IMPORTANTE: NÃO mencione NENHUM produto ou serviço nesta resposta - foque APENAS em engajamento genuíno.

Contexto do Vídeo:
Título: %s
Descrição: %s
Transcrição: %s

Comentário a responder:
Autor: %s
Texto: %s

Instruções personalizadas: %s

REGRAS CRÍTICAS:
1. Responda em %s
2. NÃO mencione %s ou qualquer outro produto/serviço
3. Foque APENAS em engajar com o conteúdo do comentário e vídeo
4. Use um timestamp específico da transcrição (formato 15:30)
5. Máximo 2 frases
6. Seja genuíno e específico sobre o conteúdo do vídeo
7. tipo_resposta DEVE ser "engajamento"

Responda APENAS com este JSON:
{
  "response": "sua resposta aqui",
  "tipo_resposta": "engajamento",
  "justificativa": "I focused on engaging with the specific content without mentioning any products"
}',
            v_video_title,
            v_video_description,
            COALESCE(v_transcript, 'Transcrição não disponível'),
            v_comment_data->>'author_name',
            v_comment_data->>'text_display',
            COALESCE(p_custom_instruction, 'Nenhuma'),
            COALESCE(v_project_country, 'Português'),
            v_product_name
        );

    ELSIF v_force_product_mention THEN
        -- Prompt para FORÇAR menção ao produto
        v_prompt := format(
            'Você é um usuário engajado do YouTube respondendo a um comentário.
IMPORTANTE: Você DEVE mencionar o produto %s de forma natural nesta resposta.

Contexto do Produto:
Nome: %s
Descrição: %s
Keywords: %s

Contexto do Vídeo:
Título: %s
Descrição: %s
Transcrição: %s

Comentário a responder:
Autor: %s
Texto: %s
É Lead: %s

Instruções personalizadas: %s

REGRAS CRÍTICAS:
1. Responda em %s
2. DEVE mencionar %s naturalmente (ex: "Tenho usado %s..." ou "Descobri %s recentemente...")
3. Use um timestamp específico da transcrição (formato 15:30)
4. Máximo 2 frases
5. Conecte o produto com o conteúdo do comentário/vídeo
6. tipo_resposta DEVE ser "produto"

Responda APENAS com este JSON:
{
  "response": "sua resposta aqui",
  "tipo_resposta": "produto",
  "justificativa": "I naturally mentioned the product while connecting it to the video content at [timestamp]"
}',
            v_product_name,
            v_product_name,
            v_project_description,
            v_project_keywords,
            v_video_title,
            v_video_description,
            COALESCE(v_transcript, 'Transcrição não disponível'),
            v_comment_data->>'author_name',
            v_comment_data->>'text_display',
            v_comment_data->>'is_lead',
            COALESCE(p_custom_instruction, 'Nenhuma'),
            COALESCE(v_project_country, 'Português'),
            v_product_name,
            v_product_name,
            v_product_name
        );

    ELSE
        -- Prompt AUTO - deixa Claude decidir
        v_prompt := format(
            'Você é um usuário engajado do YouTube respondendo a um comentário.
Decida se deve mencionar o produto %s baseado no contexto.

Contexto do Produto:
Nome: %s
Descrição: %s
Keywords: %s

Contexto do Vídeo:
Título: %s
Descrição: %s
Transcrição: %s

Comentário a responder:
Autor: %s
Texto: %s
É Lead: %s

Instruções personalizadas: %s

REGRAS:
1. Responda em %s
2. Se o comentário é relevante para %s, mencione naturalmente
3. Se não for relevante, foque apenas em engajamento
4. Use um timestamp específico da transcrição (formato 15:30)
5. Máximo 2 frases
6. tipo_resposta: "produto" se mencionar, "engajamento" caso contrário

Responda APENAS com este JSON:
{
  "response": "sua resposta aqui",
  "tipo_resposta": "produto" ou "engajamento",
  "justificativa": "Explique sua decisão em inglês na primeira pessoa"
}',
            v_product_name,
            v_product_name,
            v_project_description,
            v_project_keywords,
            v_video_title,
            v_video_description,
            COALESCE(v_transcript, 'Transcrição não disponível'),
            v_comment_data->>'author_name',
            v_comment_data->>'text_display',
            v_comment_data->>'is_lead',
            COALESCE(p_custom_instruction, 'Nenhuma'),
            COALESCE(v_project_country, 'Português'),
            v_product_name
        );
    END IF;

    -- 6. Chamar Claude
    SELECT claude_complete(
        v_prompt,
        'You are a YouTube user. Respond ONLY with the requested JSON format.',
        2000,
        0.7
    ) INTO v_claude_response;

    -- 7. Validar e processar resposta
    IF v_claude_response IS NULL THEN
        RETURN jsonb_build_object('error', 'Claude não retornou resposta');
    END IF;

    BEGIN
        v_result := v_claude_response::JSONB;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('error', 'Resposta inválida do Claude', 'raw_response', v_claude_response);
    END;

    -- 8. Adicionar metadados ao resultado
    v_result := v_result || jsonb_build_object(
        'comment_cp_id', p_comment_cp_id,
        'project_id', v_project_id,
        'msg_id', v_msg_id,
        'response_type_requested', p_response_type,
        'timestamp', NOW()
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'error', SQLERRM,
            'detail', SQLSTATE
        );
END;
$function$