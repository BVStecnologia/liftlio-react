CREATE OR REPLACE FUNCTION public.create_initial_video_comment_with_claude(p_project_id integer, p_video_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_claude_response TEXT;
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
BEGIN
    -- Registrar início da execução
    v_debug_info := v_debug_info || jsonb_build_object('step', 'start', 'timestamp', clock_timestamp());

    -- Obter a transcrição do vídeo
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

    -- Obter informações do vídeo
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

    -- Obter exemplos de mensagens que o usuário gostou
    BEGIN
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

        v_debug_info := v_debug_info || jsonb_build_object('step', 'user_examples',
                                                         'success', true,
                                                         'has_examples', v_user_liked_examples IS NOT NULL AND v_user_liked_examples != '');
    EXCEPTION WHEN OTHERS THEN
        v_debug_info := v_debug_info || jsonb_build_object('step', 'user_examples', 'error', SQLERRM);
        -- Não vamos interromper aqui se esta parte falhar
        v_user_liked_examples := 'Sem exemplos disponíveis';
    END;

    -- Criar o prompt para o Claude com instruções do usuário como restrições específicas
    BEGIN
        v_prompt := format(
            'Você é um usuário engajado do YouTube que acabou de assistir a um vídeo recém-lançado. Crie um comentário inicial autêntico, interessante e natural que demonstre que você realmente assistiu ao vídeo completo.

Contexto do Produto (mencione naturalmente apenas quando extremamente relevante):
Nome: %s
Descrição: %s
Nicho/Keywords: %s

Contexto do Vídeo:
Título: %s
Descrição: %s
Categoria: %s
Tags: %s

Transcrição do Vídeo:
%s

Exemplos de mensagens que o usuário gostou (use como inspiração):
%s

### INSTRUÇÕES ESPECÍFICAS DO USUÁRIO (O QUE NÃO FAZER AO GERAR O COMENTÁRIO) ###
%s
### FIM DAS INSTRUÇÕES ESPECÍFICAS DO USUÁRIO ###

Instruções gerais:
1. Sempre comente na língua do projeto especificado (%s)
2. CRUCIAL: Seu comentário DEVE incluir pelo menos um timestamp da transcrição no formato simples (15:30, 2:45, etc.)
3. CRUCIAL: Use detalhes específicos da transcrição, como termos técnicos, exemplos ou conceitos mencionados no vídeo
4. Demonstre que você realmente assistiu ao vídeo inteiro usando elementos específicos do conteúdo
5. O comentário deve parecer escrito por um usuário comum do YouTube - natural, pessoal e autêntico
6. Mantenha o comentário entre 2-3 frases (máximo 300 caracteres)
7. Evite formalismos, introduções desnecessárias ou linguagem corporativa
8. Jamais use @mentions
9. JAMAIS pareça que está tentando vender ou promover algo
10. Evite frases clichês como "Excelente vídeo!" ou "Obrigado por compartilhar!"
11. Evite cumprimentos como "Olá" ou "Bom dia" - vá direto ao ponto
12. Utilize uma das duas estruturas recomendadas:
   a) Mencione um ponto específico do vídeo com timestamp + compartilhe uma experiência pessoal relacionada (potencialmente mencionando o produto)
   b) Faça uma pergunta específica sobre algo mencionado no vídeo + compartilhe sua experiência (potencialmente mencionando o produto)

Regras de Menção ao Produto:
1. APENAS mencione %s naturalmente quando:
   - O vídeo fala sobre criação de conteúdo, marketing, IA, automação, ou temas DIRETAMENTE relacionados ao produto
   - Você consegue criar uma conexão genuína entre o conteúdo do vídeo e sua experiência com o produto
   - A menção parece totalmente natural e não forçada

2. Formas naturais de mencionar:
   - "Esse ponto em 12:45 me lembrou quando comecei a usar %s e percebi exatamente isso..."
   - "No minuto 8:30 você mencionou X, que resolvi recentemente com %s"
   - "Esse problema que você explicou em 15:20 era exatamente o que eu tinha antes de encontrar %s"

3. NÃO mencione o produto quando:
   - Não houver conexão clara com o conteúdo do vídeo
   - Parecer promocional ou não-autêntico
   - O vídeo não tiver relação direta com o nicho do produto

LEMBRE-SE:
 Priorize autenticidade absoluta - melhor não mencionar o produto do que forçar uma menção
 JAMAIS CITE FUNCIONALIDADES QUE O PRODUTO NÃO POSSUI (conforme a descrição)
 O comentário deve soar como um usuário genuíno compartilhando sua experiência pessoal
 Use apenas timestamps de momentos reais da transcrição
 Seja específico sobre o conteúdo do vídeo para demonstrar que realmente assistiu
 Vá direto ao ponto - comentários no YouTube são diretos e informais
 IMPORTANTE: Siga as instruções específicas do usuário como restrições do que NÃO fazer ao gerar o comentário - se estiverem vazias, desconsidere

Envie exatamente nesta estrutura:
{
  "comment": "Seu comentário inicial autêntico aqui que segue todas as instruções acima",
  "justificativa": "Explicação em inglês (primeira pessoa) do seu raciocínio e como o comentário segue as instruções"
}

Responda apenas com o JSON solicitado, sem texto adicional.',
            v_product_name,
            v_project_description,
            v_project_keywords,
            v_video_data->>'video_title',
            v_video_data->>'video_description',
            v_video_data->>'content_category',
            v_video_data->>'video_tags',
            COALESCE(v_transcript, 'Transcrição não disponível'),
            COALESCE(v_user_liked_examples, 'Sem exemplos disponíveis'),
            COALESCE(v_user_special_instructions, 'Sem instruções específicas'),
            COALESCE(v_project_country, 'Português'),
            v_product_name,
            v_product_name,
            v_product_name,
            v_product_name
        );

        v_debug_info := v_debug_info || jsonb_build_object('step', 'prompt_creation', 'success', true);
    EXCEPTION WHEN OTHERS THEN
        v_debug_info := v_debug_info || jsonb_build_object('step', 'prompt_creation', 'error', SQLERRM);
        RAISE;
    END;

    -- Chamada Claude com sistema de instruções ajustado para tratar as instruções do usuário como restrições
    BEGIN
        v_debug_info := v_debug_info || jsonb_build_object('step', 'before_claude_call', 'timestamp', clock_timestamp());

        SELECT claude_complete(
            v_prompt,
            format('You are a genuine YouTube user creating an initial comment on a newly released video.

Your goal is to create an authentic-sounding comment that:
1. References specific timestamps from the video transcript
2. Shows you actually watched the video by mentioning specific content
3. Appears completely natural and not promotional
4. Subtly mentions the product ONLY when extremely relevant and natural
5. Uses the format and style of real YouTube comments

IMPORTANT NOTE ABOUT USER INSTRUCTIONS: If there are specific user instructions (prompt_user field), treat them as restrictions or guidelines about what NOT to do when generating the comment. These are specific adjustments the user wants you to make, but do not replace the core task of creating an authentic YouTube comment.

Always respond in %s. Keep your comment short (2-3 sentences max). Include a justification in FIRST PERSON explaining your reasoning in English.

Your response must be in this JSON format:
{
  "comment": "Your authentic comment here that follows all instructions",
  "justificativa": "I used a specific timestamp and mentioned a technical term from the video to establish authenticity..."
}

Respond only with the requested JSON, with no additional text.',
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

    -- Verificar se a resposta é um JSON válido
    BEGIN
        -- Testar se a resposta pode ser convertida para JSON
        PERFORM (v_claude_response::jsonb)->>'comment';

        v_debug_info := v_debug_info || jsonb_build_object('step', 'json_validation', 'success', true);
    EXCEPTION WHEN OTHERS THEN
        v_debug_info := v_debug_info || jsonb_build_object('step', 'json_validation',
                                                         'error', SQLERRM,
                                                         'response_preview', left(v_claude_response, 100));
        -- Tente corrigir o JSON ou forneça um JSON padrão
        v_claude_response := '{"comment": "Erro ao gerar comentário.", "justificativa": "Error in JSON parsing"}';
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
$function$