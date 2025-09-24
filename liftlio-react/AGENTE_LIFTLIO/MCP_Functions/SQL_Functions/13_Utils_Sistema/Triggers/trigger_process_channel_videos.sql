-- =============================================
-- Função: trigger_process_channel_videos
-- Descrição: Trigger para processar vídeos de canal quando campo processar é atualizado
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.trigger_process_channel_videos()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Verificar se o campo processar foi atualizado e contém dados
    IF (TG_OP = 'UPDATE' AND
        (NEW.processar IS NOT NULL AND NEW.processar <> '') AND
        (OLD.processar IS NULL OR OLD.processar = '' OR NEW.processar <> OLD.processar))
        OR (TG_OP = 'INSERT' AND NEW.processar IS NOT NULL AND NEW.processar <> '') THEN

        -- Chamar função de processamento
        PERFORM process_channel_videos(NEW.id);
    END IF;

    RETURN NEW;
END;
$function$