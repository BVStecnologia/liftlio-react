-- =============================================
-- Fun��o: atualizar_keywords_projeto (vers�o 1 - sem par�metros)
-- Descri��o: Atualiza keywords de um projeto usando Claude
-- Criado: 2025-01-24
-- Atualizado: Vers�o sem par�metros - pega o projeto mais recente
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
  -- Obt�m o ID do projeto atual (voc� pode ajustar essa l�gica conforme necess�rio)
  SELECT id INTO projeto_id FROM "Projeto" ORDER BY id DESC LIMIT 1;

  -- Obt�m a descri��o do servi�o do projeto atual
  SELECT "description service" INTO description_service FROM "Projeto" WHERE id = projeto_id;

  -- Chama a fun��o claude() com os par�metros especificados
  SELECT claude(
    'trocas por ' || description_service || ' da tabela projeto',
    'Voc� � respons�vel por encontrar as melhores 5 palavras chaves para encontrarmos videos no youtube que contenham o assunto relevante, responda somente com as palavras chaves separadas por '',''   Pare.. Respire fundo.. Agora preste aten��o: Voc� deve levar em considera��o t�tulos de videos que podem conter pessoas comentando sobre esse assunto, pense em que tipo de v�deo do youtube isso possa fazer sentido. Sempre responda na l�ngua da entrada de texto.  Jamais responda nada al�m das palavras chaves separadas com '',''. N�o ultrapasse 5 resultados. SEMPRE EM INGLES DOS EUA',
    4000,
    'claude-3-5-sonnet-20240620'
  ) INTO keywords;

  -- Atualiza o campo "Keywords" do projeto atual com as palavras-chave obtidas
  UPDATE "Projeto" SET "Keywords" = keywords WHERE id = projeto_id;
END;
$function$