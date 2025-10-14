-- =============================================
-- Função: atualizar_keywords_projeto (versão 1 - sem parâmetros)
-- Descrição: Atualiza keywords de um projeto usando Claude
-- Criado: 2025-01-24
-- Atualizado: Versão sem parâmetros - pega o projeto mais recente
-- =============================================

CREATE OR REPLACE FUNCTION public.atualizar_keywords_projeto()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  projeto_id bigint;
  description_service text;
  keywords text;
BEGIN
  -- Obtém o ID do projeto atual (você pode ajustar essa lógica conforme necessário)
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
$function$