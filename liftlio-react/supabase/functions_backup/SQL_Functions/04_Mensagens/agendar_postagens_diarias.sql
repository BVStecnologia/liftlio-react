-- =============================================
-- Função: agendar_postagens_diarias
-- Descrição: Agenda postagens diárias automaticamente
-- Criado: 2025-01-23
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
    videos_recentes bigint[] := ARRAY[]::bigint[];
    mensagem_selecionada bigint;
    video_selecionado bigint;
    comentario_selecionado bigint;
    insert_id bigint;
    data_local date;
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

    -- Se projeto não estiver ativo, encerrar
    IF NOT projeto_ativo THEN
        RETURN 0;
    END IF;

    -- Obter data local no fuso horário do projeto
    data_local := (CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE fuso_horario_projeto)::date;

    -- Verificar se já existem postagens agendadas para hoje
    SELECT EXISTS (
        SELECT 1
        FROM "Settings messages posts"
        WHERE "Projeto" = projeto_id_param
        AND DATE(proxima_postagem AT TIME ZONE 'UTC' AT TIME ZONE fuso_horario_projeto) = data_local
    ) INTO ja_agendado_hoje;

    -- Se já tiver agendado hoje, encerrar
    IF ja_agendado_hoje THEN
        RETURN 0;
    END IF;

    -- Coletar vídeos usados recentemente
    SELECT ARRAY_AGG("Videos")
    INTO videos_recentes
    FROM "Settings messages posts"
    WHERE "Projeto" = projeto_id_param
    AND "Videos" IS NOT NULL
    AND proxima_postagem > (data_local - INTERVAL '3 days')::timestamp AT TIME ZONE fuso_horario_projeto AT TIME ZONE 'UTC';

    -- Criar postagens diárias
    FOR i IN 1..posts_por_dia LOOP
        -- Buscar mensagem para agendar
        SELECT
            m.id,
            cp.video_id,
            cp.id
        INTO
            mensagem_selecionada,
            video_selecionado,
            comentario_selecionado
        FROM "Mensagens" m
        LEFT JOIN "Comentarios_Principais" cp ON m."Comentario_Principais" = cp.id
        WHERE m.project_id = projeto_id_param
        AND m.respondido = false
        AND NOT EXISTS (
            SELECT 1 FROM "Settings messages posts" s
            WHERE s."Mensagens" = m.id
        )
        ORDER BY random()
        LIMIT 1;

        -- Se não encontrar mensagem, encerrar loop
        IF mensagem_selecionada IS NULL THEN
            EXIT;
        END IF;

        -- Calcular horário humanizado
        hora_base := 9 + ((i + mensagem_selecionada) % 14);
        minutos_base := (mensagem_selecionada % 25) + floor(random() * (35 - (mensagem_selecionada % 10)));
        IF minutos_base >= 60 THEN
            minutos_base := minutos_base - 20;
        END IF;

        -- Criar timestamp
        proxima_data := data_local +
                       (hora_base * INTERVAL '1 hour') +
                       (minutos_base * INTERVAL '1 minute');

        -- Converter do fuso local para UTC
        proxima_data := proxima_data AT TIME ZONE fuso_horario_projeto AT TIME ZONE 'UTC';

        -- Inserir agendamento
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

            posts_criados := posts_criados + 1;

        EXCEPTION
            WHEN unique_violation THEN
                RAISE NOTICE 'Mensagem % já tem agendamento', mensagem_selecionada;
            WHEN OTHERS THEN
                RAISE NOTICE 'Erro na transação: %', SQLERRM;
        END;
    END LOOP;

    RETURN posts_criados;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro não tratado: %', SQLERRM;
        RETURN 0;
END;
$function$;