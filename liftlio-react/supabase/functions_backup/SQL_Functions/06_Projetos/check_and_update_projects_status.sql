-- =============================================
-- Função: check_and_update_projects_status (REFATORADA)
-- Descrição: Verifica e atualiza status de projetos baseado em critérios inteligentes
-- Criado: 2025-01-24
-- Atualizado: 2025-10-23 - Adicionada verificação de Mentions disponíveis
-- Atualizado: 2025-10-25 - Correção: só reseta projetos que JÁ completaram (status = 6)
-- Atualizado: 2025-10-28 - REFATORAÇÃO COMPLETA
--   • DIVERSIDADE DE CONTEÚDO: Verifica vídeos únicos, não só quantidade
--   • DETECÇÃO DE REPETIÇÃO: Identifica se posts recentes são muito repetitivos
--   • GARANTIA DE VARIEDADE: Força pipeline se < 3 vídeos diferentes disponíveis
--   • INTELIGÊNCIA ANTI-SPAM: Considera canais bloqueados por anti-spam
--
-- 🚨 CRONS QUE CHAMAM ESTA FUNÇÃO:
--    Job 159028: "Cria novas mensagens" - */5 * * * * (a cada 5min) ✅ ATIVO
--
-- 🎯 OBJETIVO:
--    Garantir que projeto SEMPRE tenha conteúdo DIVERSO para agendar
--    Evitar postar múltiplas vezes no mesmo canal/vídeo
-- =============================================

CREATE OR REPLACE FUNCTION public.check_and_update_projects_status()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    projeto_record RECORD;
    total_atualizado integer := 0;
    total_sem_mentions integer := 0;
    total_sem_diversidade integer := 0;
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 VERIFICAÇÃO DE PROJETOS - Análise de Diversidade';
    RAISE NOTICE '════════════════════════════════════════════════════════════';

    -- Loop por cada projeto ativo que já completou pipeline (status = 6)
    FOR projeto_record IN
        SELECT
            p.id,
            p."Project name",
            p."User id",

            -- ══════════════════════════════════════════════════════════
            -- MÉTRICA 1: Mensagens não respondidas disponíveis
            -- ══════════════════════════════════════════════════════════
            (
                SELECT COUNT(*)
                FROM "Mensagens" m
                JOIN "Comentarios_Principais" cp ON m."Comentario_Principais" = cp.id
                JOIN "Videos" v ON cp.video_id = v.id
                LEFT JOIN "Canais do youtube" c ON v.channel_id_yotube = c.channel_id
                WHERE m.project_id = p.id
                AND m.respondido = FALSE
                AND (
                    -- Canal novo (não existe na tabela) - OK para contar
                    c.channel_id IS NULL
                    OR
                    -- Canal existe MAS não está bloqueado por anti-spam
                    can_comment_on_channel(c.channel_id, p.id) = TRUE
                )
            ) as mensagens_disponiveis,

            -- ══════════════════════════════════════════════════════════
            -- MÉTRICA 2: Vídeos ÚNICOS disponíveis (NOVO!)
            -- ══════════════════════════════════════════════════════════
            (
                SELECT COUNT(DISTINCT cp.video_id)
                FROM "Mensagens" m
                JOIN "Comentarios_Principais" cp ON m."Comentario_Principais" = cp.id
                JOIN "Videos" v ON cp.video_id = v.id
                LEFT JOIN "Canais do youtube" c ON v.channel_id_yotube = c.channel_id
                WHERE m.project_id = p.id
                AND m.respondido = FALSE
                AND (
                    c.channel_id IS NULL
                    OR
                    can_comment_on_channel(c.channel_id, p.id) = TRUE
                )
            ) as videos_unicos_disponiveis,

            -- ══════════════════════════════════════════════════════════
            -- MÉTRICA 3: Canais ÚNICOS disponíveis (NOVO!)
            -- ══════════════════════════════════════════════════════════
            (
                SELECT COUNT(DISTINCT v.channel_id_yotube)
                FROM "Mensagens" m
                JOIN "Comentarios_Principais" cp ON m."Comentario_Principais" = cp.id
                JOIN "Videos" v ON cp.video_id = v.id
                LEFT JOIN "Canais do youtube" c ON v.channel_id_yotube = c.channel_id
                WHERE m.project_id = p.id
                AND m.respondido = FALSE
                AND (
                    c.channel_id IS NULL
                    OR
                    can_comment_on_channel(c.channel_id, p.id) = TRUE
                )
            ) as canais_unicos_disponiveis,

            -- ══════════════════════════════════════════════════════════
            -- MÉTRICA 4: Diversidade nos posts recentes (NOVO!)
            -- Quantos vídeos diferentes foram postados nos últimos 7 dias?
            -- ══════════════════════════════════════════════════════════
            (
                SELECT COUNT(DISTINCT s."Videos")
                FROM "Settings messages posts" s
                WHERE s."Projeto" = p.id
                AND (
                    s.proxima_postagem > NOW() - INTERVAL '7 days'
                    OR s.posted_at > NOW() - INTERVAL '7 days'
                )
            ) as videos_diferentes_7dias,

            -- ══════════════════════════════════════════════════════════
            -- MÉTRICA 5: Customer tem Mentions disponíveis?
            -- ══════════════════════════════════════════════════════════
            (
                SELECT COALESCE(c."Mentions", 0)
                FROM customers c
                WHERE c.user_id = p."User id"
            ) as mentions_disponiveis

        FROM "Projeto" p
        WHERE p."Youtube Active" = TRUE
        AND p.integracao_valida = TRUE
        AND p.status = '6'  -- APENAS projetos que JÁ completaram o pipeline
        AND EXISTS (
            -- Verificar se projeto já tem mensagens (não é novo)
            SELECT 1 FROM "Mensagens" m WHERE m.project_id = p.id
        )
    LOOP

        RAISE NOTICE '────────────────────────────────────────────────────';
        RAISE NOTICE '📊 Projeto % ("%")', projeto_record.id, projeto_record."Project name";
        RAISE NOTICE '   • Mensagens disponíveis: %', projeto_record.mensagens_disponiveis;
        RAISE NOTICE '   • Vídeos únicos: %', projeto_record.videos_unicos_disponiveis;
        RAISE NOTICE '   • Canais únicos: %', projeto_record.canais_unicos_disponiveis;
        RAISE NOTICE '   • Diversidade 7 dias: % vídeos diferentes', projeto_record.videos_diferentes_7dias;
        RAISE NOTICE '   • Mentions: %', projeto_record.mentions_disponiveis;

        -- ══════════════════════════════════════════════════════════════
        -- VALIDAÇÃO 1: Customer tem Mentions disponíveis?
        -- ══════════════════════════════════════════════════════════════
        IF projeto_record.mentions_disponiveis <= 0 THEN
            RAISE NOTICE '   ⚠️ SEM MENTIONS - Projeto ignorado';
            total_sem_mentions := total_sem_mentions + 1;
            CONTINUE;  -- Pular para próximo projeto
        END IF;

        -- ══════════════════════════════════════════════════════════════
        -- DECISÃO: RESETAR PARA STATUS 0 (pedir mais conteúdo)?
        -- ══════════════════════════════════════════════════════════════

        -- CRITÉRIO 1: Menos de 3 mensagens disponíveis (original)
        IF projeto_record.mensagens_disponiveis < 3 THEN
            UPDATE "Projeto"
            SET status = '0'
            WHERE id = projeto_record.id;

            RAISE NOTICE '   ✅ RESETADO (status = 0): < 3 mensagens disponíveis';
            total_atualizado := total_atualizado + 1;
            CONTINUE;
        END IF;

        -- CRITÉRIO 2: Menos de 3 VÍDEOS DIFERENTES disponíveis (NOVO!)
        IF projeto_record.videos_unicos_disponiveis < 3 THEN
            UPDATE "Projeto"
            SET status = '0'
            WHERE id = projeto_record.id;

            RAISE NOTICE '   ✅ RESETADO (status = 0): < 3 vídeos únicos (falta diversidade)';
            total_atualizado := total_atualizado + 1;
            total_sem_diversidade := total_sem_diversidade + 1;
            CONTINUE;
        END IF;

        -- CRITÉRIO 3: Menos de 2 CANAIS DIFERENTES disponíveis (NOVO!)
        IF projeto_record.canais_unicos_disponiveis < 2 THEN
            UPDATE "Projeto"
            SET status = '0'
            WHERE id = projeto_record.id;

            RAISE NOTICE '   ✅ RESETADO (status = 0): < 2 canais únicos (falta diversidade)';
            total_atualizado := total_atualizado + 1;
            total_sem_diversidade := total_sem_diversidade + 1;
            CONTINUE;
        END IF;

        -- CRITÉRIO 4: Posts recentes muito repetitivos (NOVO!)
        -- Se nos últimos 7 dias postou em menos de 3 vídeos diferentes = muito repetitivo
        IF projeto_record.videos_diferentes_7dias < 3 AND projeto_record.videos_diferentes_7dias > 0 THEN
            UPDATE "Projeto"
            SET status = '0'
            WHERE id = projeto_record.id;

            RAISE NOTICE '   ✅ RESETADO (status = 0): Posts repetitivos (só % vídeos em 7 dias)',
                projeto_record.videos_diferentes_7dias;
            total_atualizado := total_atualizado + 1;
            total_sem_diversidade := total_sem_diversidade + 1;
            CONTINUE;
        END IF;

        -- Se chegou aqui, projeto está OK (não precisa resetar)
        RAISE NOTICE '   ✓ OK - Conteúdo suficiente e diverso';

    END LOOP;

    -- ══════════════════════════════════════════════════════════════
    -- SUMÁRIO FINAL
    -- ══════════════════════════════════════════════════════════════
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '📈 SUMÁRIO DA VERIFICAÇÃO:';
    RAISE NOTICE '   • Total resetados para STATUS 0: %', total_atualizado;
    RAISE NOTICE '   • Resetados por falta de diversidade: %', total_sem_diversidade;
    RAISE NOTICE '   • Projetos sem Mentions (ignorados): %', total_sem_mentions;
    RAISE NOTICE '════════════════════════════════════════════════════════════';

END;
$function$;
