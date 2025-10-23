-- =============================================
-- Fun��o: check_and_update_projects_status
-- Descri��o: Verifica e atualiza status de projetos baseado em crit�rios
-- Criado: 2025-01-24
-- Atualizado: 2025-10-23 - Adicionada verificação de Mentions disponíveis
--                          Projetos sem Mentions NÃO entram no pipeline
-- =============================================

CREATE OR REPLACE FUNCTION public.check_and_update_projects_status()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Atualiza o status para '0' para projetos que:
    -- 1. Têm "Youtube Active" como TRUE
    -- 2. Têm integração ativa (integracao_valida = TRUE)
    -- 3. NOVO: Customer tem Mentions disponíveis (> 0)
    -- 4. Já possuem mensagens cadastradas (não é um projeto novo)
    -- 5. Têm menos de 3 mensagens não respondidas DE CANAIS VÁLIDOS
    UPDATE public."Projeto" p
    SET status = '0'
    WHERE p."Youtube Active" = TRUE
    AND p.integracao_valida = TRUE  -- Validar integração ativa
    AND EXISTS (
        -- NOVO: Verificar se customer tem Mentions disponíveis
        SELECT 1
        FROM customers c
        WHERE c.user_id = p."User id"
        AND COALESCE(c."Mentions", 0) > 0
    )
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

    -- Log da execução com detalhes de Mentions
    RAISE NOTICE 'Verificação de projetos concluída: % projetos atualizados para STATUS 0',
        (SELECT COUNT(*) FROM public."Projeto" WHERE status = '0' AND "Youtube Active" = TRUE);

    RAISE NOTICE 'Projetos SEM Mentions (ignorados): %',
        (SELECT COUNT(*)
         FROM public."Projeto" p
         LEFT JOIN customers c ON p."User id" = c.user_id
         WHERE p."Youtube Active" = TRUE
         AND (c."Mentions" IS NULL OR c."Mentions" <= 0));
END;
$function$