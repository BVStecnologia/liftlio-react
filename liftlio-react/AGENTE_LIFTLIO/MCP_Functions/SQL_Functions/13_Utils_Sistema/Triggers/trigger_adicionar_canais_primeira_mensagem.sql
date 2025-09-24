-- =============================================
-- Função: trigger_adicionar_canais_primeira_mensagem
-- Descrição: Trigger para adicionar canais automaticamente na primeira mensagem do projeto
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.trigger_adicionar_canais_primeira_mensagem()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  primeira_mensagem BOOLEAN;
BEGIN
  -- Verifica se a nova linha tem um project_id
  IF NEW.project_id IS NOT NULL THEN
    -- Adquire um bloqueio consultivo no project_id para evitar execuções concorrentes
    PERFORM pg_advisory_xact_lock(hashtext(CAST(NEW.project_id AS text)));

    -- Verifica se esta é a primeira mensagem para este project_id (incluindo a atual)
    SELECT COUNT(*) = 1 INTO primeira_mensagem
    FROM public."Mensagens"
    WHERE project_id = NEW.project_id;

    IF primeira_mensagem THEN
      -- Executa a função usando o project_id
      PERFORM adicionar_canais_automaticamente(NEW.project_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$