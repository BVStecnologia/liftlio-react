DROP FUNCTION IF EXISTS public.agendar_postagens_todos_projetos();

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

    -- Buscar projetos ativos com menos de 2 agendamentos pendentes E com mensagens n�o respondidas
    FOR projeto_record IN (
        SELECT p.id
        FROM "Projeto" p
        WHERE p."Youtube Active" = true
        AND p.integracao_valida = true  -- Validar integra��o ativa
        AND (
            SELECT COUNT(*)
            FROM "Settings messages posts" smp
            WHERE smp."Projeto" = p.id
            AND smp.status = 'pending'
        ) < 2  -- ← Mantém no máximo 2 pending (buffer de postagens)
        AND EXISTS (
            SELECT 1
            FROM "Mensagens" m
            JOIN "Comentarios_Principais" cp ON m."Comentario_Principais" = cp.id
            JOIN "Videos" v ON cp.video_id = v.id
            LEFT JOIN "Canais do youtube" c ON v.channel_id_yotube = c.channel_id
            WHERE m.project_id = p.id
            AND m.respondido = false
            AND (
                -- Canal novo (n�o existe na tabela) - OK para agendar
                c.channel_id IS NULL
                OR
                -- Canal existe MAS n�o est� bloqueado por anti-spam
                can_comment_on_channel(c.channel_id, p.id) = TRUE
            )
        )
    ) LOOP
        RAISE NOTICE 'Processando projeto % com mensagens n�o respondidas', projeto_record.id;
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