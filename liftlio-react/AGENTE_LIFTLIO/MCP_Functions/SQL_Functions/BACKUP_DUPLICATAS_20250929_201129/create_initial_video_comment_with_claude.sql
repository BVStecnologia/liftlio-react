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
    -- Registrar in�cio da execu��o
    v_debug_info := v_debug_info || jsonb_build_object('step', 'start', 'timestamp', clock_timestamp());

    -- Obter a transcri��o do v�deo
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
                "Pa�s",
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
            "Pa�s",
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

    -- Obter informa��es do v�deo
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

    -- Obter exemplos de mensagens que o usu�rio gostou
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
        -- N�o vamos interromper aqui se esta parte falhar
        v_user_liked_examples := 'Sem exemplos dispon�veis';
    END;

    -- Criar o prompt para o Claude com instru��es do usu�rio como restri��es espec�ficas
    BEGIN
        v_prompt := format(
            'Voc� � um usu�rio engajado do YouTube que acabou de assistir a um v�deo rec�m-lan�ado. Crie um coment�rio inicial aut�ntico, interessante e natural que demonstre que voc� realmente assistiu ao v�deo completo.

Contexto do Produto (mencione naturalmente apenas quando extremamente relevante):
Nome: %s
Descri��o: %s
Nicho/Keywords: %s

Contexto do V�deo:
T�tulo: %s
Descri��o: %s
Categoria: %s
Tags: %s

Transcri��o do V�deo:
%s

Exemplos de mensagens que o usu�rio gostou (use como inspira��o):
%s

### INSTRU��ES ESPEC�FICAS DO USU�RIO (O QUE N�O FAZER AO GERAR O COMENT�RIO) ###
%s
### FIM DAS INSTRU��ES ESPEC�FICAS DO USU�RIO ###

Instru��es gerais:
1. Sempre comente na l�ngua do projeto especificado (%s)
2. CRUCIAL: Seu coment�rio DEVE incluir pelo menos um timestamp da transcri��o no formato simples (15:30, 2:45, etc.)
3. CRUCIAL: Use detalhes espec�ficos da transcri��o, como termos t�cnicos, exemplos ou conceitos mencionados no v�deo
4. Demonstre que voc� realmente assistiu ao v�deo inteiro usando elementos espec�ficos do conte�do
5. O coment�rio deve parecer escrito por um usu�rio comum do YouTube - natural, pessoal e aut�ntico
6. Mantenha o coment�rio entre 2-3 frases (m�ximo 300 caracteres)
7. Evite formalismos, introdu��es desnecess�rias ou linguagem corporativa
8. Jamais use @mentions
9. JAMAIS pare�a que est� tentando vender ou promover algo
10. Evite frases clich�s como "Excelente v�deo!" ou "Obrigado por compartilhar!"
11. Evite cumprimentos como "Ol�" ou "Bom dia" - v� direto ao ponto
12. Utilize uma das duas estruturas recomendadas:
   a) Mencione um ponto espec�fico do v�deo com timestamp + compartilhe uma experi�ncia pessoal relacionada (potencialmente mencionando o produto)
   b) Fa�a uma pergunta espec�fica sobre algo mencionado no v�deo + compartilhe sua experi�ncia (potencialmente mencionando o produto)

Regras de Men��o ao Produto:
1. APENAS mencione %s naturalmente quando:
   - O v�deo fala sobre cria��o de conte�do, marketing, IA, automa��o, ou temas DIRETAMENTE relacionados ao produto
   - Voc� consegue criar uma conex�o genu�na entre o conte�do do v�deo e sua experi�ncia com o produto
   - A men��o parece totalmente natural e n�o for�ada

2. Formas naturais de mencionar:
   - "Esse ponto em 12:45 me lembrou quando comecei a usar %s e percebi exatamente isso..."
   - "No minuto 8:30 voc� mencionou X, que resolvi recentemente com %s"
   - "Esse problema que voc� explicou em 15:20 era exatamente o que eu tinha antes de encontrar %s"

3. N�O mencione o produto quando:
   - N�o houver conex�o clara com o conte�do do v�deo
   - Parecer promocional ou n�o-aut�ntico
   - O v�deo n�o tiver rela��o direta com o nicho do produto

LEMBRE-SE:
 Priorize autenticidade absoluta - melhor n�o mencionar o produto do que for�ar uma men��o
 JAMAIS CITE FUNCIONALIDADES QUE O PRODUTO N�O POSSUI (conforme a descri��o)
 O coment�rio deve soar como um usu�rio genu�no compartilhando sua experi�ncia pessoal
 Use apenas timestamps de momentos reais da transcri��o
 Seja espec�fico sobre o conte�do do v�deo para demonstrar que realmente assistiu
 V� direto ao ponto - coment�rios no YouTube s�o diretos e informais
 IMPORTANTE: Siga as instru��es espec�ficas do usu�rio como restri��es do que N�O fazer ao gerar o coment�rio - se estiverem vazias, desconsidere

Envie exatamente nesta estrutura:
{
  "comment": "Seu coment�rio inicial aut�ntico aqui que segue todas as instru��es acima",
  "justificativa": "Explica��o em ingl�s (primeira pessoa) do seu racioc�nio e como o coment�rio segue as instru��es"
}

Responda apenas com o JSON solicitado, sem texto adicional.',
            v_product_name,
            v_project_description,
            v_project_keywords,
            v_video_data->>'video_title',
            v_video_data->>'video_description',
            v_video_data->>'content_category',
            v_video_data->>'video_tags',
            COALESCE(v_transcript, 'Transcri��o n�o dispon�vel'),
            COALESCE(v_user_liked_examples, 'Sem exemplos dispon�veis'),
            COALESCE(v_user_special_instructions, 'Sem instru��es espec�ficas'),
            COALESCE(v_project_country, 'Portugu�s'),
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

    -- Chamada Claude com sistema de instru��es ajustado para tratar as instru��es do usu�rio como restri��es
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
                   COALESCE(v_project_country, 'Portugu�s')),
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

    -- Verificar se a resposta � um JSON v�lido
    BEGIN
        -- Testar se a resposta pode ser convertida para JSON
        PERFORM (v_claude_response::jsonb)->>'comment';

        v_debug_info := v_debug_info || jsonb_build_object('step', 'json_validation', 'success', true);
    EXCEPTION WHEN OTHERS THEN
        v_debug_info := v_debug_info || jsonb_build_object('step', 'json_validation',
                                                         'error', SQLERRM,
                                                         'response_preview', left(v_claude_response, 100));
        -- Tente corrigir o JSON ou forne�a um JSON padr�o
        v_claude_response := '{"comment": "Erro ao gerar coment�rio.", "justificativa": "Error in JSON parsing"}';
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

    -- Adicionar informa��es de debug ao resultado
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