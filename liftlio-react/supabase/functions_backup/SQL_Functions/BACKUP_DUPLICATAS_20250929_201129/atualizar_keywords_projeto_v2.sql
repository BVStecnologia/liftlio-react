-- =============================================
-- Fun��o: atualizar_keywords_projeto (vers�o 2 - com projeto_id)
-- Descri��o: Atualiza keywords de um projeto espec�fico usando Claude
-- Criado: 2025-01-24
-- Atualizado: Vers�o com par�metro projeto_id
-- =============================================

CREATE OR REPLACE FUNCTION public.atualizar_keywords_projeto(projeto_id bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  description_service text;
  keywords text;
BEGIN
  -- Obt�m a descri��o do servi�o do projeto especificado
  SELECT "description service" INTO description_service FROM "Projeto" WHERE id = projeto_id;

  -- Chama a fun��o claude_complete() com os par�metros atualizados
  SELECT claude_complete(
    'Generate EXACTLY 5 keywords for YouTube videos about: ' || description_service || '. IMPORTANT: Provide ONLY 5 keywords, no more, no less. Separate them with commas.',
    'You are an expert in SEO and YouTube content analysis. Your task is to generate EXACTLY 5 highly relevant English keywords for finding YouTube videos related to the given service description. Consider what people might be discussing in videos about this topic. Respond ONLY with the 5 keywords, separated by commas, without any additional text or explanation. The keywords must be in US English. DO NOT exceed 5 keywords under any circumstances.',
    500,
    0.7
  ) INTO keywords;

  -- Atualiza o campo "Keywords" do projeto especificado com as palavras-chave obtidas
  UPDATE "Projeto" SET "Keywords" = keywords WHERE id = projeto_id;
END;
$function$