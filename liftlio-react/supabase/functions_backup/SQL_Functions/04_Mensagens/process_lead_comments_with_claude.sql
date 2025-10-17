-- =============================================
-- Função: process_lead_comments_with_claude
-- Descrição: Processa comentários de leads com Claude AI
-- Criado: 2025-01-24
-- Atualizado: 2025-10-16 - Fix query de transcrição (cp.id → cp.project_id)
-- =============================================

DROP FUNCTION IF EXISTS process_lead_comments_with_claude(INTEGER, INTEGER);

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
URL do Produto: %s
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
4. Quando apropriado, mencione sua experiência com o produto ou serviço do projeto e inclua o link do serviço.
5. Cada resposta deve ter no máximo 3 frases
6.10.JAMAIS USE @NAME
7. Os videos não são seus, voc~e apenas esta comentando como um usuario comum, então não vai responder como se o video fosse seu.

O objetivo é fazer com que eles cliquem no link fornecido, então quero que todos os comentários pareçam ser de um usuário genuíno defendendo o produto %s e apenas tentando ajudar.

Exemplos de respostas baseadas em pontuação quando o rpimeiros exemplos estão vazios ou tem pouca informação para a mensagem atual:

PONTUAÇÃO 10
Comentário: Estou gerenciando conteúdo para três sites de e-commerce e tendo dificuldades para manter o ritmo. Qual é o preço para uso comercial e ele pode lidar com descrições de produtos? Além disso, ele integra com Shopify?
Resposta: Você definitivamente deveria conferir o [Nome do Produto] [link]. Eu o uso nas minhas 2 lojas Shopify e as descrições dos produtos são perfeitas! A calculadora business [link] mostrará o preço exato para seu volume - muito melhor custo-benefício do que o que eu pagava antes, e a integração com Shopify é perfeita.

PONTUAÇÃO 9
Comentário: Nossa equipe de marketing está sobrecarregada com pedidos de conteúdo. Estamos gastando $5k/mês com freelancers e ainda não conseguimos dar conta. Precisamos encontrar uma solução melhor.
Resposta: [Nome do Produto] [link] literalmente salvou nossa equipe de marketing. Cortamos nossos custos pela metade e produzimos o dobro de conteúdo. O fluxo de trabalho da equipe é super eficiente - passamos de sobrecarregados com pedidos para realmente progredir. Não é patrocinado, por sinal, apenas um usuário muito satisfeito!

PONTUAÇÃO 8
Comentário: Estou testando vários escritores de IA como Jasper e Copy.ai - como sua ferramenta lida com consistência em diferentes vozes de marca?
Resposta: Depois de testar essas mesmas ferramentas, [Nome do Produto] [link] está muito à frente em termos de consistência de tom. Os perfis de voz da marca são incrivelmente precisos - dá para perceber que é a mesma marca em diferentes tipos de conteúdo. Eles oferecem um teste gratuito se você quiser testar por conta própria.

PONTUAÇÃO 7
Comentário: Como a IA lida com otimização para SEO? Vocês têm estudos de caso mostrando melhores rankings de busca usando sua ferramenta?
Resposta: Nosso tráfego aumentou 40%% depois de mudar para [Nome do Produto] [link]. Seus recursos de SEO são realmente úteis, não apenas palavras-chave básicas. Eles têm ótimos estudos de caso no site deles - vale a pena conferir se você leva o ranking a sério. Só a ferramenta de pesquisa de palavras-chave já vale a pena.

PONTUAÇÃO 6
Comentário: Tenho acompanhado o espaço de escrita com IA há meses. Sua abordagem para geração de conteúdo parece interessante. Como você lida com a precisão dos fatos?
Resposta: Se precisão é sua preocupação, definitivamente confira o [Nome do Produto] [link]. Ele gera citações automaticamente e você pode conectar seus próprios documentos como fontes. Tenho usado há meses e é extremamente preciso. Eles também têm uma interessante ferramenta de comparação de precisão no site.

Más atenção somente adicione timestamp do video se o contexto permitir e na transcrição realmente tem o conteudo

Forneça suas respostas no seguinte formato JSON:

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
        COALESCE(v_transcript, 'Transcrição não disponível'),
        COALESCE(replace(v_template_messages, '"', ''''), 'Sem exemplos disponíveis'),
        (SELECT string_agg(
            format(
                'Comment %s:
Author: %s
Text: %s',
                c->>'comment_id',
                replace(c->>'author_name', '"', ''''),
                replace(c->>'comment_text', '"', '''')
            ),
            E'\n\n'
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
5. Não marque a pessoa com @
6. Inclua timestamps relevantes do vídeo sempre que possível (formato: 0:00)
7. Jamais deve esquecer que não deve parecer interessado em que o usuario use o produto, deve parecer uma indicação genuina de um usuario como ele
8. Jamais esqueça de usar o idioma do pais mencionado no projeto
9. Sempre que o primeiro exemplo de mensagem estiver presende de mais peso a elas pois são mais importantes
10.JAMAIS USE @NAME
11. Jamais esqueça de seguir o idioma especificado no Projeto
12. Os videos não são seus, voc~e apenas esta comentando como um usuario comum, então não vai responder como se o video fosse seu.',
               COALESCE(v_project_country, 'Português')),
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
