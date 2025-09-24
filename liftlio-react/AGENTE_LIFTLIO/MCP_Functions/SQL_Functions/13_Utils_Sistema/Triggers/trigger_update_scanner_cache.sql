-- =============================================
-- Função: trigger_update_scanner_cache
-- Descrição: Trigger para atualizar cache do scanner quando keywords são modificadas
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.trigger_update_scanner_cache()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Verifica se o campo "Keywords" foi modificado ou adicionado
    IF (TG_OP = 'INSERT') OR (OLD."Keywords" IS DISTINCT FROM NEW."Keywords") THEN
        -- Chama a função update_scanner_cache com o ID do projeto
        PERFORM update_scanner_cache(NEW.id);
    END IF;
    RETURN NEW;
END;
$function$