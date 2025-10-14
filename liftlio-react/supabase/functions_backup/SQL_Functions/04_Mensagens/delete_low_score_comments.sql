-- =============================================
-- Fun��o: delete_low_score_comments
-- Descri��o: Trigger que exclui coment�rios com lead_score menor que 7
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.delete_low_score_comments()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Se o lead_score for atualizado e for menor que 7, exclui o coment�rio
    IF NEW.lead_score IS NOT NULL AND
       NEW.lead_score ~ '^[0-9]+$' AND  -- Verifica se � um n�mero
       NEW.lead_score::INTEGER < 7 THEN

        -- Registra a exclus�o em log (opcional)
        RAISE NOTICE 'Excluindo coment�rio ID % com lead_score %', NEW.id, NEW.lead_score;

        -- Exclui o coment�rio imediatamente
        DELETE FROM public."Comentarios_Principais" WHERE id = NEW.id;

        -- Como estamos excluindo o registro, retornamos NULL para informar
        -- que a opera��o original n�o deve continuar
        RETURN NULL;
    END IF;

    -- Se n�o exclu�mos, permitimos que a opera��o original continue
    RETURN NEW;
END;
$function$