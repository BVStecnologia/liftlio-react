-- =============================================
-- Função: delete_low_score_comments
-- Descrição: Trigger que exclui comentários com lead_score menor que 7
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.delete_low_score_comments()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Se o lead_score for atualizado e for menor que 7, exclui o comentário
    IF NEW.lead_score IS NOT NULL AND
       NEW.lead_score ~ '^[0-9]+$' AND  -- Verifica se é um número
       NEW.lead_score::INTEGER < 7 THEN

        -- Registra a exclusão em log (opcional)
        RAISE NOTICE 'Excluindo comentário ID % com lead_score %', NEW.id, NEW.lead_score;

        -- Exclui o comentário imediatamente
        DELETE FROM public."Comentarios_Principais" WHERE id = NEW.id;

        -- Como estamos excluindo o registro, retornamos NULL para informar
        -- que a operação original não deve continuar
        RETURN NULL;
    END IF;

    -- Se não excluímos, permitimos que a operação original continue
    RETURN NEW;
END;
$function$