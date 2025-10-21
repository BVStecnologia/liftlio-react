-- =============================================
-- Fun��o: check_and_update_projects_status
-- Descri��o: Verifica e atualiza status de projetos baseado em crit�rios
-- Criado: 2025-01-24
-- Atualizado: Atualiza status para '0' baseado em condi��es espec�ficas
-- =============================================

CREATE OR REPLACE FUNCTION public.check_and_update_projects_status()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Atualiza o status para '0' para projetos que:
    -- 1. T�m "Youtube Active" como TRUE
    -- 2. T�m integra��o ativa (integracao_valida = TRUE)
    -- 3. J� possuem mensagens cadastradas (n�o � um projeto novo)
    -- 4. T�m menos de 3 mensagens n�o respondidas DE CANAIS V�LIDOS
    UPDATE public."Projeto" p
    SET status = '0'
    WHERE p."Youtube Active" = TRUE
    AND p.integracao_valida = TRUE  -- Validar integra��o ativa
    AND EXISTS (
        SELECT 1 FROM public."Mensagens" m WHERE m.project_id = p.id
    ) -- Verifica se j� existem mensagens para este projeto
    AND (
        SELECT COUNT(*)
        FROM public."Mensagens" m
        JOIN "Comentarios_Principais" cp ON m."Comentario_Principais" = cp.id
        JOIN "Videos" v ON cp.video_id = v.id
        LEFT JOIN "Canais do youtube" c ON v.channel_id_yotube = c.channel_id
        WHERE m.project_id = p.id
        AND m.respondido = FALSE
        AND (
            -- Canal novo (n�o existe na tabela) - OK para contar
            c.channel_id IS NULL
            OR
            -- Canal existe MAS n�o est� bloqueado por anti-spam
            can_comment_on_channel(c.channel_id, p.id) = TRUE
        )
    ) < 3;

    -- Log da execu��o
    RAISE NOTICE 'Verifica��o de projetos conclu�da: % projetos atualizados',
        (SELECT COUNT(*) FROM public."Projeto" WHERE status = '0' AND "Youtube Active" = TRUE);
END;
$function$