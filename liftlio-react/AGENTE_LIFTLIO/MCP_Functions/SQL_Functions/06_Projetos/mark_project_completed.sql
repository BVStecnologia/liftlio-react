-- =============================================
-- Função: mark_project_completed
-- Descrição: Marca projeto como concluído e cancela jobs
-- Criado: 2025-01-24
-- Atualizado: Atualiza status para '5' e limpa agendamentos
-- =============================================

CREATE OR REPLACE FUNCTION public.mark_project_completed(projeto_id bigint)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Atualiza o status para concluído (5)
    UPDATE public."Projeto"
    SET status = '5'
    WHERE id = projeto_id;
    
    -- Cancela explicitamente qualquer job existente
    PERFORM cancel_project_jobs(projeto_id);
    
    RETURN 'Projeto ' || projeto_id || ' marcado como concluído e jobs cancelados.';
EXCEPTION WHEN OTHERS THEN
    RETURN 'Erro ao concluir projeto ' || projeto_id || ': ' || SQLERRM;
END;
$function$
