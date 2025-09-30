-- =============================================
-- Função: process_pending_videos
-- Descrição: Processa vídeos pendentes para buscar comentários
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.process_pending_videos(integer, integer);

CREATE OR REPLACE FUNCTION public.process_pending_videos(project_id integer, batch_size integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    video_record RECORD;
    process_result TEXT;
BEGIN
    FOR video_record IN (
        SELECT v.id, v."VIDEO" as video_id
        FROM "Videos" v
        JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
        WHERE s."Projeto_id" = project_id
          AND v.comentarios_atualizados = false
          AND v.comentarios_desativados = false
        LIMIT batch_size
    )
    LOOP
        -- Chama a função para buscar e armazenar comentários
        process_result := fetch_and_store_comments_for_video(video_record.video_id, project_id);

        -- Verifica o resultado do processamento
        IF process_result LIKE 'Comentários desativados%' THEN
            -- Se os comentários estiverem desativados, atualize ambos os campos
            UPDATE "Videos"
            SET comentarios_atualizados = true,
                comentarios_desativados = true
            WHERE id = video_record.id;
        ELSIF process_result LIKE 'Processo concluído com sucesso%' THEN
            -- Se o processo for bem-sucedido, apenas marque como atualizado
            -- (a função fetch_and_store_comments_for_video já faz isso, mas vamos garantir)
            UPDATE "Videos"
            SET comentarios_atualizados = true
            WHERE id = video_record.id;
        ELSE
            -- Se houver algum outro erro, registre-o
            RAISE NOTICE 'Erro ao processar vídeo %: %', video_record.video_id, process_result;
        END IF;
    END LOOP;
END;
$function$;