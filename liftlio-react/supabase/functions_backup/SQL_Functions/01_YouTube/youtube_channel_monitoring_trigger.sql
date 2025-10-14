CREATE OR REPLACE FUNCTION public.youtube_channel_monitoring_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    projeto_valido BOOLEAN;
BEGIN
    -- Em caso de exclus�o, n�o precisamos fazer nada
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;

    -- Verificar se o projeto tem integra��o v�lida
    SELECT integracao_valida INTO projeto_valido
    FROM "Projeto"
    WHERE id = NEW."Projeto";

    -- Se for uma inser��o ou atualiza��o relevante em um projeto v�lido
    IF ((TG_OP = 'INSERT' OR
         (TG_OP = 'UPDATE' AND
          (OLD."Projeto" != NEW."Projeto" OR
           (OLD.is_active IS DISTINCT FROM NEW.is_active))))
        AND projeto_valido = TRUE AND NEW.is_active = TRUE) THEN

        -- Registrar a ativa��o do monitoramento
        INSERT INTO system_logs (operation, details)
        VALUES (
            'youtube_channel_monitoring',
            format('Canal %s "%s" acionou verifica��o de processamento.',
                  NEW.id, COALESCE(NEW."Nome", 'Sem nome'))
        );

        -- Acionar fun��o de verifica��o e ativa��o
        PERFORM check_and_activate_youtube_processing();
    END IF;

    RETURN NEW;
END;
$function$