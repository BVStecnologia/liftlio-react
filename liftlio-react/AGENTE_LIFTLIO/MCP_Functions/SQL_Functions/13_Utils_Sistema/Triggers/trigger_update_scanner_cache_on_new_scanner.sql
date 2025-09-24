-- =============================================
-- Função: trigger_update_scanner_cache_on_new_scanner
-- Descrição: Trigger para atualizar cache quando novo scanner é criado
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.trigger_update_scanner_cache_on_new_scanner()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Chama a função update_scanner_cache com o ID do projeto associado ao novo scanner
    IF NEW."Projeto_id" IS NOT NULL THEN
        PERFORM update_scanner_cache(NEW."Projeto_id");
    END IF;
    RETURN NEW;
END;
$function$