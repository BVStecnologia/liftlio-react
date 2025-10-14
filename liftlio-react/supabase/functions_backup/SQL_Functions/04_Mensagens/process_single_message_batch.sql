-- =============================================
-- Função: process_single_message_batch
-- Descrição: Processa um lote de mensagens, atualizando comentários e criando mensagens. Retorna estatísticas do progresso.
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.process_single_message_batch(project_id integer, batch_size integer)
 RETURNS TABLE(processed_count integer, remaining_count bigint, total_leads bigint, completion_percentage numeric)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_processed INTEGER;
    v_remaining BIGINT;
    v_total BIGINT;
    v_percentage NUMERIC;
BEGIN
    -- Processa um lote
    SELECT update_comments_and_create_messages(project_id, batch_size) INTO v_processed;

    -- Conta comentários restantes
    SELECT
        COUNT(*) INTO v_remaining
    FROM "Comentarios_Principais" cp
    JOIN "Videos" v ON cp.video_id = v.id
    JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
    WHERE s."Projeto_id" = project_id
    AND cp.led = true
    AND (cp.mensagem IS NULL OR cp.mensagem = false);

    -- Conta total de leads
    SELECT
        COUNT(*) INTO v_total
    FROM "Comentarios_Principais" cp
    JOIN "Videos" v ON cp.video_id = v.id
    JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
    WHERE s."Projeto_id" = project_id
    AND cp.led = true;

    -- Calcula porcentagem
    v_percentage := ROUND(((v_total - v_remaining)::NUMERIC / NULLIF(v_total::NUMERIC, 0)) * 100, 2);

    RETURN QUERY
    SELECT
        v_processed,
        v_remaining,
        v_total,
        v_percentage;
END;
$function$