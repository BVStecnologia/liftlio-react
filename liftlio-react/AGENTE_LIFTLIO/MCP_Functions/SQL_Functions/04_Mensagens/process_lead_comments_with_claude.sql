-- =============================================
-- Fun��o: process_lead_comments_with_claude
-- Descri��o: Processa coment�rios de leads com Claude AI
-- Criado: 2025-01-24
-- Atualizado: Fun��o para responder leads identificados
-- =============================================

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
BEGIN
    -- Obter a transcri��o do v�deo
    SELECT vt.trancription INTO v_transcript
    FROM "Comentarios_Principais" cp
    JOIN "Videos" v ON v.id = cp.video_id
    JOIN "Videos_trancricao" vt ON vt.id = v.transcript
    WHERE cp.id = p_project_id;

    -- Obter os coment�rios e o pa�s do projeto (fixo tipo 1 para LED)
    SELECT jsonb_agg(row_to_json(t)), MAX(p."Pa�s")
    INTO v_comments, v_project_country
    FROM get_lead_comments_for_processing(p_project_id::BIGINT, p_limit, 1) t
    LEFT JOIN "Projeto" p ON p.id = p_project_id;

    -- Buscar exemplos de mensagens LED
    SELECT string_agg(mensagem, E'\\n')
    INTO v_template_messages
    FROM (
        SELECT mensagem
        FROM "Mensagens"
        WHERE tipo_msg = 1
          AND template = true
        ORDER BY created_at DESC
        LIMIT 20
    ) t;

   -- Preparar o prompt para o Claude incluindo transcri��o
    v_prompt := format(
        'Voc� � um usu�rio experiente do youtube. Sua tarefa � responder aos seguintes coment�rios de v�deos do YouTube, considerando o contexto do v�deo, transcri��o e do projeto. Sua resposta deve ser prestativa, emp�tica e promover sutilmente %s quando apropriado.

Nome do Produto: %s
URL do Produto: %s
Descri��o do Projeto: %s

Contexto do V�deo:
T�tulo: %s
Descri��o: %s
Transcri��o: %s

Veja os exemplos de mensagens a seguir e siga sempre que poss�vel, se estiver vazio desconsidere, mas se estiverem aqui de mais peso a elas para se basear:
%s

Coment�rios a serem respondidos:

%s

Instru��es importantes:
1. Sempre responda na lIngua do projeto especificado
2. Sempre leia a transcri��o a fim de gerar melhor afinidade e engajamento adicione timestamp de alguma parte do video sempre que houver contexto.
3. Responda naturalmente, como se fosse um usu�rio real.
4. Quando apropriado, mencione sua experi�ncia com o produto ou servi�o do projeto e inclua o link do servi�o.
5. Cada resposta deve ter no m�ximo 3 frases
6.10.JAMAIS USE @NAME
7. Os videos n�o s�o seus, voc~e apenas esta comentando como um usuario comum, ent�o n�o vai responder como se o video fosse seu.

O objetivo � fazer com que eles cliquem no link fornecido, ent�o quero que todos os coment�rios pare�am ser de um usu�rio genu�no defendendo o produto %s e apenas tentando ajudar.

Exemplos de respostas baseadas em pontua��o quando o rpimeiros exemplos est�o vazios ou tem pouca informa��o para a mensagem atual:

PONTUA��O 10
Coment�rio: Estou gerenciando conte�do para tr�s sites de e-commerce e tendo dificuldades para manter o ritmo. Qual � o pre�o para uso comercial e ele pode lidar com descri��es de produtos? Al�m disso, ele integra com Shopify?
Resposta: Voc� definitivamente deveria conferir o [Nome do Produto] [link]. Eu o uso nas minhas 2 lojas Shopify e as descri��es dos produtos s�o perfeitas! A calculadora business [link] mostrar� o pre�o exato para seu volume - muito melhor custo-benef�cio do que o que eu pagava antes, e a integra��o com Shopify � perfeita.

PONTUA��O 9
Coment�rio: Nossa equipe de marketing est� sobrecarregada com pedidos de conte�do. Estamos gastando $5k/m�s com freelancers e ainda n�o conseguimos dar conta. Precisamos encontrar uma solu��o melhor.
Resposta: [Nome do Produto] [link] literalmente salvou nossa equipe de marketing. Cortamos nossos custos pela metade e produzimos o dobro de conte�do. O fluxo de trabalho da equipe � super eficiente - passamos de sobrecarregados com pedidos para realmente progredir. N�o � patrocinado, por sinal, apenas um usu�rio muito satisfeito!

PONTUA��O 8
Coment�rio: Estou testando v�rios escritores de IA como Jasper e Copy.ai - como sua ferramenta lida com consist�ncia em diferentes vozes de marca?
Resposta: Depois de testar essas mesmas ferramentas, [Nome do Produto] [link] est� muito � frente em termos de consist�ncia de tom. Os perfis de voz da marca s�o incrivelmente precisos - d� para perceber que � a mesma marca em diferentes tipos de conte�do. Eles oferecem um teste gratuito se voc� quiser testar por conta pr�pria.

PONTUA��O 7
Coment�rio: Como a IA lida com otimiza��o para SEO? Voc�s t�m estudos de caso mostrando melhores rankings de busca usando sua ferramenta?
Resposta: Nosso tr�fego aumentou 40%% depois de mudar para [Nome do Produto] [link]. Seus recursos de SEO s�o realmente �teis, n�o apenas palavras-chave b�sicas. Eles t�m �timos estudos de caso no site deles - vale a pena conferir se voc� leva o ranking a s�rio. S� a ferramenta de pesquisa de palavras-chave j� vale a pena.

PONTUA��O 6
Coment�rio: Tenho acompanhado o espa�o de escrita com IA h� meses. Sua abordagem para gera��o de conte�do parece interessante. Como voc� lida com a precis�o dos fatos?
Resposta: Se precis�o � sua preocupa��o, definitivamente confira o [Nome do Produto] [link]. Ele gera cita��es automaticamente e voc� pode conectar seus pr�prios documentos como fontes. Tenho usado h� meses e � extremamente preciso. Eles tamb�m t�m uma interessante ferramenta de compara��o de precis�o no site.

M�s aten��o somente adicione timestamp do video se o contexto permitir e na transcri��o realmente tem o conteudo

Forne�a suas respostas no seguinte formato JSON:

[
  {
    "comment_id": [Comment ID],
    "response": "Your response to the comment, including author''s name"
  },
  {
    "comment_id": [Next comment ID],
    "response": "Your response to the next comment, including author''s name"
  }
]

Respond only with the requested JSON, with no additional text.',
        replace(v_comments->0->>'project_name', '"', ''''),
        replace(v_comments->0->>'project_name', '"', ''''),
        replace(v_comments->0->>'project_url', '"', ''''),
        replace(v_comments->0->>'project_description', '"', ''''),
        replace(v_comments->0->>'video_title', '"', ''''),
        replace(v_comments->0->>'video_description', '"', ''''),
        COALESCE(v_transcript, 'Transcri��o n�o dispon�vel'),
        COALESCE(replace(v_template_messages, '"', ''''), 'Sem exemplos dispon�veis'),
        (SELECT string_agg(
            format(
                'Comment %s:
Author: %s
Text: %s',
                c->>'comment_id',
                replace(c->>'author_name', '"', ''''),
                replace(c->>'comment_text', '"', '''')
            ),
            E'\\n\\n'
        ) FROM jsonb_array_elements(v_comments) c),
        replace(v_comments->0->>'project_name', '"', '''')
    );

    -- Chamar o Claude
    SELECT claude_complete(
        v_prompt,
        format('You are an experienced YouTube user. Your goal is to help other users and subtly promote the service. Reply only with the requested JSON, without additional text. Remember to:
1. Always respond in %s (project country language)
2. Read and reference the transcript when relevant
3. Use video timestamps when possible to show engagement
4. Keep responses natural and helpful
5. N�o marque a pessoa com @
6. Inclua timestamps relevantes do v�deo sempre que poss�vel (formato: 0:00)
7. Jamais deve esquecer que n�o deve parecer interessado em que o usuario use o produto, deve parecer uma indica��o genuina de um usuario como ele
8. Jamais esque�a de usar o idioma do pais mencionado no projeto
9. Sempre que o primeiro exemplo de mensagem estiver presende de mais peso a elas pois s�o mais importantes
10.JAMAIS USE @NAME
11. Jamais esque�a de seguir o idioma especificado no Projeto
12. Os videos n�o s�o seus, voc~e apenas esta comentando como um usuario comum, ent�o n�o vai responder como se o video fosse seu.',
               COALESCE(v_project_country, 'Portugu�s')),
        4000,
        0.7
    ) INTO v_claude_response;

    -- Retornar a resposta como JSONB
    RETURN v_claude_response::JSONB;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro: % %', SQLERRM, SQLSTATE;
        RETURN NULL;
END;
$function$