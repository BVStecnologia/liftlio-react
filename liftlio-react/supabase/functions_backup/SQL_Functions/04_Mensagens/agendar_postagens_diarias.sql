-- =============================================
-- Função: agendar_postagens_diarias (REFATORADA)
-- Descrição: Sistema de agendamento inteligente com buffer dinâmico e anti-bot
-- Criado: 2025-01-23
-- Atualizado: 2025-10-28 - REFATORAÇÃO COMPLETA
--   • BUFFER DINÂMICO: Mantém sempre 2-3 posts futuros (não agenda todos de uma vez)
--   • HORÁRIOS HUMANIZADOS: Intervalos 2-6h, minutos randomizados, evita madrugada
--   • DIVERSIDADE FORÇADA: Nunca repete canal/vídeo consecutivamente
--   • ANTI-SPAM: 24h por canal, 7 dias por vídeo
--   • REAGENDAMENTO: Executa a cada 5min via cron, agenda mais quando buffer baixo
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
    buffer_minimo integer := 2;  -- Manter sempre pelo menos 2 posts futuros
    buffer_maximo integer := 3;  -- Não passar de 3 posts futuros

    -- Controle de agendamentos
    posts_agendados_futuros integer;
    posts_criados integer := 0;

    -- Seleção de mensagem
    mensagem_selecionada bigint;
    video_selecionado bigint;
    canal_selecionado text;
    comentario_selecionado bigint;

    -- Cálculo de horário
    ultimo_horario_agendado timestamp with time zone;
    intervalo_horas integer;
    intervalo_minutos integer;
    proxima_postagem timestamp with time zone;
    hora_calculada integer;
    minuto_calculado integer;

    -- Anti-spam tracking
    ultimo_canal_postado text;
    ultimo_video_postado bigint;
    penultimo_video_postado bigint;

BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '🎯 INICIANDO AGENDAMENTO INTELIGENTE - Projeto %', projeto_id_param;
    RAISE NOTICE '════════════════════════════════════════════════════════════';

    -- ═══════════════════════════════════════════════════════════════
    -- PASSO 1: VERIFICAR SE PROJETO ESTÁ ATIVO
    -- ═══════════════════════════════════════════════════════════════
    SELECT
        "Youtube Active",
        tipo_de_postagem,
        COALESCE(fuso_horario, 'America/Chicago')
    INTO projeto_ativo, tipo_postagem, fuso_horario_projeto
    FROM "Projeto"
    WHERE id = projeto_id_param;

    IF NOT projeto_ativo THEN
        RAISE NOTICE '⚠️ Projeto inativo, encerrando';
        RETURN 0;
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    -- PASSO 2: VERIFICAR BUFFER DE AGENDAMENTOS FUTUROS
    -- ═══════════════════════════════════════════════════════════════
    SELECT COUNT(*)
    INTO posts_agendados_futuros
    FROM "Settings messages posts"
    WHERE "Projeto" = projeto_id_param
    AND proxima_postagem > NOW()
    AND status = 'pending';

    RAISE NOTICE '📊 Buffer atual: % posts futuros agendados', posts_agendados_futuros;

    -- Se buffer está OK (>= buffer_minimo), não precisa agendar mais
    IF posts_agendados_futuros >= buffer_minimo THEN
        RAISE NOTICE '✅ Buffer OK (>= %), encerrando', buffer_minimo;
        RETURN 0;
    END IF;

    RAISE NOTICE '⚠️ Buffer BAIXO (< %), vamos agendar mais posts!', buffer_minimo;

    -- ═══════════════════════════════════════════════════════════════
    -- PASSO 3: OBTER ÚLTIMO HORÁRIO AGENDADO (para calcular próximo)
    -- ═══════════════════════════════════════════════════════════════
    SELECT MAX(proxima_postagem)
    INTO ultimo_horario_agendado
    FROM "Settings messages posts"
    WHERE "Projeto" = projeto_id_param;

    -- Se não tem nenhum agendamento, usar agora + 2h como base
    IF ultimo_horario_agendado IS NULL THEN
        ultimo_horario_agendado := NOW() + INTERVAL '2 hours';
        RAISE NOTICE '📅 Primeiro agendamento do projeto, base: %', ultimo_horario_agendado;
    ELSE
        RAISE NOTICE '📅 Último post agendado: %', ultimo_horario_agendado;
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    -- PASSO 4: OBTER TRACKING DE ANTI-SPAM (últimos canal/vídeo)
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

    -- Pegar penúltimo vídeo também (para diversidade)
    SELECT "Videos"
    INTO penultimo_video_postado
    FROM "Settings messages posts"
    WHERE "Projeto" = projeto_id_param
    ORDER BY proxima_postagem DESC
    LIMIT 1 OFFSET 1;

    RAISE NOTICE '🎬 Último canal postado: %', COALESCE(ultimo_canal_postado, 'nenhum');
    RAISE NOTICE '🎬 Último vídeo: %, Penúltimo vídeo: %',
        COALESCE(ultimo_video_postado::text, 'nenhum'),
        COALESCE(penultimo_video_postado::text, 'nenhum');

    -- ═══════════════════════════════════════════════════════════════
    -- LOOP: AGENDAR ATÉ ATINGIR BUFFER MÍNIMO
    -- ═══════════════════════════════════════════════════════════════
    WHILE posts_agendados_futuros < buffer_minimo AND posts_criados < (buffer_maximo - posts_agendados_futuros) LOOP

        RAISE NOTICE '────────────────────────────────────────────────────';
        RAISE NOTICE '🔄 Iteração % - Agendando novo post...', (posts_criados + 1);

        -- ═══════════════════════════════════════════════════════════════
        -- PASSO 5: SELECIONAR MENSAGEM COM FILTROS DE DIVERSIDADE
        -- ═══════════════════════════════════════════════════════════════
        SELECT
            m.id,
            cp.video_id,
            v.channel_id_yotube,
            cp.id
        INTO
            mensagem_selecionada,
            video_selecionado,
            canal_selecionado,
            comentario_selecionado
        FROM "Mensagens" m
        JOIN "Comentarios_Principais" cp ON m."Comentario_Principais" = cp.id
        JOIN "Videos" v ON cp.video_id = v.id
        WHERE m.project_id = projeto_id_param
        AND m.respondido = false

        -- FILTRO 1: Mensagem ainda não agendada
        AND NOT EXISTS (
            SELECT 1 FROM "Settings messages posts" s
            WHERE s."Mensagens" = m.id
        )

        -- FILTRO 2: DIVERSIDADE - Canal diferente do último
        AND (ultimo_canal_postado IS NULL OR v.channel_id_yotube != ultimo_canal_postado)

        -- FILTRO 3: DIVERSIDADE - Vídeo diferente dos 2 últimos
        AND (ultimo_video_postado IS NULL OR cp.video_id != ultimo_video_postado)
        AND (penultimo_video_postado IS NULL OR cp.video_id != penultimo_video_postado)

        -- FILTRO 4: ANTI-SPAM - Canal não postou há menos de 24h
        AND NOT EXISTS (
            SELECT 1 FROM "Settings messages posts" s
            JOIN "Videos" v2 ON s."Videos" = v2.id
            WHERE s."Projeto" = projeto_id_param
            AND v2.channel_id_yotube = v.channel_id_yotube
            AND s.status = 'posted'
            AND s.posted_at > NOW() - INTERVAL '24 hours'
        )

        -- FILTRO 5: ANTI-SPAM - Vídeo não postou há menos de 7 dias
        AND NOT EXISTS (
            SELECT 1 FROM "Settings messages posts" s
            WHERE s."Videos" = cp.video_id
            AND s.status = 'posted'
            AND s.posted_at > NOW() - INTERVAL '7 days'
        )

        -- FILTRO 6: DIVERSIDADE - Vídeo não tem mais de 1 post agendado
        AND (
            SELECT COUNT(*) FROM "Settings messages posts" s
            WHERE s."Videos" = cp.video_id
            AND s.status = 'pending'
        ) < 1

        ORDER BY random()  -- Randomizar seleção final
        LIMIT 1;

        -- Se não encontrou mensagem válida, parar loop
        IF mensagem_selecionada IS NULL THEN
            RAISE NOTICE '❌ Nenhuma mensagem válida encontrada (filtros de diversidade)';
            EXIT;
        END IF;

        RAISE NOTICE '✅ Mensagem selecionada: % (vídeo %, canal %)',
            mensagem_selecionada, video_selecionado, canal_selecionado;

        -- ═══════════════════════════════════════════════════════════════
        -- PASSO 6: CALCULAR HORÁRIO HUMANIZADO (ANTI-BOT)
        -- ═══════════════════════════════════════════════════════════════

        -- 6A. Intervalo base: 2-6 horas (aleatório)
        intervalo_horas := 2 + floor(random() * 5)::integer;  -- 2, 3, 4, 5 ou 6 horas

        -- 6B. Minutos extras: 0-59 (aleatório)
        intervalo_minutos := floor(random() * 60)::integer;

        -- 6C. Calcular próximo horário
        proxima_postagem := ultimo_horario_agendado +
                           (intervalo_horas * INTERVAL '1 hour') +
                           (intervalo_minutos * INTERVAL '1 minute');

        -- 6D. Extrair hora e minuto para ajustes
        hora_calculada := EXTRACT(HOUR FROM proxima_postagem AT TIME ZONE fuso_horario_projeto)::integer;
        minuto_calculado := EXTRACT(MINUTE FROM proxima_postagem)::integer;

        -- 6E. AJUSTE 1: Evitar madrugada (01h-06h) → mover para 09h-11h
        IF hora_calculada >= 1 AND hora_calculada < 6 THEN
            proxima_postagem := date_trunc('day', proxima_postagem AT TIME ZONE fuso_horario_projeto) +
                              INTERVAL '9 hours' +
                              (floor(random() * 120)::integer * INTERVAL '1 minute');
            proxima_postagem := proxima_postagem AT TIME ZONE fuso_horario_projeto;
            RAISE NOTICE '🌙 Ajustado de madrugada para manhã: %', proxima_postagem;
        END IF;

        -- 6F. AJUSTE 2: Evitar minutos exatos (:00, :15, :30, :45) → adicionar 1-14min
        IF minuto_calculado IN (0, 15, 30, 45) THEN
            proxima_postagem := proxima_postagem + ((1 + floor(random() * 14)::integer) * INTERVAL '1 minute');
            RAISE NOTICE '⏰ Ajustado minutos exatos: %', proxima_postagem;
        END IF;

        RAISE NOTICE '📅 Horário calculado: % (intervalo: %h%min)',
            proxima_postagem, intervalo_horas, intervalo_minutos;

        -- ═══════════════════════════════════════════════════════════════
        -- PASSO 7: INSERIR AGENDAMENTO
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

            posts_criados := posts_criados + 1;
            posts_agendados_futuros := posts_agendados_futuros + 1;

            -- Atualizar tracking para próxima iteração
            ultimo_horario_agendado := proxima_postagem;
            penultimo_video_postado := ultimo_video_postado;
            ultimo_video_postado := video_selecionado;
            ultimo_canal_postado := canal_selecionado;

            RAISE NOTICE '✅ Post agendado com sucesso! (total: %)', posts_criados;

        EXCEPTION
            WHEN unique_violation THEN
                RAISE NOTICE '⚠️ Mensagem % já tem agendamento', mensagem_selecionada;
            WHEN OTHERS THEN
                RAISE NOTICE '❌ Erro ao inserir: %', SQLERRM;
                EXIT;
        END;

    END LOOP;

    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '🎉 AGENDAMENTO CONCLUÍDO';
    RAISE NOTICE '📊 Posts criados: %', posts_criados;
    RAISE NOTICE '📊 Buffer final: % posts futuros', posts_agendados_futuros;
    RAISE NOTICE '════════════════════════════════════════════════════════════';

    RETURN posts_criados;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erro não tratado: %', SQLERRM;
        RETURN 0;
END;
$function$;
