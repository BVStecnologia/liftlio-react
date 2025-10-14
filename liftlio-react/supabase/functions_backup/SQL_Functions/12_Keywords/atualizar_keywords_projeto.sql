-- =============================================
-- Função: atualizar_keywords_projeto
-- Descrição: Atualiza as keywords de um projeto usando Claude AI
-- Criado: 2025-01-23
-- =============================================

-- Versão sem parâmetros
DROP FUNCTION IF EXISTS public.atualizar_keywords_projeto();

CREATE OR REPLACE FUNCTION public.atualizar_keywords_projeto()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  projeto_id bigint;
  description_service text;
  keywords text;
BEGIN
  -- Obtém o ID do projeto atual
  SELECT id INTO projeto_id FROM "Projeto" ORDER BY id DESC LIMIT 1;

  -- Obtém a descrição do serviço do projeto atual
  SELECT "description service" INTO description_service FROM "Projeto" WHERE id = projeto_id;

  -- Chama a função claude() com os parâmetros especificados
  SELECT claude(
    'trocas por ' || description_service || ' da tabela projeto',
    'Você é responsável por encontrar as melhores 5 palavras chaves para encontrarmos videos no youtube que contenham o assunto relevante, responda somente com as palavras chaves separadas por '',''   Pare.. Respire fundo.. Agora preste atenção: Você deve levar em consideração títulos de videos que podem conter pessoas comentando sobre esse assunto, pense em que tipo de vídeo do youtube isso possa fazer sentido. Sempre responda na língua da entrada de texto.  Jamais responda nada além das palavras chaves separadas com '',''. Não ultrapasse 5 resultados. SEMPRE EM INGLES DOS EUA',
    4000,
    'claude-3-5-sonnet-20240620'
  ) INTO keywords;

  -- Atualiza o campo "Keywords" do projeto atual com as palavras-chave obtidas
  UPDATE "Projeto" SET "Keywords" = keywords WHERE id = projeto_id;
END;
$function$;

-- Versão com project_id
DROP FUNCTION IF EXISTS public.atualizar_keywords_projeto(bigint);

CREATE OR REPLACE FUNCTION public.atualizar_keywords_projeto(projeto_id bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  description_service text;
  keywords text;
BEGIN
  -- Obtém a descrição do serviço do projeto especificado
  SELECT "description service" INTO description_service FROM "Projeto" WHERE id = projeto_id;

  -- Chama a função claude_complete() com os parâmetros atualizados
  SELECT claude_complete(
    'Generate EXACTLY 5 keywords for YouTube videos about: ' || description_service || '. IMPORTANT: Provide ONLY 5 keywords, no more, no less. Separate them with commas.',
    'You are an expert in SEO and YouTube content analysis. Your task is to generate EXACTLY 5 highly relevant English keywords for finding YouTube videos related to the given service description. Consider what people might be discussing in videos about this topic. Respond ONLY with the 5 keywords, separated by commas, without any additional text or explanation. The keywords must be in US English. DO NOT exceed 5 keywords under any circumstances.',
    500,
    0.7
  ) INTO keywords;

  -- Atualiza o campo "Keywords" do projeto especificado com as palavras-chave obtidas
  UPDATE "Projeto" SET "Keywords" = keywords WHERE id = projeto_id;
END;
$function$;