-- =============================================
-- Função: atualizar_keywords_projeto
-- Descrição: Atualiza as keywords de um projeto usando Claude AI
-- Criado: 2025-01-23
-- Atualizado: 2025-12-27 - Corrigido modelo morto, usa claude_complete()
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

  -- Usa claude_complete() que herda modelo de get_current_claude_model()
  SELECT claude_complete(
    'Generate EXACTLY 5 keywords for YouTube videos about: ' || description_service || '. IMPORTANT: Provide ONLY 5 keywords, no more, no less. Separate them with commas.',
    'You are an expert in SEO and YouTube content analysis. Your task is to generate EXACTLY 5 highly relevant English keywords for finding YouTube videos related to the given service description. Consider what people might be discussing in videos about this topic. Respond ONLY with the 5 keywords, separated by commas, without any additional text or explanation. The keywords must be in US English. DO NOT exceed 5 keywords under any circumstances.',
    500,
    0.7
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

  -- Usa claude_complete() que herda modelo de get_current_claude_model()
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
