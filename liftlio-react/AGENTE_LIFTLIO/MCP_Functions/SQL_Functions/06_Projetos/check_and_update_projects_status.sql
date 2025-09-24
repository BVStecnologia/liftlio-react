-- =============================================
-- Função: check_and_update_projects_status
-- Descrição: Verifica e atualiza status de projetos baseado em critérios
-- Criado: 2025-01-24
-- Atualizado: Atualiza status para '0' baseado em condições específicas
-- =============================================

CREATE OR REPLACE FUNCTION public.check_and_update_projects_status()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Atualiza o status para '0' para projetos que:
    -- 1. Têm "Youtube Active" como TRUE
    -- 2. Já possuem mensagens cadastradas (não é um projeto novo)
    -- 3. Têm menos de 3 mensagens não respondidas
    UPDATE public."Projeto" p
    SET status = '0'
    WHERE p."Youtube Active" = TRUE
    AND EXISTS (
        SELECT 1 FROM public."Mensagens" m WHERE m.project_id = p.id
    ) -- Verifica se já existem mensagens para este projeto
    AND (
        SELECT COUNT(*)
        FROM public."Mensagens" m
        WHERE m.project_id = p.id
        AND m.respondido = FALSE
    ) < 3;

    -- Log da execução
    RAISE NOTICE 'Verificação de projetos concluída: % projetos atualizados',
        (SELECT COUNT(*) FROM public."Projeto" WHERE status = '0' AND "Youtube Active" = TRUE);
END;
$function$