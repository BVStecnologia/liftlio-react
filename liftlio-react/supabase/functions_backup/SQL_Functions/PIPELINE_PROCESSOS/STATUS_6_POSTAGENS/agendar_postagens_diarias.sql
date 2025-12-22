-- =============================================
-- Função: agendar_postagens_diarias (V3.1 HYBRID + ANTI-SPAM)
-- Descrição: Sistema inteligente combinando original + V2 + proporção dinâmica + ANTI-SPAM
-- Criado: 2025-01-23
-- Atualizado: 2025-10-28 - V3 HYBRID COMPLETA
-- Atualizado: 2025-10-28 - FIX: Agendar para AMANHÃ se já passou das 22h
-- Atualizado: 2025-12-21 - V3.1: Filtro ANTI-SPAM nos 4 níveis de seleção
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
--    • Respeita a REALIDADE do conteúdo disponível
--
-- ═══════════════════════════════════════════════════════════════
-- 🛡️ NOVA FEATURE V3.1 (2025-12-21): ANTI-SPAM
-- ═══════════════════════════════════════════════════════════════
-- ✅ Filtro anti-spam em TODOS os 4 níveis de seleção
-- ✅ Não agenda posts para canais:
--    • is_active = false
--    • auto_disabled_reason IS NOT NULL (blacklistado)
--    • desativado_pelo_user = true
-- ✅ Contagem de posts diários inclui TODOS os status (pending/posted/failed)
-- =============================================

DROP FUNCTION IF EXISTS public.agendar_postagens_diarias(bigint);

CREATE OR REPLACE FUNCTION public.agendar_postagens_diarias(projeto_id_param bigint)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    posts_por_dia integer;
    projeto_ativo boolean;
    tipo_postagem varchar;
    fuso_horario_projeto text;
    ja_agendado_hoje boolean;
    posts_criados integer := 0;
    mensagem_record RECORD;
    horas_usadas INTEGER[] := ARRAY[]::integer[];
    hora_base integer;
    minutos_base integer;
    proxima_data timestamp without time zone;
    mensagem_selecionada bigint;
    video_selecionado bigint;
    comentario_selecionado bigint;
    insert_id bigint;
    data_local date;
    data_alvo date;

    -- Variáveis para distribuição multi-dia
    v_data_agendamento date;
    v_dia_offset integer := 0;
    v_max_dias_tentar integer := 14;
    v_posts_nesse_dia integer;
    v_slots_disponiveis integer;
    v_posts_para_esse_dia integer;
    v_max_posts_por_dia integer;
    v_posts_a_criar integer;

    -- Variáveis para proporção dinâmica
    v_produto_disponivel integer;
    v_engajamento_disponivel integer;
    v_total_disponivel integer;
    v_proporcao_produto float;
    v_produtos_por_dia integer;
    v_produtos_agendados integer := 0;
    v_engajamentos_agendados integer := 0;
    v_tipo_desejado text;
    v_tipo_selecionado text;
    videos_usados_hoje bigint[] := ARRAY[]::bigint[];
    v_tentativa integer;
    v_mensagem_encontrada boolean;

    -- Variáveis para verificação de Mentions
    v_mentions_disponiveis integer;
    v_user_id text;
    v_customer_email text;
BEGIN
    -- Log inicial
    RAISE NOTICE 'Iniciando agendamento para projeto %', projeto_id_param;

    -- Verificar se projeto está ativo e obter configurações
    SELECT
        "Youtube Active",
        COALESCE(NULLIF("Postagem_dia", ''), '3')::integer,
        tipo_de_postagem,
        COALESCE(fuso_horario, 'UTC')
    INTO projeto_ativo, posts_por_dia, tipo_postagem, fuso_horario_projeto
    FROM "Projeto"
    WHERE id = projeto_id_param;

    RAISE NOTICE 'Projeto ativo: %, Posts por dia: %, Tipo de postagem: %, Fuso horário: %',
               projeto_ativo, posts_por_dia, tipo_postagem, fuso_horario_projeto;

    IF NOT projeto_ativo THEN
        RAISE NOTICE 'Projeto não está ativo, retornando 0';
        RETURN 0;
    END IF;

    -- Verificar Mentions disponíveis do customer
    SELECT
        p."User id",
        c.email,
        COALESCE(c."Mentions", 0)
    INTO
        v_user_id,
        v_customer_email,
        v_mentions_disponiveis
    FROM "Projeto" p
    LEFT JOIN customers c ON p."User id" = c.user_id
    WHERE p.id = projeto_id_param;

    RAISE NOTICE 'Customer (user_id: %, email: %) tem % Mentions disponíveis',
                 v_user_id, v_customer_email, v_mentions_disponiveis;

    IF v_mentions_disponiveis IS NULL OR v_mentions_disponiveis <= 0 THEN
        RAISE NOTICE 'Customer sem Mentions disponíveis (Mentions=%)', v_mentions_disponiveis;
        RETURN 0;
    END IF;

    IF v_mentions_disponiveis < posts_por_dia THEN
        RAISE NOTICE 'AJUSTE: Mentions insuficientes para % posts/dia', posts_por_dia;
        posts_por_dia := v_mentions_disponiveis;
    END IF;

    RAISE NOTICE 'Agendando % posts com % Mentions disponíveis',
                 posts_por_dia, v_mentions_disponiveis;

    v_max_posts_por_dia := posts_por_dia;
    v_posts_a_criar := posts_por_dia;
    RAISE NOTICE 'Limite por dia: %, Meta total: %', v_max_posts_por_dia, v_posts_a_criar;

    data_local := (CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE fuso_horario_projeto)::date;
    RAISE NOTICE 'Data local no fuso %: %', fuso_horario_projeto, data_local;

    IF EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'UTC' AT TIME ZONE fuso_horario_projeto)) >= 22 THEN
        data_alvo := data_local + INTERVAL '1 day';
        RAISE NOTICE '⏰ Hora >= 22h, data inicial: AMANHÃ (%)', data_alvo;
    ELSE
        data_alvo := data_local;
        RAISE NOTICE '⏰ Hora < 22h, data inicial: HOJE (%)', data_alvo;
    END IF;

    -- =============================================
    -- Análise de proporção dinâmica COM FILTRO ANTI-SPAM
    -- =============================================
    SELECT
        COUNT(*) FILTER (WHERE tipo_resposta = 'produto' AND respondido = false),
        COUNT(*) FILTER (WHERE tipo_resposta = 'engajamento' AND respondido = false),
        COUNT(*) FILTER (WHERE respondido = false)
    INTO v_produto_disponivel, v_engajamento_disponivel, v_total_disponivel
    FROM "Mensagens" m
    JOIN "Comentarios_Principais" cp ON m."Comentario_Principais" = cp.id
    JOIN "Videos" v ON cp.video_id = v.id
    LEFT JOIN "Canais do youtube" c ON v.channel_id_yotube = c.channel_id AND c."Projeto" = projeto_id_param
    WHERE m.project_id = projeto_id_param
    AND NOT EXISTS (
        SELECT 1 FROM "Settings messages posts" smp
        WHERE smp."Mensagens" = m.id
    )
    -- 🛡️ FILTRO ANTI-SPAM: Só conta mensagens de canais válidos
    AND (
        c.channel_id IS NULL  -- Canal novo (não existe na tabela)
        OR (
            (c.is_active = true OR c.is_active IS NULL)
            AND c.auto_disabled_reason IS NULL
            AND (c.desativado_pelo_user = false OR c.desativado_pelo_user IS NULL)
        )
    );

    RAISE NOTICE 'Material disponível (COM ANTI-SPAM) - Produto: %, Engajamento: %, Total: %',
                v_produto_disponivel, v_engajamento_disponivel, v_total_disponivel;

    -- Proporção MEIO A MEIO produto/engajamento
    IF v_produto_disponivel = 0 AND v_engajamento_disponivel = 0 THEN
        v_produtos_por_dia := 0;
        RAISE NOTICE 'AVISO: Nenhuma mensagem disponível em canais válidos';
        RETURN 0;

    ELSIF v_produto_disponivel = 0 THEN
        v_produtos_por_dia := 0;
        RAISE NOTICE 'ESTRATÉGIA: Só engajamento disponível (produto=0)';

    ELSIF v_engajamento_disponivel = 0 THEN
        v_produtos_por_dia := posts_por_dia;
        RAISE NOTICE 'ESTRATÉGIA: Só produto disponível (engajamento=0)';

    ELSE
        IF posts_por_dia % 2 = 0 THEN
            v_produtos_por_dia := posts_por_dia / 2;
        ELSE
            v_produtos_por_dia := (posts_por_dia / 2) + 1;
        END IF;

        IF v_produto_disponivel < v_produtos_por_dia THEN
            v_produtos_por_dia := v_produto_disponivel;
            RAISE NOTICE 'AJUSTE: Produtos insuficientes, limitando a %', v_produto_disponivel;
        END IF;

        IF v_engajamento_disponivel < (posts_por_dia - v_produtos_por_dia) THEN
            RAISE NOTICE 'AJUSTE: Engajamentos insuficientes (%)', v_engajamento_disponivel;
            v_produtos_por_dia := LEAST(
                v_produto_disponivel,
                posts_por_dia - v_engajamento_disponivel
            );
        END IF;
    END IF;

    RAISE NOTICE 'ESTRATÉGIA MEIO A MEIO: % produtos e % engajamentos de % posts totais',
                v_produtos_por_dia, posts_por_dia - v_produtos_por_dia, posts_por_dia;

    SELECT ARRAY_AGG(DISTINCT EXTRACT(HOUR FROM proxima_postagem AT TIME ZONE 'UTC' AT TIME ZONE fuso_horario_projeto)::integer)
    INTO horas_usadas
    FROM "Settings messages posts"
    WHERE "Projeto" = projeto_id_param
    AND proxima_postagem > (data_local - INTERVAL '7 days')::timestamp AT TIME ZONE fuso_horario_projeto AT TIME ZONE 'UTC';

    RAISE NOTICE 'Horas usadas nos últimos 7 dias: %', horas_usadas;

    -- =============================================
    -- Distribuição multi-dia com limite per-day
    -- =============================================
    RAISE NOTICE '========== INICIANDO DISTRIBUIÇÃO MULTI-DIA ==========';
    RAISE NOTICE 'Meta: criar % posts totais', v_posts_a_criar;
    RAISE NOTICE 'Limite por dia: % posts', v_max_posts_por_dia;

    WHILE posts_criados < v_posts_a_criar AND v_dia_offset < v_max_dias_tentar LOOP
        v_data_agendamento := data_alvo + (v_dia_offset * INTERVAL '1 day');

        RAISE NOTICE '========== Analisando dia: % (offset: %) ==========',
                     v_data_agendamento, v_dia_offset;

        -- Contar posts JÁ agendados para este dia (TODOS os status)
        SELECT COUNT(*) INTO v_posts_nesse_dia
        FROM "Settings messages posts"
        WHERE "Projeto" = projeto_id_param
        AND status IN ('pending', 'posted', 'failed')  -- 🔧 FIX: Conta TODOS os status
        AND DATE(proxima_postagem AT TIME ZONE 'UTC' AT TIME ZONE fuso_horario_projeto) = v_data_agendamento;

        RAISE NOTICE 'Posts já agendados para %: %', v_data_agendamento, v_posts_nesse_dia;

        IF v_posts_nesse_dia >= v_max_posts_por_dia THEN
            RAISE NOTICE '⚠️ Dia % CHEIO (%/%), pulando para próximo dia',
                         v_data_agendamento, v_posts_nesse_dia, v_max_posts_por_dia;
            v_dia_offset := v_dia_offset + 1;
            CONTINUE;
        END IF;

        v_slots_disponiveis := v_max_posts_por_dia - v_posts_nesse_dia;
        v_posts_para_esse_dia := LEAST(v_slots_disponiveis, v_posts_a_criar - posts_criados);

        RAISE NOTICE '✅ Dia % tem % slots disponíveis, criando % posts',
                     v_data_agendamento, v_slots_disponiveis, v_posts_para_esse_dia;

        FOR i IN 1..v_posts_para_esse_dia LOOP
            RAISE NOTICE '========== Criando postagem %/%  para dia % ==========',
                         posts_criados + 1, v_posts_a_criar, v_data_agendamento;

        -- Determinar tipo desejado
        IF v_produtos_agendados < v_produtos_por_dia AND v_produto_disponivel > 0 THEN
            v_tipo_desejado := 'produto';
            RAISE NOTICE 'Tipo desejado: PRODUTO (agendados: %/%)', v_produtos_agendados, v_produtos_por_dia;
        ELSE
            v_tipo_desejado := 'engajamento';
            RAISE NOTICE 'Tipo desejado: ENGAJAMENTO';
        END IF;

        v_mensagem_encontrada := false;
        v_tentativa := 0;

        -- =============================================
        -- NÍVEL 1: Tipo desejado + Vídeo diferente + Lead + CANAL VÁLIDO
        -- =============================================
        IF NOT v_mensagem_encontrada THEN
            v_tentativa := 1;
            RAISE NOTICE 'Tentativa NÍVEL 1: Tipo=%, Vídeo diferente, Lead=true, Canal válido', v_tipo_desejado;

            SELECT
                m.id,
                cp.video_id,
                cp.id,
                m.tipo_resposta
            INTO
                mensagem_selecionada,
                video_selecionado,
                comentario_selecionado,
                v_tipo_selecionado
            FROM "Mensagens" m
            JOIN "Comentarios_Principais" cp ON m."Comentario_Principais" = cp.id
            JOIN "Videos" v ON cp.video_id = v.id
            LEFT JOIN "Canais do youtube" c ON v.channel_id_yotube = c.channel_id AND c."Projeto" = projeto_id_param
            WHERE m.project_id = projeto_id_param
            AND m.respondido = false
            AND m.tipo_resposta = v_tipo_desejado
            AND (videos_usados_hoje IS NULL OR NOT cp.video_id = ANY(videos_usados_hoje))
            AND cp.led = true
            AND NOT EXISTS (
                SELECT 1 FROM "Settings messages posts" s
                WHERE s."Mensagens" = m.id
            )
            -- 🛡️ FILTRO ANTI-SPAM
            AND (
                c.channel_id IS NULL
                OR (
                    (c.is_active = true OR c.is_active IS NULL)
                    AND c.auto_disabled_reason IS NULL
                    AND (c.desativado_pelo_user = false OR c.desativado_pelo_user IS NULL)
                )
            )
            ORDER BY
                CASE WHEN cp.lead_score IS NOT NULL THEN cp.lead_score::integer ELSE 0 END DESC,
                random()
            LIMIT 1;

            IF mensagem_selecionada IS NOT NULL THEN
                v_mensagem_encontrada := true;
                RAISE NOTICE 'NÍVEL 1 SUCESSO: Mensagem=%, Vídeo=%, Tipo=%',
                            mensagem_selecionada, video_selecionado, v_tipo_selecionado;
            END IF;
        END IF;

        -- =============================================
        -- NÍVEL 2: Tipo desejado + Vídeo diferente + CANAL VÁLIDO
        -- =============================================
        IF NOT v_mensagem_encontrada THEN
            v_tentativa := 2;
            RAISE NOTICE 'Tentativa NÍVEL 2: Tipo=%, Vídeo diferente, Qualquer lead, Canal válido', v_tipo_desejado;

            SELECT
                m.id,
                cp.video_id,
                cp.id,
                m.tipo_resposta
            INTO
                mensagem_selecionada,
                video_selecionado,
                comentario_selecionado,
                v_tipo_selecionado
            FROM "Mensagens" m
            JOIN "Comentarios_Principais" cp ON m."Comentario_Principais" = cp.id
            JOIN "Videos" v ON cp.video_id = v.id
            LEFT JOIN "Canais do youtube" c ON v.channel_id_yotube = c.channel_id AND c."Projeto" = projeto_id_param
            WHERE m.project_id = projeto_id_param
            AND m.respondido = false
            AND m.tipo_resposta = v_tipo_desejado
            AND (videos_usados_hoje IS NULL OR NOT cp.video_id = ANY(videos_usados_hoje))
            AND NOT EXISTS (
                SELECT 1 FROM "Settings messages posts" s
                WHERE s."Mensagens" = m.id
            )
            -- 🛡️ FILTRO ANTI-SPAM
            AND (
                c.channel_id IS NULL
                OR (
                    (c.is_active = true OR c.is_active IS NULL)
                    AND c.auto_disabled_reason IS NULL
                    AND (c.desativado_pelo_user = false OR c.desativado_pelo_user IS NULL)
                )
            )
            ORDER BY
                CASE WHEN cp.led THEN 0 ELSE 1 END,
                random()
            LIMIT 1;

            IF mensagem_selecionada IS NOT NULL THEN
                v_mensagem_encontrada := true;
                RAISE NOTICE 'NÍVEL 2 SUCESSO: Mensagem=%, Vídeo=%, Tipo=%',
                            mensagem_selecionada, video_selecionado, v_tipo_selecionado;
            END IF;
        END IF;

        -- =============================================
        -- NÍVEL 3: Tipo desejado + permite vídeo repetido + CANAL VÁLIDO
        -- =============================================
        IF NOT v_mensagem_encontrada THEN
            v_tentativa := 3;
            RAISE NOTICE 'Tentativa NÍVEL 3: MESMO TIPO=% (permite vídeo repetido), Canal válido', v_tipo_desejado;

            SELECT
                m.id,
                cp.video_id,
                cp.id,
                m.tipo_resposta
            INTO
                mensagem_selecionada,
                video_selecionado,
                comentario_selecionado,
                v_tipo_selecionado
            FROM "Mensagens" m
            JOIN "Comentarios_Principais" cp ON m."Comentario_Principais" = cp.id
            JOIN "Videos" v ON cp.video_id = v.id
            LEFT JOIN "Canais do youtube" c ON v.channel_id_yotube = c.channel_id AND c."Projeto" = projeto_id_param
            WHERE m.project_id = projeto_id_param
            AND m.respondido = false
            AND m.tipo_resposta = v_tipo_desejado
            AND NOT EXISTS (
                SELECT 1 FROM "Settings messages posts" s
                WHERE s."Mensagens" = m.id
            )
            -- 🛡️ FILTRO ANTI-SPAM
            AND (
                c.channel_id IS NULL
                OR (
                    (c.is_active = true OR c.is_active IS NULL)
                    AND c.auto_disabled_reason IS NULL
                    AND (c.desativado_pelo_user = false OR c.desativado_pelo_user IS NULL)
                )
            )
            ORDER BY
                CASE WHEN cp.led THEN 0 ELSE 1 END,
                random()
            LIMIT 1;

            IF mensagem_selecionada IS NOT NULL THEN
                v_mensagem_encontrada := true;
                RAISE NOTICE 'NÍVEL 3 SUCESSO: Mensagem=%, Vídeo=%, Tipo=%',
                            mensagem_selecionada, video_selecionado, v_tipo_selecionado;
            END IF;
        END IF;

        -- =============================================
        -- NÍVEL 4: Qualquer mensagem + CANAL VÁLIDO (emergência)
        -- =============================================
        IF NOT v_mensagem_encontrada THEN
            v_tentativa := 4;
            RAISE NOTICE 'Tentativa NÍVEL 4: EMERGÊNCIA - Qualquer mensagem em canal válido';

            SELECT
                m.id,
                cp.video_id,
                cp.id,
                m.tipo_resposta
            INTO
                mensagem_selecionada,
                video_selecionado,
                comentario_selecionado,
                v_tipo_selecionado
            FROM "Mensagens" m
            LEFT JOIN "Comentarios_Principais" cp ON m."Comentario_Principais" = cp.id
            LEFT JOIN "Videos" v ON cp.video_id = v.id
            LEFT JOIN "Canais do youtube" c ON v.channel_id_yotube = c.channel_id AND c."Projeto" = projeto_id_param
            WHERE m.project_id = projeto_id_param
            AND m.respondido = false
            AND NOT EXISTS (
                SELECT 1 FROM "Settings messages posts" s
                WHERE s."Mensagens" = m.id
            )
            -- 🛡️ FILTRO ANTI-SPAM
            AND (
                c.channel_id IS NULL
                OR (
                    (c.is_active = true OR c.is_active IS NULL)
                    AND c.auto_disabled_reason IS NULL
                    AND (c.desativado_pelo_user = false OR c.desativado_pelo_user IS NULL)
                )
            )
            ORDER BY
                CASE
                    WHEN videos_usados_hoje IS NULL THEN 0
                    WHEN cp.video_id IS NULL THEN 1
                    WHEN NOT cp.video_id = ANY(videos_usados_hoje) THEN 0
                    ELSE 1
                END,
                CASE WHEN cp.led THEN 0 ELSE 1 END,
                random()
            LIMIT 1;

            IF mensagem_selecionada IS NOT NULL THEN
                v_mensagem_encontrada := true;
                RAISE NOTICE 'NÍVEL 4 SUCESSO: Mensagem=%, Vídeo=%, Tipo=%',
                            mensagem_selecionada, video_selecionado, v_tipo_selecionado;
            END IF;
        END IF;

        IF NOT v_mensagem_encontrada OR mensagem_selecionada IS NULL THEN
            RAISE NOTICE 'Nenhuma mensagem disponível em canais válidos, encerrando loop';
            EXIT;
        END IF;

        IF v_tipo_selecionado = 'produto' THEN
            v_produtos_agendados := v_produtos_agendados + 1;
        ELSE
            v_engajamentos_agendados := v_engajamentos_agendados + 1;
        END IF;

        IF video_selecionado IS NOT NULL THEN
            videos_usados_hoje := array_append(videos_usados_hoje, video_selecionado);
        END IF;

        hora_base := 9 + ((i + mensagem_selecionada) % 14);
        RAISE NOTICE 'Hora base inicial: %', hora_base;

        IF horas_usadas IS NOT NULL AND ARRAY_LENGTH(horas_usadas, 1) > 0 THEN
            IF hora_base = ANY(horas_usadas) THEN
                RAISE NOTICE 'Hora % já usada, ajustando', hora_base;

                FOR j IN 1..14 LOOP
                    hora_base := 9 + ((hora_base - 9 + j) % 14);
                    RAISE NOTICE 'Testando hora alternativa: %', hora_base;

                    IF NOT hora_base = ANY(horas_usadas) THEN
                        RAISE NOTICE 'Encontrou hora disponível: %', hora_base;
                        EXIT;
                    END IF;
                END LOOP;
            END IF;
        END IF;

        minutos_base := (mensagem_selecionada % 25) + floor(random() * (35 - (mensagem_selecionada % 10)));
        IF minutos_base >= 60 THEN
            minutos_base := minutos_base - 20;
        END IF;

        RAISE NOTICE 'Minutos calculados: %', minutos_base;

        proxima_data := v_data_agendamento +
                       (hora_base * INTERVAL '1 hour') +
                       (minutos_base * INTERVAL '1 minute');

        proxima_data := proxima_data AT TIME ZONE fuso_horario_projeto AT TIME ZONE 'UTC';

        RAISE NOTICE 'Data e hora para postagem (local): %, em UTC: %',
                   proxima_data AT TIME ZONE 'UTC' AT TIME ZONE fuso_horario_projeto,
                   proxima_data;

        IF EXISTS (
            SELECT 1 FROM "Settings messages posts"
            WHERE "Mensagens" = mensagem_selecionada
        ) THEN
            RAISE NOTICE 'AVISO: Mensagem % já tem agendamento, pulando...', mensagem_selecionada;
            CONTINUE;
        END IF;

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
                proxima_data,
                tipo_postagem::integer,
                'pending',
                EXTRACT(WEEK FROM data_local)::integer
            ) RETURNING id INTO insert_id;

            RAISE NOTICE 'Registro inserido com ID % para mensagem % (tipo: %)',
                        insert_id, mensagem_selecionada, v_tipo_selecionado;

            horas_usadas := array_append(horas_usadas, hora_base);

            posts_criados := posts_criados + 1;
            RAISE NOTICE 'Incrementado contador para %', posts_criados;

        EXCEPTION
            WHEN unique_violation THEN
                RAISE NOTICE 'Violação de unicidade: Mensagem % já tem agendamento', mensagem_selecionada;
            WHEN OTHERS THEN
                RAISE NOTICE 'Erro na transação: %', SQLERRM;
                RAISE NOTICE 'Rollback automático executado';
        END;
        END LOOP;

        v_dia_offset := v_dia_offset + 1;
        RAISE NOTICE 'Avançando para próximo dia (offset: %)', v_dia_offset;

    END LOOP;

    RAISE NOTICE '========== RESUMO FINAL ==========';
    RAISE NOTICE 'Posts criados: %', posts_criados;
    RAISE NOTICE 'Produtos agendados: %', v_produtos_agendados;
    RAISE NOTICE 'Engajamentos agendados: %', v_engajamentos_agendados;
    RAISE NOTICE 'Vídeos usados hoje: %', videos_usados_hoje;

    RETURN posts_criados;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro não tratado na função: %', SQLERRM;
        RETURN 0;
END;
$function$;
