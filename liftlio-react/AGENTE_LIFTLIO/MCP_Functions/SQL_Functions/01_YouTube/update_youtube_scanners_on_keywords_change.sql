CREATE OR REPLACE FUNCTION public.update_youtube_scanners_on_keywords_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Chama as funções para criar scanners e atualizar status apenas se as keywords foram alteradas
    IF NEW."Keywords" IS DISTINCT FROM OLD."Keywords" THEN
        PERFORM create_youtube_scanners_for_project(NEW.id);
        PERFORM update_youtube_scanner_active_status(NEW.id);
    END IF;
    RETURN NEW;
END;
$function$