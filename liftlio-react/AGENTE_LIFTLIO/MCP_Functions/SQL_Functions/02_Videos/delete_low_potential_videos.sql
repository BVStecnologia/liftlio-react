-- =============================================
-- Função: delete_low_potential_videos (TRIGGER)
-- Descrição: Remove automaticamente vídeos com baixo potencial
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.delete_low_potential_videos();

CREATE OR REPLACE FUNCTION public.delete_low_potential_videos()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Como temos CASCADE configurado nas chaves estrangeiras,
    -- podemos simplesmente deletar o vídeo diretamente
    DELETE FROM "Videos"
    WHERE id = NEW.id;

    RAISE NOTICE 'Vídeo com ID % foi removido automaticamente (lead_potential = Low)', NEW.id;

    -- Retorna NULL porque a linha já foi apagada
    RETURN NULL;
END;
$function$;