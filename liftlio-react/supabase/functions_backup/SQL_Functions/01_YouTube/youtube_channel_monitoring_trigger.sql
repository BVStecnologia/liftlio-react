CREATE OR REPLACE FUNCTION public.youtube_channel_monitoring_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    projeto_valido BOOLEAN;
BEGIN
    -- Em caso de exclusão, não precisamos fazer nada
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;

    -- Verificar se o projeto tem integração válida
    SELECT integracao_valida INTO projeto_valido
    FROM "Projeto"
    WHERE id = NEW."Projeto";

    -- Se for uma inserção ou atualização relevante em um projeto válido
    IF ((TG_OP = 'INSERT' OR
         (TG_OP = 'UPDATE' AND
          (OLD."Projeto" != NEW."Projeto" OR
           (OLD.is_active IS DISTINCT FROM NEW.is_active))))
        AND projeto_valido = TRUE AND NEW.is_active = TRUE) THEN

        -- Registrar a ativação do monitoramento
        INSERT INTO system_logs (operation, details)
        VALUES (
            'youtube_channel_monitoring',
            format('Canal %s "%s" acionou verificação de processamento.',
                  NEW.id, COALESCE(NEW."Nome", 'Sem nome'))
        );

        -- Acionar função de verificação e ativação
        PERFORM check_and_activate_youtube_processing();
    END IF;

    RETURN NEW;
END;
$function$