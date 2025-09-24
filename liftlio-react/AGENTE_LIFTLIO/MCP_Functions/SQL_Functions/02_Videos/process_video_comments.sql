-- =============================================
-- Função: process_video_comments (TRIGGER)
-- Descrição: Trigger para processar comentários de vídeos
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.process_video_comments();

CREATE OR REPLACE FUNCTION public.process_video_comments()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  project_id bigint;
  videos_to_process bigint;
BEGIN
  -- Obtém o project_id do vídeo recém inserido
  SELECT s."Projeto_id" INTO project_id
  FROM "Scanner de videos do youtube" s
  WHERE s.id = NEW.scanner_id;

  -- Loop para processar vídeos em lotes
  LOOP
    -- Processa um lote de vídeos
    UPDATE "Videos"
    SET comentarios_atualizados = TRUE
    WHERE id IN (
      SELECT v.id
      FROM "Videos" v
      JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
      WHERE s."Projeto_id" = project_id
        AND v.comentarios_atualizados = FALSE
      LIMIT 5  -- Processa 5 vídeos por vez
    );

    -- Verifica se ainda há vídeos para processar
    GET DIAGNOSTICS videos_to_process = ROW_COUNT;

    -- Se não houver mais vídeos para processar, sai do loop
    EXIT WHEN videos_to_process = 0;
  END LOOP;

  RETURN NEW;
END;
$function$;