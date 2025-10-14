-- =============================================
-- Função: manage_default_card
-- Descrição: Trigger para gerenciar cartões padrão (garante apenas um padrão por cliente)
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.manage_default_card()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Se está marcando como default
    IF NEW.is_default = true AND (OLD IS NULL OR OLD.is_default = false) THEN
        -- Desmarcar todos os outros cartões do mesmo customer
        UPDATE cards
        SET is_default = false
        WHERE customer_id = NEW.customer_id
        AND id != NEW.id
        AND is_default = true;
    END IF;

    RETURN NEW;
END;
$function$