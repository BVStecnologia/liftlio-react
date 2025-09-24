-- =============================================
-- Fun��o: check_project_processing_status
-- Descri��o: Verifica status de processamento de projeto e atualiza se conclu�do
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.check_project_processing_status(project_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    videos_pending INT;
    comments_pending INT;
BEGIN
    SELECT COUNT(*) INTO videos_pending
    FROM "Videos"
    WHERE scanner_id = project_id AND (comentarios_atualizados = FALSE OR ai_analysis_timestamp IS NULL);

    SELECT COUNT(*) INTO comments_pending
    FROM "Comentarios_Principais" cp
    JOIN "Videos" v ON cp.video_id = v.id
    WHERE v.scanner_id = project_id AND cp.comentario_analizado IS NOT TRUE;

    IF videos_pending = 0 AND comments_pending = 0 THEN
        UPDATE "Projeto" SET status = 'Conclu�do' WHERE id = project_id;
        RETURN 'Processamento conclu�do para o projeto ' || project_id;
    ELSE
        RETURN format('Em andamento. V�deos pendentes: %s, Coment�rios pendentes: %s', videos_pending, comments_pending);
    END IF;
END;
$function$