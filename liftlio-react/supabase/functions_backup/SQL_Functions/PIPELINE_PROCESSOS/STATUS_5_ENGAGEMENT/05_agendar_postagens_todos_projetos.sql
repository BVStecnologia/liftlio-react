CREATE OR REPLACE FUNCTION public.agendar_postagens_todos_projetos()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    total_agendado INTEGER := 0;
    projeto_record RECORD;
    resultado INTEGER;
BEGIN
    -- Log inicial
    RAISE NOTICE 'Iniciando agendamento para todos os projetos ativos';

    -- Buscar projetos ativos sem agendamentos pendentes E com mensagens não respondidas
    FOR projeto_record IN (
        SELECT p.id
        FROM "Projeto" p
        WHERE p."Youtube Active" = true
        AND NOT EXISTS (
            SELECT 1
            FROM "Settings messages posts" smp
            WHERE smp."Projeto" = p.id
            AND smp.status = 'pending'
        )
        AND EXISTS (
            SELECT 3
            FROM "Mensagens" m
            WHERE m.project_id = p.id
            AND m.respondido = false
        )
    ) LOOP
        RAISE NOTICE 'Processando projeto % com mensagens não respondidas', projeto_record.id;
        SELECT agendar_postagens_diarias(projeto_record.id) INTO resultado;
        total_agendado := total_agendado + resultado;
        RAISE NOTICE 'Projeto %: % postagens agendadas', projeto_record.id, resultado;
    END LOOP;

    RAISE NOTICE 'Total: % postagens agendadas', total_agendado;
    RETURN total_agendado;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro: %', SQLERRM;
        RETURN 0;
END;
$function$