CREATE OR REPLACE FUNCTION public.youtube_video_queue_monitoring_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    projeto_valido BOOLEAN;
BEGIN
    -- Verificar se o campo videos_para_scann foi realmente alterado
    IF (OLD.videos_para_scann IS NOT DISTINCT FROM NEW.videos_para_scann) THEN
        RETURN NEW; -- Nada mudou, n�o precisamos fazer nada
    END IF;

    -- Verificar se o novo valor tem conte�do (n�o est� vazio)
    IF (NEW.videos_para_scann IS NULL OR NEW.videos_para_scann = '') THEN
        RETURN NEW; -- Valor vazio, n�o precisamos processar
    END IF;

    -- Verificar se o projeto tem integra��o v�lida
    SELECT integracao_valida INTO projeto_valido
    FROM "Projeto"
    WHERE id = NEW."Projeto";

    -- S� prosseguir se o projeto for v�lido e o canal estiver ativo
    IF (projeto_valido = TRUE AND NEW.is_active = TRUE) THEN
        -- Registrar a ativa��o do processamento de v�deos
        INSERT INTO system_logs (operation, details)
        VALUES (
            'youtube_video_queue_monitoring',
            format('Canal %s "%s" adicionou v�deos � fila: %s',
                  NEW.id, COALESCE(NEW."Nome", 'Sem nome'), NEW.videos_para_scann)
        );

        -- Ativar o processador de v�deos
        -- Aqui voc� pode chamar a fun��o para ativar o processamento
        -- Por exemplo: PERFORM setup_video_scan_processor();
        -- Ou processar manualmente um v�deo: PERFORM process_next_video_from_scan_queue();
    END IF;

    RETURN NEW;
END;
$function$