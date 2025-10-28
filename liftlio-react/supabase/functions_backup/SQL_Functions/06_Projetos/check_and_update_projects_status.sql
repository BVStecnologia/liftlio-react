-- =============================================
-- Função: check_and_update_projects_status (V3 SYNC - FINAL!)
-- Descrição: Sistema inteligente 100% sincronizado com agendar_postagens_diarias V3
-- Criado: 2025-01-24
-- Atualizado: 2025-10-23 - Verificação de Mentions
-- Atualizado: 2025-10-25 - Só reseta projetos completos (status = 6)
-- Atualizado: 2025-10-28 - SYNC TOTAL COM V3 HYBRID
--   • MÉTRICA 1: Mensagens disponíveis (original)
--   • MÉTRICA 2: Vídeos únicos disponíveis
--   • MÉTRICA 3: Canais únicos disponíveis
--   • MÉTRICA 4: Diversidade temporal (últimos 7 dias)
--   • MÉTRICA 5: Vídeos SEM cooldown 7 dias (sync com V3!) ⭐ NOVO
--   • MÉTRICA 6: Canais SEM cooldown 24h (sync com V3!) ⭐ NOVO
--   • MÉTRICA 7: Validação contra Postagem_dia dinâmico ⭐ NOVO
--
-- 🔄 SINCRONIZAÇÃO COM V3:
--   Usa EXATAMENTE os mesmos cooldowns e filtros que agendar_postagens_diarias V3:
--   • Cooldown 24h canal (linha 211-218 da V3)
--   • Cooldown 7 dias vídeo (linha 229-234 da V3)
--   • Max 1 pending por vídeo (linha 245-249 da V3)
--   • Validação contra Postagem_dia (linha 71 da V3)
--
-- 🎯 OBJETIVO:
--   Detectar ANTES se V3 vai conseguir agendar posts
--   Se não vai conseguir (cooldowns, falta de diversidade) → resetar status=0
--   Garantir que V3 SEMPRE tem conteúdo USÁVEL disponível
--
-- ⏰ FREQUÊNCIA RECOMENDADA DO CRON:
--   • 1-2 HORAS é o ideal (explicação detalhada no final do arquivo)
--   • Atual: */5 * * * * (5min) = MUITO FREQUENTE, pode mudar para 0 */1 * * *
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
            -- POR QUE CONTAR VÍDEOS ÚNICOS?
            -- • Problema: Pode ter 10 mensagens disponíveis, mas TODAS do mesmo vídeo!
            -- • Impacto: Agendamento ficaria repetitivo (mesmo vídeo múltiplas vezes)
            -- • Solução: Contar DISTINCT video_id = quantos vídeos DIFERENTES tem
            --
            -- EXEMPLO PROBLEMA:
            -- • 10 mensagens disponíveis (parece OK!)
            -- • MAS: 10 mensagens todas do Video123 (só 1 vídeo único!)
            -- • RESULTADO: Posts super repetitivos, falta diversidade
            --
            -- EXEMPLO BOM:
            -- • 10 mensagens disponíveis
            -- • DE: Video123(3), Video456(4), Video789(3) = 3 vídeos únicos
            -- • RESULTADO: Agendamento tem variedade de contextos
            --
            -- NOTA: Também filtra canais válidos (não bloqueados por anti-spam)
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
            -- POR QUE CONTAR CANAIS ÚNICOS?
            -- • Problema: Pode ter 5 vídeos únicos, mas TODOS do mesmo canal!
            -- • Impacto: Parece que estamos "atacando" um canal específico
            -- • Solução: Contar DISTINCT channel_id = quantos canais DIFERENTES tem
            --
            -- EXEMPLO PROBLEMA:
            -- • 5 vídeos únicos (parece OK!)
            -- • MAS: Video1, Video2, Video3, Video4, Video5 TODOS do CanalA
            -- • RESULTADO: Múltiplos posts no mesmo canal = suspeito!
            --
            -- EXEMPLO BOM:
            -- • 5 vídeos únicos
            -- • DE: CanalA(2 vídeos), CanalB(2 vídeos), CanalC(1 vídeo) = 3 canais únicos
            -- • RESULTADO: Distribuição orgânica entre vários canais
            --
            -- IMPACTO: Garante diversidade de origem, não concentração
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
            -- POR QUE ANALISAR POSTS RECENTES?
            -- • Problema: Buffer pode estar OK AGORA, mas posts PASSADOS foram repetitivos
            -- • Detectar: Se últimos 7 dias tivemos poucos vídeos diferentes = padrão repetitivo
            -- • Ação: Forçar pipeline para buscar mais conteúdo DIVERSO
            --
            -- EXEMPLO PROBLEMA:
            -- • Últimos 7 dias: 10 posts realizados
            -- • MAS: Apenas 2 vídeos diferentes (muito repetitivo!)
            -- • DETECÇÃO: videos_diferentes_7dias = 2 (< threshold de 3)
            -- • AÇÃO: Resetar status para 0, pedir mais conteúdo ao pipeline
            --
            -- EXEMPLO BOM:
            -- • Últimos 7 dias: 10 posts realizados
            -- • DE: 8 vídeos diferentes (boa diversidade!)
            -- • RESULTADO: Não precisa resetar, está funcionando bem
            --
            -- NOTA: Conta tanto agendados (proxima_postagem) quanto já postados (postado)
            --       para ter visão completa dos últimos 7 dias
            -- ══════════════════════════════════════════════════════════
            (
                SELECT COUNT(DISTINCT s."Videos")
                FROM "Settings messages posts" s
                WHERE s."Projeto" = p.id
                AND (
                    s.proxima_postagem > NOW() - INTERVAL '7 days'
                    OR s.postado > NOW() - INTERVAL '7 days'
                )
            ) as videos_diferentes_7dias,

            -- ══════════════════════════════════════════════════════════
            -- MÉTRICA 5: Vídeos SEM cooldown de 7 dias (SYNC COM V3!)
            -- ══════════════════════════════════════════════════════════
            -- POR QUE VALIDAR COOLDOWN DE VÍDEOS?
            -- • V3 tem filtro: vídeo NÃO pode ter post nos últimos 7 dias
            -- • Problema: Pode ter 5 vídeos únicos, mas TODOS em cooldown!
            -- • Impacto: V3 tenta agendar mas FALHA (cooldown bloqueia)
            --
            -- EXEMPLO PROBLEMA:
            -- • 5 vídeos únicos disponíveis (passa métrica 2!)
            -- • MAS: Video123 postou há 2 dias, Video456 há 3 dias, ... (TODOS < 7 dias)
            -- • V3 tenta agendar: ❌ Todos bloqueados por cooldown
            -- • RESULTADO: Projeto travado sem novos posts
            --
            -- SOLUÇÃO: Contar APENAS vídeos que NÃO postaram nos últimos 7 dias
            -- SYNC: Mesma lógica de cooldown da V3 (linha 229-234 de agendar_postagens_diarias)
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
                    OR can_comment_on_channel(c.channel_id, p.id) = TRUE
                )
                -- COOLDOWN 7 dias (sync com V3!)
                AND NOT EXISTS (
                    SELECT 1 FROM "Settings messages posts" s
                    WHERE s."Videos" = cp.video_id
                    AND s.status = 'posted'
                    AND s.postado > NOW() - INTERVAL '7 days'
                )
            ) as videos_sem_cooldown_7dias,

            -- ══════════════════════════════════════════════════════════
            -- MÉTRICA 6: Canais SEM cooldown de 24h (SYNC COM V3!)
            -- ══════════════════════════════════════════════════════════
            -- POR QUE VALIDAR COOLDOWN DE CANAIS?
            -- • V3 tem filtro: canal NÃO pode ter post nas últimas 24h
            -- • Problema: Pode ter 3 canais únicos, mas TODOS em cooldown!
            -- • Impacto: V3 tenta agendar mas FALHA (cooldown bloqueia)
            --
            -- EXEMPLO PROBLEMA:
            -- • 3 canais únicos disponíveis (passa métrica 3!)
            -- • MAS: CanalA postou há 5h, CanalB há 10h, CanalC há 15h (TODOS < 24h)
            -- • V3 tenta agendar: ❌ Todos bloqueados por cooldown
            -- • RESULTADO: Projeto travado sem novos posts
            --
            -- SOLUÇÃO: Contar APENAS canais que NÃO postaram nas últimas 24h
            -- SYNC: Mesma lógica de cooldown da V3 (linha 211-218 de agendar_postagens_diarias)
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
                    OR can_comment_on_channel(c.channel_id, p.id) = TRUE
                )
                -- COOLDOWN 24h (sync com V3!)
                AND NOT EXISTS (
                    SELECT 1 FROM "Settings messages posts" s2
                    JOIN "Videos" v2 ON s2."Videos" = v2.id
                    WHERE s2."Projeto" = p.id
                    AND v2.channel_id_yotube = v.channel_id_yotube
                    AND s2.status = 'posted'
                    AND s2.postado > NOW() - INTERVAL '24 hours'
                )
            ) as canais_sem_cooldown_24h,

            -- ══════════════════════════════════════════════════════════
            -- MÉTRICA 7: Postagem_dia (validação de buffer)
            -- ══════════════════════════════════════════════════════════
            (
                SELECT COALESCE(NULLIF(p."Postagem_dia", ''), '3')::integer
            ) as postagem_dia,

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
        RAISE NOTICE '   • Vídeos SEM cooldown 7d: %', projeto_record.videos_sem_cooldown_7dias;
        RAISE NOTICE '   • Canais SEM cooldown 24h: %', projeto_record.canais_sem_cooldown_24h;
        RAISE NOTICE '   • Diversidade 7 dias: % vídeos diferentes', projeto_record.videos_diferentes_7dias;
        RAISE NOTICE '   • Postagem_dia: % posts/dia', projeto_record.postagem_dia;
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
        -- OBJETIVO: Garantir que projeto SEMPRE tenha conteúdo DIVERSO disponível
        -- ESTRATÉGIA: Múltiplos critérios em cascata (se falhar 1, já reseta)
        -- AÇÃO: Resetar status = 0 força pipeline a buscar mais vídeos/comentários
        -- ══════════════════════════════════════════════════════════════

        -- ══════════════════════════════════════════════════════════════
        -- CRITÉRIO 1: Menos de 3 mensagens disponíveis (ORIGINAL)
        -- ══════════════════════════════════════════════════════════════
        -- POR QUE 3 MENSAGENS?
        -- • Buffer mínimo de agendamento precisa de pelo menos 2-3 posts
        -- • Se < 3 mensagens, buffer não consegue manter cobertura
        -- • Pode ficar sem posts agendados em breve
        --
        -- AÇÃO: Resetar para status 0 = pipeline vai buscar mais vídeos
        -- IMPACTO: Garante que SEMPRE tem conteúdo disponível para agendar
        -- ══════════════════════════════════════════════════════════════
        IF projeto_record.mensagens_disponiveis < 3 THEN
            UPDATE "Projeto"
            SET status = '0'
            WHERE id = projeto_record.id;

            RAISE NOTICE '   ✅ RESETADO (status = 0): < 3 mensagens disponíveis';
            total_atualizado := total_atualizado + 1;
            CONTINUE;
        END IF;

        -- ══════════════════════════════════════════════════════════════
        -- CRITÉRIO 2: Menos de 3 VÍDEOS DIFERENTES disponíveis (NOVO!)
        -- ══════════════════════════════════════════════════════════════
        -- POR QUE 3 VÍDEOS ÚNICOS?
        -- • Pode ter 10 mensagens disponíveis, mas TODAS do mesmo vídeo
        -- • Agendamento ficaria super repetitivo (mesmo vídeo múltiplas vezes)
        -- • Buffer de 2-3 posts precisa de pelo menos 3 vídeos diferentes
        --
        -- EXEMPLO PROBLEMA:
        -- • 10 mensagens disponíveis (passa critério 1!)
        -- • MAS: Todas do Video123 (só 1 vídeo único)
        -- • AGENDAMENTO: Post1=Video123, Post2=Video123, Post3=Video123 (REPETITIVO!)
        --
        -- AÇÃO: Resetar = pipeline vai buscar MAIS vídeos (diversidade)
        -- IMPACTO: Garante que buffer tem variedade de vídeos, não concentração
        -- ══════════════════════════════════════════════════════════════
        IF projeto_record.videos_unicos_disponiveis < 3 THEN
            UPDATE "Projeto"
            SET status = '0'
            WHERE id = projeto_record.id;

            RAISE NOTICE '   ✅ RESETADO (status = 0): < 3 vídeos únicos (falta diversidade)';
            total_atualizado := total_atualizado + 1;
            total_sem_diversidade := total_sem_diversidade + 1;
            CONTINUE;
        END IF;

        -- ══════════════════════════════════════════════════════════════
        -- CRITÉRIO 3: Menos de 2 CANAIS DIFERENTES disponíveis (NOVO!)
        -- ══════════════════════════════════════════════════════════════
        -- POR QUE 2 CANAIS ÚNICOS?
        -- • Pode ter 5 vídeos únicos, mas TODOS do mesmo canal
        -- • Parece que estamos "atacando" um canal específico (suspeito!)
        -- • Precisa diversificar entre VÁRIOS canais, não concentrar em 1
        --
        -- EXEMPLO PROBLEMA:
        -- • 5 vídeos únicos (passa critério 2!)
        -- • MAS: Video1, Video2, Video3, Video4, Video5 TODOS do CanalA
        -- • AGENDAMENTO: Múltiplos posts no CanalA = parece spam/ataque
        --
        -- AÇÃO: Resetar = pipeline vai buscar vídeos de OUTROS canais
        -- IMPACTO: Distribui posts entre vários canais, mais orgânico
        --
        -- NOTA: Threshold baixo (2) porque é difícil ter muitos canais com leads
        --       qualificados. 2 canais já é melhor que 1 canal só.
        -- ══════════════════════════════════════════════════════════════
        IF projeto_record.canais_unicos_disponiveis < 2 THEN
            UPDATE "Projeto"
            SET status = '0'
            WHERE id = projeto_record.id;

            RAISE NOTICE '   ✅ RESETADO (status = 0): < 2 canais únicos (falta diversidade)';
            total_atualizado := total_atualizado + 1;
            total_sem_diversidade := total_sem_diversidade + 1;
            CONTINUE;
        END IF;

        -- ══════════════════════════════════════════════════════════════
        -- CRITÉRIO 4: Posts recentes muito repetitivos (NOVO!)
        -- ══════════════════════════════════════════════════════════════
        -- POR QUE ANALISAR HISTÓRICO?
        -- • Buffer atual pode estar OK, mas HISTÓRICO pode mostrar problema
        -- • Se últimos 7 dias foram repetitivos = padrão não saudável
        -- • Precisamos DETECTAR repetição e corrigir ANTES que vire padrão
        --
        -- EXEMPLO PROBLEMA:
        -- • Últimos 7 dias: 10 posts realizados
        -- • MAS: Apenas Video123 e Video456 (só 2 vídeos diferentes!)
        -- • PADRÃO: 5x Video123, 5x Video456 (muito repetitivo!)
        -- • PERCEPÇÃO: Parece spam/bot (não é natural)
        --
        -- EXEMPLO BOM:
        -- • Últimos 7 dias: 10 posts realizados
        -- • DE: Video123, Video456, Video789, Video101, Video202, Video303, ... (8 vídeos!)
        -- • PADRÃO: Diverso, orgânico, natural
        --
        -- AÇÃO: Se < 3 vídeos em 7 dias = resetar (pedir mais conteúdo)
        -- IMPACTO: Corrige padrão repetitivo ANTES que YouTube detecte
        --
        -- NOTA: Condição "AND > 0" porque se 0 = projeto novo, sem histórico ainda
        -- ══════════════════════════════════════════════════════════════
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

        -- ══════════════════════════════════════════════════════════════
        -- CRITÉRIO 5: Vídeos sem cooldown < Postagem_dia (SYNC V3!)
        -- ══════════════════════════════════════════════════════════════
        -- POR QUE VALIDAR CONTRA POSTAGEM_DIA?
        -- • Se Postagem_dia = 5 posts/dia
        -- • Mas só tem 2 vídeos sem cooldown disponíveis
        -- • V3 vai esgotar conteúdo em horas (max 1 pending por vídeo)
        -- • Não vai conseguir agendar 5 posts/dia com só 2 vídeos
        --
        -- EXEMPLO PROBLEMA:
        -- • Postagem_dia = 10 posts/dia (usuário quer volume alto!)
        -- • Mas: videos_sem_cooldown_7dias = 3 vídeos
        -- • V3 limita: 1 pending por vídeo = max 3 posts agendados
        -- • RESULTADO: Não consegue agendar 10 posts/dia, só 3!
        --
        -- AÇÃO: Se videos_sem_cooldown < postagem_dia = resetar
        -- IMPACTO: Garante que SEMPRE tem vídeos suficientes para quota diária
        --
        -- NOTA: Usa postagem_dia como threshold dinâmico (não fixo)
        -- ══════════════════════════════════════════════════════════════
        IF projeto_record.videos_sem_cooldown_7dias < projeto_record.postagem_dia THEN
            UPDATE "Projeto"
            SET status = '0'
            WHERE id = projeto_record.id;

            RAISE NOTICE '   ✅ RESETADO (status = 0): Vídeos sem cooldown (%) < Postagem_dia (%)',
                projeto_record.videos_sem_cooldown_7dias, projeto_record.postagem_dia;
            total_atualizado := total_atualizado + 1;
            total_sem_diversidade := total_sem_diversidade + 1;
            CONTINUE;
        END IF;

        -- ══════════════════════════════════════════════════════════════
        -- CRITÉRIO 6: Canais sem cooldown < 2 (SYNC V3!)
        -- ══════════════════════════════════════════════════════════════
        -- POR QUE VALIDAR COOLDOWN DE CANAIS?
        -- • V3 evita repetir canal consecutivamente (diversidade)
        -- • Se só 1 canal sem cooldown = vai ficar travado
        -- • Precisa pelo menos 2 canais para alternar
        --
        -- EXEMPLO PROBLEMA:
        -- • canais_sem_cooldown_24h = 1 (só CanalA livre)
        -- • V3 agenda: Post1 = CanalA (OK)
        -- • V3 tenta Post2: ❌ CanalA foi o último (filtro bloqueia)
        -- • RESULTADO: Não consegue agendar Post2, travado!
        --
        -- SOLUÇÃO: Mínimo 2 canais sem cooldown para alternar
        -- IMPACTO: Garante que V3 sempre pode escolher canal diferente
        -- ══════════════════════════════════════════════════════════════
        IF projeto_record.canais_sem_cooldown_24h < 2 THEN
            UPDATE "Projeto"
            SET status = '0'
            WHERE id = projeto_record.id;

            RAISE NOTICE '   ✅ RESETADO (status = 0): Canais sem cooldown (%) < 2',
                projeto_record.canais_sem_cooldown_24h;
            total_atualizado := total_atualizado + 1;
            total_sem_diversidade := total_sem_diversidade + 1;
            CONTINUE;
        END IF;

        -- ══════════════════════════════════════════════════════════════
        -- PROJETO APROVADO - NÃO PRECISA RESETAR
        -- ══════════════════════════════════════════════════════════════
        -- Se chegou aqui = passou em TODOS os 6 critérios:
        -- ✅ Tem >= 3 mensagens disponíveis
        -- ✅ Tem >= 3 vídeos únicos disponíveis
        -- ✅ Tem >= 2 canais únicos disponíveis
        -- ✅ Tem >= Postagem_dia vídeos sem cooldown 7 dias
        -- ✅ Tem >= 2 canais sem cooldown 24h
        -- ✅ Histórico tem >= 3 vídeos diferentes (ou é projeto novo)
        --
        -- RESULTADO: Projeto está saudável, conteúdo diverso E sem cooldowns, pode continuar!
        -- ══════════════════════════════════════════════════════════════
        RAISE NOTICE '   ✓ OK - Conteúdo suficiente, diverso e sem cooldowns!';

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

-- ═════════════════════════════════════════════════════════════════════════════
-- 📊 ANÁLISE DE FREQUÊNCIA DO CRON (ULTRATHINK)
-- ═════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 🧮 CÁLCULO DA FREQUÊNCIA IDEAL
-- ═══════════════════════════════════════════════════════════════

-- VARIÁVEIS DO SISTEMA:
-- • Pipeline completo (STATUS 0→6): ~20-40min para 30-50 vídeos
-- • Postagem_dia médio: 3-10 posts/dia (configurável por projeto)
-- • Buffer mínimo: 3 vídeos únicos sem cooldown
-- • Cooldown vídeo: 7 dias
-- • Cooldown canal: 24h

-- CENÁRIO 1: Projeto com Postagem_dia = 5 posts/dia
-- ───────────────────────────────────────────────────────────────
-- • Threshold: videos_sem_cooldown_7dias < 5
-- • Com 5 vídeos sem cooldown = 5 posts agendados (max 1 pending/vídeo)
-- • Consumo: 5 posts/dia
-- • Duração do buffer: 5 vídeos / 5 posts/dia = 1 dia
-- • CONCLUSÃO: Precisa checar a cada ~12-24h (meio dia de antecedência)

-- CENÁRIO 2: Projeto com Postagem_dia = 10 posts/dia (volume alto)
-- ───────────────────────────────────────────────────────────────
-- • Threshold: videos_sem_cooldown_7dias < 10
-- • Com 10 vídeos sem cooldown = 10 posts agendados
-- • Consumo: 10 posts/dia
-- • Duração do buffer: 10 vídeos / 10 posts/dia = 1 dia
-- • CONCLUSÃO: Precisa checar a cada ~6-12h (urgência maior)

-- CENÁRIO 3: Projeto com Postagem_dia = 3 posts/dia (volume baixo)
-- ───────────────────────────────────────────────────────────────
-- • Threshold: videos_sem_cooldown_7dias < 3
-- • Com 3 vídeos sem cooldown = 3 posts agendados
-- • Consumo: 3 posts/dia
-- • Duração do buffer: 3 vídeos / 3 posts/dia = 1 dia
-- • CONCLUSÃO: Precisa checar a cada ~12-24h (menos urgente)

-- TEMPO DO PIPELINE:
-- ───────────────────────────────────────────────────────────────
-- STATUS 0→6 leva ~20-40min dependendo do volume
-- Se detectar problema às 10:00:
-- • Reseta para status=0
-- • Pipeline roda: 10:00 → 10:40 (40min)
-- • Novo conteúdo disponível: 10:40
-- • Agendamento V3 pode usar: 10:45+

-- MARGEM DE SEGURANÇA:
-- ───────────────────────────────────────────────────────────────
-- • Pipeline: 40min para processar
-- • Buffer mínimo: 1 dia de posts
-- • Detecção: Precisa ser ANTES do buffer acabar
-- • Ideal: Detectar com 0.5-1 dia de antecedência
-- • Frequência: 12-24h (meio dia a um dia)

-- ═══════════════════════════════════════════════════════════════
-- 🎯 RECOMENDAÇÃO FINAL
-- ═══════════════════════════════════════════════════════════════

-- **FREQUÊNCIA IDEAL: A CADA 1-2 HORAS**
--
-- JUSTIFICATIVA:
-- 1. ✅ Detecta problemas COM ANTECEDÊNCIA (0.5-1 dia antes de esgotar)
-- 2. ✅ Tempo suficiente para pipeline processar (40min)
-- 3. ✅ Não sobrecarrega banco (apenas SELECT, UPDATE leve)
-- 4. ✅ Responsivo o suficiente para projetos de alto volume
-- 5. ✅ Não desperdiça recursos (rodar a cada 5min é excessivo)
--
-- OPÇÕES DE CRON:
-- • 0 */1 * * *   → A cada 1 hora (RECOMENDADO para volume alto)
-- • 0 */2 * * *   → A cada 2 horas (RECOMENDADO para volume médio/baixo)
-- • */5 * * * *   → A cada 5 minutos (ATUAL - EXCESSIVO!)
--
-- POR QUE 1-2 HORAS É MELHOR QUE 5 MINUTOS?
-- ───────────────────────────────────────────────────────────────
-- • Pipeline leva 40min → rodar a cada 5min é INÚTIL durante processamento
-- • Buffer dura 1 dia → rodar 288x/dia (5min) é DESPERDÍCIO
-- • Detecção com 1h de antecedência = 23h de buffer restante (OK!)
-- • Reduz carga no banco (de 288 runs/dia para 24 runs/dia = 92% menos)
--
-- POR QUE NÃO MAIS DE 2 HORAS?
-- ───────────────────────────────────────────────────────────────
-- • Projeto volume alto (Postagem_dia=10) esgota buffer em 1 dia
-- • Se rodar a cada 6h = detecta com apenas 18h de antecedência
-- • Se acontecer problema durante a noite = buffer pode esgotar
-- • 1-2h = detecta rápido o suficiente, mesmo para volume alto
--
-- CASOS EXTREMOS:
-- ───────────────────────────────────────────────────────────────
-- • Projeto com Postagem_dia = 20+ (extremo): Considerar 30min-1h
-- • Projeto com Postagem_dia = 1-2 (muito baixo): Pode ser 3-6h
-- • Para maioria dos projetos (Postagem_dia 3-10): 1-2h é perfeito
--
-- ═══════════════════════════════════════════════════════════════
-- 📝 COMO MUDAR A FREQUÊNCIA DO CRON
-- ═══════════════════════════════════════════════════════════════
--
-- 1. Identificar o job atual:
--    SELECT jobid, jobname, schedule
--    FROM cron.job
--    WHERE jobname LIKE '%status%';
--
-- 2. Deletar job antigo:
--    SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'nome_do_job';
--
-- 3. Criar job novo com frequência ideal:
--    SELECT cron.schedule(
--        'check_projects_status_hourly',  -- Nome do job
--        '0 */1 * * *',  -- A cada 1 hora
--        'SELECT check_and_update_projects_status();'
--    );
--
-- NOTA: Após mudar frequência, monitorar por 24-48h para validar que
--       não há projetos ficando sem conteúdo.
-- ═══════════════════════════════════════════════════════════════

-- Última atualização: 2025-10-28
-- Versão: V3 SYNC FINAL
