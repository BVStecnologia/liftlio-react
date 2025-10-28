-- =============================================
-- Função: agendar_postagens_diarias (V3 HYBRID - MELHOR DE TUDO)
-- Descrição: Sistema inteligente combinando original + V2 + proporção dinâmica
-- Criado: 2025-01-23
-- Atualizado: 2025-10-28 - V3 HYBRID COMPLETA
-- Atualizado: 2025-10-28 - FIX: Agendar para AMANHÃ se já passou das 22h (evita posts no passado)
--
-- ═══════════════════════════════════════════════════════════════
-- 🎯 O QUE TEM DE MELHOR DA ORIGINAL:
-- ═══════════════════════════════════════════════════════════════
-- ✅ Verificação de Mentions (billing/créditos) - CRITICAL!
-- ✅ Sistema produto/engajamento com proporção DINÂMICA (não 50/50 fixo)
-- ✅ Seleção inteligente em 4 níveis com fallbacks
-- ✅ Tracking de videos_usados_hoje (array)
-- ✅ Tracking de horas_usadas (últimos 7 dias)
-- ✅ Decremento automático de Mentions após criar post
--
-- ═══════════════════════════════════════════════════════════════
-- 🎯 O QUE TEM DE MELHOR DA V2:
-- ═══════════════════════════════════════════════════════════════
-- ✅ Cooldown 24h por canal (anti-spam agressivo)
-- ✅ Cooldown 7 dias por vídeo (anti-spam agressivo)
-- ✅ Diversidade forçada: canal ≠ último, vídeo ≠ últimos 2
-- ✅ Max 1 pending por vídeo (buffer diverso)
-- ✅ Horários humanizados com minutos randomizados
-- ✅ Evita minutos exatos (:00, :15, :30, :45)
-- ✅ Buffer inteligente: mantém sempre 2 pending (ignora Postagem_dia)
--
-- ═══════════════════════════════════════════════════════════════
-- 🎯 NOVA FEATURE V3:
-- ═══════════════════════════════════════════════════════════════
-- ✅ PROPORÇÃO DINÂMICA produto/engajamento baseada em DISPONIBILIDADE
--    • Se tem 80 produto + 20 engajamento → distribui 80/20
--    • Se tem 30 produto + 70 engajamento → distribui 30/70
--    • Se tem 10 produto + 0 engajamento → todos produto
--    • Se tem 0 produto + 10 engajamento → todos engajamento
--    • Respeita a REALIDADE do conteúdo disponível
--    • Não força 50/50 artificial quando não há equilíbrio
-- =============================================

DROP FUNCTION IF EXISTS public.agendar_postagens_diarias(bigint);

CREATE OR REPLACE FUNCTION public.agendar_postagens_diarias(projeto_id_param bigint)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    -- Configurações do projeto
    projeto_ativo boolean;
    tipo_postagem varchar;
    fuso_horario_projeto text;
    posts_por_dia integer;

    -- ═══════════════════════════════════════════════════════════════
    -- BILLING/CRÉDITOS (Original)
    -- ═══════════════════════════════════════════════════════════════
    v_user_id text;
    v_mentions_disponiveis integer;

    -- ═══════════════════════════════════════════════════════════════
    -- SISTEMA PRODUTO/ENGAJAMENTO DINÂMICO (Original + V3 NEW)
    -- ═══════════════════════════════════════════════════════════════
    v_produto_disponivel integer;
    v_engajamento_disponivel integer;
    v_total_disponivel integer;
    v_proporcao_produto float;
    v_produtos_por_dia integer;
    v_engajamentos_por_dia integer;
    v_produtos_criados integer := 0;
    v_engajamentos_criados integer := 0;
    tipo_desejado text;  -- 'produto' ou 'engajamento'

    -- Controle de agendamentos
    posts_agendados_hoje integer;
    posts_faltantes integer;
    posts_criados integer := 0;

    -- Seleção de mensagem
    mensagem_selecionada bigint;
    video_selecionado bigint;
    canal_selecionado text;
    comentario_selecionado bigint;

    -- ═══════════════════════════════════════════════════════════════
    -- TRACKING INTELIGENTE (Original)
    -- ═══════════════════════════════════════════════════════════════
    videos_usados_hoje bigint[];  -- Array de vídeos já usados HOJE
    horas_usadas integer[];  -- Array de horas usadas (últimos 7 dias)

    -- Cálculo de horário (V2)
    data_local date;
    data_alvo date;  -- Data para agendar (hoje ou amanhã, depende da hora)
    hora_base integer;
    minuto_base integer;
    proxima_postagem timestamp with time zone;
    minuto_calculado integer;

    -- Anti-spam tracking (V2)
    ultimo_canal_postado text;
    ultimo_video_postado bigint;
    penultimo_video_postado bigint;

    -- Controle de níveis de seleção (Original)
    nivel_atual integer;
    mensagem_encontrada boolean;

BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '🎯 V3 HYBRID - SISTEMA INTELIGENTE COMPLETO';
    RAISE NOTICE '📊 Projeto: %', projeto_id_param;
    RAISE NOTICE '════════════════════════════════════════════════════════════';

    -- ═══════════════════════════════════════════════════════════════
    -- PASSO 1: VERIFICAR CONFIGURAÇÕES + MENTIONS (Original + V2)
    -- ═══════════════════════════════════════════════════════════════
    SELECT
        p."Youtube Active",
        COALESCE(NULLIF(p."Postagem_dia", ''), '3')::integer,
        p.tipo_de_postagem,
        COALESCE(p.fuso_horario, 'America/Chicago'),
        p."User id"
    INTO projeto_ativo, posts_por_dia, tipo_postagem, fuso_horario_projeto, v_user_id
    FROM "Projeto" p
    WHERE p.id = projeto_id_param;

    IF NOT projeto_ativo THEN
        RAISE NOTICE '⚠️ Projeto inativo';
        RETURN 0;
    END IF;

    RAISE NOTICE '📝 Postagem_dia: % posts/dia', posts_por_dia;

    -- ═══════════════════════════════════════════════════════════════
    -- PASSO 2: VERIFICAR MENTIONS (Original - CRITICAL!)
    -- ═══════════════════════════════════════════════════════════════
    SELECT COALESCE(c."Mentions", 0)
    INTO v_mentions_disponiveis
    FROM customers c
    WHERE c.user_id = v_user_id;

    IF v_mentions_disponiveis <= 0 THEN
        RAISE NOTICE '❌ SEM CRÉDITOS! Mentions disponíveis: %', v_mentions_disponiveis;
        RETURN 0;
    END IF;

    RAISE NOTICE '💰 Mentions disponíveis: %', v_mentions_disponiveis;

    -- ═══════════════════════════════════════════════════════════════
    -- PASSO 3: VERIFICAR BUFFER DE PENDING (V3 - MANTÉM 2 SEMPRE)
    -- ═══════════════════════════════════════════════════════════════
    data_local := (CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE fuso_horario_projeto)::date;

    -- Determinar data alvo: se passou das 22h, agenda para AMANHÃ
    IF EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'UTC' AT TIME ZONE fuso_horario_projeto)) >= 22 THEN
        data_alvo := data_local + INTERVAL '1 day';
        RAISE NOTICE '⏰ Hora >= 22h, data alvo: AMANHÃ (%)', data_alvo;
    ELSE
        data_alvo := data_local;
        RAISE NOTICE '⏰ Hora < 22h, data alvo: HOJE (%)', data_alvo;
    END IF;

    -- Conta TOTAL de pending (não apenas hoje) - MANTÉM BUFFER DE 2 POSTS
    SELECT COUNT(*)
    INTO posts_agendados_hoje
    FROM "Settings messages posts"
    WHERE "Projeto" = projeto_id_param
    AND status = 'pending';

    -- Meta fixa: sempre manter 2 pending no buffer
    posts_faltantes := 2 - posts_agendados_hoje;

    RAISE NOTICE '📊 Status: % pending no buffer, faltam % para meta de 2', posts_agendados_hoje, posts_faltantes;

    IF posts_faltantes <= 0 THEN
        RAISE NOTICE '✅ Buffer completo (2 pending mantidos)';
        RETURN 0;
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    -- PASSO 4: CALCULAR PROPORÇÃO DINÂMICA produto/engajamento (V3 NEW!)
    -- ═══════════════════════════════════════════════════════════════
    -- Esta é a GRANDE INOVAÇÃO da V3:
    -- Em vez de forçar 50/50, calculamos baseado na DISPONIBILIDADE REAL
    -- ═══════════════════════════════════════════════════════════════

    -- 4A. Contar quantas mensagens disponíveis de cada tipo
    SELECT
        COUNT(*) FILTER (WHERE m.tipo_resposta = 'produto' AND m.respondido = false),
        COUNT(*) FILTER (WHERE m.tipo_resposta = 'engajamento' AND m.respondido = false)
    INTO v_produto_disponivel, v_engajamento_disponivel
    FROM "Mensagens" m
    WHERE m.project_id = projeto_id_param;

    v_total_disponivel := v_produto_disponivel + v_engajamento_disponivel;

    RAISE NOTICE '───────────────────────────────────────────────────────';
    RAISE NOTICE '📊 CÁLCULO DE PROPORÇÃO DINÂMICA:';
    RAISE NOTICE '   • Produto disponível: %', v_produto_disponivel;
    RAISE NOTICE '   • Engajamento disponível: %', v_engajamento_disponivel;
    RAISE NOTICE '   • Total disponível: %', v_total_disponivel;

    IF v_total_disponivel = 0 THEN
        RAISE NOTICE '❌ Sem mensagens disponíveis';
        RETURN 0;
    END IF;

    -- 4B. Calcular proporção baseada em disponibilidade (V3 MAGIC!)
    v_proporcao_produto := v_produto_disponivel::float / v_total_disponivel::float;

    -- Calcular quantos posts de cada tipo para hoje
    v_produtos_por_dia := CEIL(posts_faltantes * v_proporcao_produto);

    -- Clampar aos limites reais
    v_produtos_por_dia := LEAST(v_produtos_por_dia, v_produto_disponivel);
    v_produtos_por_dia := LEAST(v_produtos_por_dia, posts_faltantes);

    -- Engajamento pega o restante
    v_engajamentos_por_dia := posts_faltantes - v_produtos_por_dia;

    -- Validar que não excede disponível
    IF v_engajamentos_por_dia > v_engajamento_disponivel THEN
        v_engajamentos_por_dia := v_engajamento_disponivel;
        v_produtos_por_dia := posts_faltantes - v_engajamentos_por_dia;
    END IF;

    RAISE NOTICE '   • Proporção produto: % %% (%/%)',
        ROUND(v_proporcao_produto * 100, 1),
        v_produto_disponivel, v_total_disponivel;
    RAISE NOTICE '   • Posts produto hoje: %', v_produtos_por_dia;
    RAISE NOTICE '   • Posts engajamento hoje: %', v_engajamentos_por_dia;
    RAISE NOTICE '───────────────────────────────────────────────────────';

    -- ═══════════════════════════════════════════════════════════════
    -- PASSO 5: OBTER TRACKING ANTI-SPAM (V2)
    -- ═══════════════════════════════════════════════════════════════
    SELECT
        v.channel_id_yotube,
        s."Videos"
    INTO
        ultimo_canal_postado,
        ultimo_video_postado
    FROM "Settings messages posts" s
    JOIN "Videos" v ON s."Videos" = v.id
    WHERE s."Projeto" = projeto_id_param
    ORDER BY s.proxima_postagem DESC
    LIMIT 1;

    SELECT "Videos"
    INTO penultimo_video_postado
    FROM "Settings messages posts"
    WHERE "Projeto" = projeto_id_param
    ORDER BY proxima_postagem DESC
    LIMIT 1 OFFSET 1;

    RAISE NOTICE '🎬 Último canal: % | Último vídeo: % | Penúltimo vídeo: %',
        COALESCE(ultimo_canal_postado, 'nenhum'),
        COALESCE(ultimo_video_postado::text, 'nenhum'),
        COALESCE(penultimo_video_postado::text, 'nenhum');

    -- ═══════════════════════════════════════════════════════════════
    -- PASSO 6: OBTER TRACKING INTELIGENTE (Original)
    -- ═══════════════════════════════════════════════════════════════

    -- 6A. Array de vídeos já usados na DATA ALVO (hoje ou amanhã)
    SELECT ARRAY_AGG(DISTINCT s."Videos")
    INTO videos_usados_hoje
    FROM "Settings messages posts" s
    WHERE s."Projeto" = projeto_id_param
    AND DATE(s.proxima_postagem AT TIME ZONE 'UTC' AT TIME ZONE fuso_horario_projeto) = data_alvo;

    IF videos_usados_hoje IS NULL THEN
        videos_usados_hoje := ARRAY[]::bigint[];
    END IF;

    RAISE NOTICE '📹 Vídeos já agendados para %: % vídeos', data_alvo, COALESCE(array_length(videos_usados_hoje, 1), 0);

    -- 6B. Array de horas usadas (últimos 7 dias)
    SELECT ARRAY_AGG(DISTINCT EXTRACT(HOUR FROM s.proxima_postagem)::integer)
    INTO horas_usadas
    FROM "Settings messages posts" s
    WHERE s."Projeto" = projeto_id_param
    AND (s.proxima_postagem > NOW() - INTERVAL '7 days'
         OR s.postado > NOW() - INTERVAL '7 days');

    IF horas_usadas IS NULL THEN
        horas_usadas := ARRAY[]::integer[];
    END IF;

    RAISE NOTICE '⏰ Horas usadas (7d): % horas distintas', COALESCE(array_length(horas_usadas, 1), 0);

    -- ═══════════════════════════════════════════════════════════════
    -- LOOP PRINCIPAL: CRIAR POSTS COM PROPORÇÃO DINÂMICA
    -- ═══════════════════════════════════════════════════════════════
    FOR i IN 1..posts_faltantes LOOP

        RAISE NOTICE '────────────────────────────────────────────────────';
        RAISE NOTICE '🔄 Post %/% | Produto %/% | Engajamento %/%',
            i, posts_faltantes,
            v_produtos_criados, v_produtos_por_dia,
            v_engajamentos_criados, v_engajamentos_por_dia;

        -- ═══════════════════════════════════════════════════════════════
        -- 6A. DECIDIR TIPO DESEJADO (Original com proporção V3)
        -- ═══════════════════════════════════════════════════════════════
        IF v_produtos_criados < v_produtos_por_dia THEN
            tipo_desejado := 'produto';
            RAISE NOTICE '🎯 Tentando tipo: PRODUTO';
        ELSIF v_engajamentos_criados < v_engajamentos_por_dia THEN
            tipo_desejado := 'engajamento';
            RAISE NOTICE '🎯 Tentando tipo: ENGAJAMENTO';
        ELSE
            -- Já completou ambas as quotas, parar
            RAISE NOTICE '✅ Quotas completas (produto: %, engajamento: %)',
                v_produtos_criados, v_engajamentos_criados;
            EXIT;
        END IF;

        -- ═══════════════════════════════════════════════════════════════
        -- 6B. SELEÇÃO INTELIGENTE EM 4 NÍVEIS (Original + Filtros V2)
        -- ═══════════════════════════════════════════════════════════════
        mensagem_encontrada := false;

        -- NÍVEL 1: Tipo desejado + Vídeo diferente + Lead=true
        -- (Máxima qualidade: tipo certo, diversidade, lead qualificado)
        RAISE NOTICE '   → Nível 1: Tipo % + Vídeo diferente + Lead=true', tipo_desejado;

        SELECT
            m.id, cp.video_id, v.channel_id_yotube, cp.id
        INTO
            mensagem_selecionada, video_selecionado, canal_selecionado, comentario_selecionado
        FROM "Mensagens" m
        JOIN "Comentarios_Principais" cp ON m."Comentario_Principais" = cp.id
        JOIN "Videos" v ON cp.video_id = v.id
        WHERE m.project_id = projeto_id_param
        AND m.respondido = false
        AND m.tipo_resposta = tipo_desejado  -- ← Tipo desejado
        AND cp.led = true  -- ← Lead qualificado
        AND cp.video_id != ALL(COALESCE(videos_usados_hoje, ARRAY[]::bigint[]))  -- ← Vídeo não usado hoje

        -- Filtros anti-spam V2
        AND NOT EXISTS (
            SELECT 1 FROM "Settings messages posts" s WHERE s."Mensagens" = m.id
        )
        AND (ultimo_canal_postado IS NULL OR v.channel_id_yotube != ultimo_canal_postado)
        AND (ultimo_video_postado IS NULL OR cp.video_id != ultimo_video_postado)
        AND (penultimo_video_postado IS NULL OR cp.video_id != penultimo_video_postado)
        AND NOT EXISTS (
            SELECT 1 FROM "Settings messages posts" s
            JOIN "Videos" v2 ON s."Videos" = v2.id
            WHERE s."Projeto" = projeto_id_param
            AND v2.channel_id_yotube = v.channel_id_yotube
            AND s.status = 'posted'
            AND s.postado > NOW() - INTERVAL '24 hours'
        )
        AND NOT EXISTS (
            SELECT 1 FROM "Settings messages posts" s
            WHERE s."Videos" = cp.video_id
            AND s.status = 'posted'
            AND s.postado > NOW() - INTERVAL '7 days'
        )
        AND (
            SELECT COUNT(*) FROM "Settings messages posts" s
            WHERE s."Videos" = cp.video_id
            AND s.status = 'pending'
        ) < 1
        ORDER BY cp.like_count DESC, random()  -- Prioriza mais likes
        LIMIT 1;

        IF mensagem_selecionada IS NOT NULL THEN
            mensagem_encontrada := true;
            RAISE NOTICE '   ✅ Encontrado no Nível 1';
        END IF;

        -- NÍVEL 2: Tipo desejado + Vídeo diferente + Qualquer lead
        IF NOT mensagem_encontrada THEN
            RAISE NOTICE '   → Nível 2: Tipo % + Vídeo diferente + Any lead', tipo_desejado;

            SELECT
                m.id, cp.video_id, v.channel_id_yotube, cp.id
            INTO
                mensagem_selecionada, video_selecionado, canal_selecionado, comentario_selecionado
            FROM "Mensagens" m
            JOIN "Comentarios_Principais" cp ON m."Comentario_Principais" = cp.id
            JOIN "Videos" v ON cp.video_id = v.id
            WHERE m.project_id = projeto_id_param
            AND m.respondido = false
            AND m.tipo_resposta = tipo_desejado
            AND cp.video_id != ALL(COALESCE(videos_usados_hoje, ARRAY[]::bigint[]))

            -- Filtros anti-spam V2 (mesmos)
            AND NOT EXISTS (SELECT 1 FROM "Settings messages posts" s WHERE s."Mensagens" = m.id)
            AND (ultimo_canal_postado IS NULL OR v.channel_id_yotube != ultimo_canal_postado)
            AND (ultimo_video_postado IS NULL OR cp.video_id != ultimo_video_postado)
            AND (penultimo_video_postado IS NULL OR cp.video_id != penultimo_video_postado)
            AND NOT EXISTS (
                SELECT 1 FROM "Settings messages posts" s
                JOIN "Videos" v2 ON s."Videos" = v2.id
                WHERE s."Projeto" = projeto_id_param
                AND v2.channel_id_yotube = v.channel_id_yotube
                AND s.status = 'posted'
                AND s.postado > NOW() - INTERVAL '24 hours'
            )
            AND NOT EXISTS (
                SELECT 1 FROM "Settings messages posts" s
                WHERE s."Videos" = cp.video_id
                AND s.status = 'posted'
                AND s.postado > NOW() - INTERVAL '7 days'
            )
            AND (SELECT COUNT(*) FROM "Settings messages posts" s WHERE s."Videos" = cp.video_id AND s.status = 'pending') < 1
            ORDER BY cp.lead_score DESC, random()
            LIMIT 1;

            IF mensagem_selecionada IS NOT NULL THEN
                mensagem_encontrada := true;
                RAISE NOTICE '   ✅ Encontrado no Nível 2';
            END IF;
        END IF;

        -- NÍVEL 3: Tipo desejado + PERMITE repetir vídeo
        IF NOT mensagem_encontrada THEN
            RAISE NOTICE '   → Nível 3: Tipo % + Permite repetir vídeo', tipo_desejado;

            SELECT
                m.id, cp.video_id, v.channel_id_yotube, cp.id
            INTO
                mensagem_selecionada, video_selecionado, canal_selecionado, comentario_selecionado
            FROM "Mensagens" m
            JOIN "Comentarios_Principais" cp ON m."Comentario_Principais" = cp.id
            JOIN "Videos" v ON cp.video_id = v.id
            WHERE m.project_id = projeto_id_param
            AND m.respondido = false
            AND m.tipo_resposta = tipo_desejado
            -- Remove restrição de video_id != videos_usados_hoje

            -- Filtros anti-spam V2 básicos
            AND NOT EXISTS (SELECT 1 FROM "Settings messages posts" s WHERE s."Mensagens" = m.id)
            AND (ultimo_canal_postado IS NULL OR v.channel_id_yotube != ultimo_canal_postado)
            AND (ultimo_video_postado IS NULL OR cp.video_id != ultimo_video_postado)
            AND (penultimo_video_postado IS NULL OR cp.video_id != penultimo_video_postado)
            AND NOT EXISTS (
                SELECT 1 FROM "Settings messages posts" s
                JOIN "Videos" v2 ON s."Videos" = v2.id
                WHERE s."Projeto" = projeto_id_param
                AND v2.channel_id_yotube = v.channel_id_yotube
                AND s.status = 'posted'
                AND s.postado > NOW() - INTERVAL '24 hours'
            )
            AND (SELECT COUNT(*) FROM "Settings messages posts" s WHERE s."Videos" = cp.video_id AND s.status = 'pending') < 1
            ORDER BY cp.lead_score DESC, random()
            LIMIT 1;

            IF mensagem_selecionada IS NOT NULL THEN
                mensagem_encontrada := true;
                RAISE NOTICE '   ✅ Encontrado no Nível 3';
            END IF;
        END IF;

        -- NÍVEL 4: EMERGÊNCIA - Qualquer mensagem disponível
        IF NOT mensagem_encontrada THEN
            RAISE NOTICE '   → Nível 4: EMERGÊNCIA - Qualquer tipo disponível';

            SELECT
                m.id, cp.video_id, v.channel_id_yotube, cp.id
            INTO
                mensagem_selecionada, video_selecionado, canal_selecionado, comentario_selecionado
            FROM "Mensagens" m
            JOIN "Comentarios_Principais" cp ON m."Comentario_Principais" = cp.id
            JOIN "Videos" v ON cp.video_id = v.id
            WHERE m.project_id = projeto_id_param
            AND m.respondido = false
            -- Remove restrição de tipo_resposta

            -- Apenas filtros essenciais
            AND NOT EXISTS (SELECT 1 FROM "Settings messages posts" s WHERE s."Mensagens" = m.id)
            AND (ultimo_canal_postado IS NULL OR v.channel_id_yotube != ultimo_canal_postado)
            AND (SELECT COUNT(*) FROM "Settings messages posts" s WHERE s."Videos" = cp.video_id AND s.status = 'pending') < 1
            ORDER BY cp.lead_score DESC, random()
            LIMIT 1;

            IF mensagem_selecionada IS NOT NULL THEN
                mensagem_encontrada := true;
                RAISE NOTICE '   ⚠️ Encontrado no Nível 4 (emergência)';
            END IF;
        END IF;

        -- Se não encontrou mensagem em nenhum nível, parar
        IF NOT mensagem_encontrada THEN
            RAISE NOTICE '❌ Nenhuma mensagem válida (testou 4 níveis)';
            EXIT;
        END IF;

        RAISE NOTICE '✅ Mensagem: % | Vídeo: % | Canal: %',
            mensagem_selecionada, video_selecionado, canal_selecionado;

        -- ═══════════════════════════════════════════════════════════════
        -- PASSO 7: CALCULAR HORÁRIO HUMANIZADO (V2)
        -- ═══════════════════════════════════════════════════════════════
        hora_base := 9 + ((i + COALESCE(mensagem_selecionada, 1)) % 14);
        minuto_base := (COALESCE(mensagem_selecionada, 1) % 25) +
                       floor(random() * (35 - (COALESCE(mensagem_selecionada, 1) % 10)))::integer;

        IF minuto_base >= 60 THEN
            minuto_base := minuto_base - 20;
        END IF;

        -- Usar data_alvo (já determinada no PASSO 3: hoje ou amanhã)
        proxima_postagem := data_alvo +
                           (hora_base * INTERVAL '1 hour') +
                           (minuto_base * INTERVAL '1 minute');

        -- Converter do fuso local para UTC para armazenamento
        proxima_postagem := proxima_postagem AT TIME ZONE fuso_horario_projeto AT TIME ZONE 'UTC';

        -- Evitar minutos exatos (V2)
        minuto_calculado := EXTRACT(MINUTE FROM proxima_postagem)::integer;
        IF minuto_calculado IN (0, 15, 30, 45) THEN
            proxima_postagem := proxima_postagem + ((1 + floor(random() * 14)::integer) * INTERVAL '1 minute');
        END IF;

        RAISE NOTICE '📅 Horário: %', proxima_postagem;

        -- ═══════════════════════════════════════════════════════════════
        -- PASSO 8: INSERIR AGENDAMENTO + DECREMENTAR MENTIONS (Original)
        -- ═══════════════════════════════════════════════════════════════
        BEGIN
            INSERT INTO "Settings messages posts" (
                "Projeto",
                "Mensagens",
                "Videos",
                "Comentarios_Principal",
                proxima_postagem,
                tipo_msg,
                status,
                semana
            ) VALUES (
                projeto_id_param,
                mensagem_selecionada,
                video_selecionado,
                comentario_selecionado,
                proxima_postagem,
                tipo_postagem::integer,
                'pending',
                EXTRACT(WEEK FROM proxima_postagem)::integer
            );

            -- Decrementar Mentions (Original - CRITICAL!)
            UPDATE customers
            SET "Mentions" = "Mentions" - 1
            WHERE user_id = v_user_id
            AND "Mentions" > 0;

            posts_criados := posts_criados + 1;

            -- Atualizar contadores por tipo
            IF tipo_desejado = 'produto' THEN
                v_produtos_criados := v_produtos_criados + 1;
            ELSIF tipo_desejado = 'engajamento' THEN
                v_engajamentos_criados := v_engajamentos_criados + 1;
            END IF;

            -- Atualizar tracking (Original + V2)
            videos_usados_hoje := array_append(videos_usados_hoje, video_selecionado);
            horas_usadas := array_append(horas_usadas, EXTRACT(HOUR FROM proxima_postagem)::integer);
            penultimo_video_postado := ultimo_video_postado;
            ultimo_video_postado := video_selecionado;
            ultimo_canal_postado := canal_selecionado;

            RAISE NOTICE '✅ Post agendado (total: %/%)', posts_criados, posts_faltantes;

        EXCEPTION
            WHEN unique_violation THEN
                RAISE NOTICE '⚠️ Mensagem % já agendada', mensagem_selecionada;
            WHEN OTHERS THEN
                RAISE NOTICE '❌ Erro: %', SQLERRM;
                EXIT;
        END;

    END LOOP;

    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '🎉 AGENDAMENTO V3 CONCLUÍDO';
    RAISE NOTICE '📊 Posts criados: % (produto: %, engajamento: %)',
        posts_criados, v_produtos_criados, v_engajamentos_criados;
    RAISE NOTICE '📊 Buffer atual: % pending (meta: 2)', posts_agendados_hoje + posts_criados;
    RAISE NOTICE '💰 Mentions restantes: %', v_mentions_disponiveis - posts_criados;
    RAISE NOTICE '════════════════════════════════════════════════════════════';

    RETURN posts_criados;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erro não tratado: %', SQLERRM;
        RETURN 0;
END;
$function$;
