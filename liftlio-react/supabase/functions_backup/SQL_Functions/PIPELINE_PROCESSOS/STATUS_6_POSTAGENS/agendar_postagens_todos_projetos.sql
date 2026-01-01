-- =============================================
-- Funcao: agendar_postagens_todos_projetos
-- Descricao: Agenda postagens para todos os projetos ativos
-- Criado: 2025-01-01
-- Atualizado: 2026-01-01 - Removido buffer de 3 dias, agora usa apenas Postagem_dia como limite
-- =============================================

CREATE OR REPLACE FUNCTION public.agendar_postagens_todos_projetos()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    total_agendado INTEGER := 0;
    projeto_record RECORD;
    resultado INTEGER;
    v_posts_por_dia INTEGER;
BEGIN
    RAISE NOTICE 'Iniciando agendamento para todos os projetos ativos';

    FOR projeto_record IN (
        SELECT
            p.id,
            COALESCE(NULLIF(p."Postagem_dia", ''), '3')::integer as posts_por_dia
        FROM "Projeto" p
        WHERE p."Youtube Active" = true
        AND p.integracao_valida = true
        AND (
            SELECT COUNT(*)
            FROM "Settings messages posts" smp
            WHERE smp."Projeto" = p.id
            AND smp.status = 'pending'
        ) < COALESCE(NULLIF(p."Postagem_dia", ''), '3')::integer  -- SEM buffer, apenas Postagem_dia
        AND EXISTS (
            SELECT 1
            FROM "Mensagens" m
            JOIN "Comentarios_Principais" cp ON m."Comentario_Principais" = cp.id
            JOIN "Videos" v ON cp.video_id = v.id
            LEFT JOIN "Canais do youtube" c ON v.channel_id_yotube = c.channel_id
            WHERE m.project_id = p.id
            AND m.respondido = false
            AND (
                c.channel_id IS NULL
                OR
                can_comment_on_channel(c.channel_id, p.id) = TRUE
            )
        )
    ) LOOP
        RAISE NOTICE 'Processando projeto % (posts/dia: %, max pending: %)',
            projeto_record.id,
            projeto_record.posts_por_dia,
            projeto_record.posts_por_dia;  -- Mesmo valor, sem multiplicador
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
$function$;
