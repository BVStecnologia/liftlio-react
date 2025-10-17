-- =============================================
-- Função: agendar_postagens_diarias
-- Tipo: Scheduler (agendamento inteligente)
--
-- Descrição:
--   Agenda postagens diárias para um projeto, distribuindo em horários humanizados.
--   Evita vídeos e horários já usados recentemente.
--
-- Entrada:
--   projeto_id_param BIGINT - ID do projeto
--
-- Saída:
--   INTEGER - Número de posts criados
--
-- Conexões:
--   → Chamada por: agendar_postagens_todos_projetos (linha 32)
--   → Insere em: Tabela "Settings messages posts"
--
-- Criado: Data desconhecida
-- Atualizado: 2025-10-02 - Recuperado do Supabase e salvo localmente
-- =============================================

DROP FUNCTION IF EXISTS agendar_postagens_diarias(BIGINT);

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

    -- Verificar se projeto está ativo e obter configurações, INCLUINDO FUSO HORÁRIO
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

    -- Se projeto não estiver ativo, encerrar
    IF NOT projeto_ativo THEN
        RAISE NOTICE 'Projeto não está ativo, retornando 0';
        RETURN 0;
    END IF;

    -- Obter data local no fuso horário do projeto
    data_local := (CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE fuso_horario_projeto)::date;
    RAISE NOTICE 'Data local no fuso %: %', fuso_horario_projeto, data_local;

    -- Verificar se já existem postagens agendadas para hoje (NA DATA LOCAL DO USUÁRIO)
    SELECT EXISTS (
        SELECT 1
        FROM "Settings messages posts"
        WHERE "Projeto" = projeto_id_param
        AND DATE(proxima_postagem AT TIME ZONE 'UTC' AT TIME ZONE fuso_horario_projeto) = data_local
    ) INTO ja_agendado_hoje;

    RAISE NOTICE 'Já agendado hoje (data local): %', ja_agendado_hoje;

    -- Se já tiver agendado hoje, encerrar
    IF ja_agendado_hoje THEN
        RAISE NOTICE 'Já existem agendamentos para hoje (fuso local), retornando 0';
        RETURN 0;
    END IF;

    -- Coletar vídeos usados recentemente (para evitar repetição)
    SELECT ARRAY_AGG("Videos")
    INTO videos_recentes
    FROM "Settings messages posts"
    WHERE "Projeto" = projeto_id_param
    AND "Videos" IS NOT NULL
    AND proxima_postagem > (data_local - INTERVAL '3 days')::timestamp AT TIME ZONE fuso_horario_projeto AT TIME ZONE 'UTC';

    RAISE NOTICE 'Vídeos recentes: %', videos_recentes;

    -- Coletar horas usadas nos últimos 7 dias (para evitar padrões)
    SELECT ARRAY_AGG(DISTINCT EXTRACT(HOUR FROM proxima_postagem AT TIME ZONE 'UTC' AT TIME ZONE fuso_horario_projeto)::integer)
    INTO horas_usadas
    FROM "Settings messages posts"
    WHERE "Projeto" = projeto_id_param
    AND proxima_postagem > (data_local - INTERVAL '7 days')::timestamp AT TIME ZONE fuso_horario_projeto AT TIME ZONE 'UTC';

    RAISE NOTICE 'Horas usadas: %', horas_usadas;

    -- Criar postagens diárias
    FOR i IN 1..posts_por_dia LOOP
        RAISE NOTICE 'Criando postagem % de %', i, posts_por_dia;

        -- =============================================
        -- CORREÇÃO CRÍTICA: Buscar apenas mensagens que NÃO têm agendamento
        -- =============================================
        IF videos_recentes IS NOT NULL AND ARRAY_LENGTH(videos_recentes, 1) > 0 THEN
            -- Buscar via comentários principais, evitando vídeos recentes E mensagens já agendadas
            SELECT
                m.id,
                cp.video_id,
                cp.id
            INTO
                mensagem_selecionada,
                video_selecionado,
                comentario_selecionado
            FROM "Mensagens" m
            JOIN "Comentarios_Principais" cp ON m."Comentario_Principais" = cp.id
            WHERE m.project_id = projeto_id_param
            AND m.respondido = false
            AND NOT cp.video_id = ANY(videos_recentes)
            -- NOVA VERIFICAÇÃO: Excluir mensagens que já têm agendamento
            AND NOT EXISTS (
                SELECT 1 FROM "Settings messages posts" s
                WHERE s."Mensagens" = m.id
            )
            ORDER BY random()
            LIMIT 1;

            RAISE NOTICE 'Tentativa 1: Mensagem: %, Vídeo: %, Comentário: %', mensagem_selecionada, video_selecionado, comentario_selecionado;

            -- Se não encontrar, tentar qualquer mensagem não respondida (mas ainda sem agendamento)
            IF mensagem_selecionada IS NULL THEN
                RAISE NOTICE 'Não encontrou mensagem com vídeo diferente, tentando qualquer mensagem';

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
                -- NOVA VERIFICAÇÃO: Excluir mensagens que já têm agendamento
                AND NOT EXISTS (
                    SELECT 1 FROM "Settings messages posts" s
                    WHERE s."Mensagens" = m.id
                )
                ORDER BY random()
                LIMIT 1;

                RAISE NOTICE 'Tentativa 2: Mensagem: %, Vídeo: %, Comentário: %', mensagem_selecionada, video_selecionado, comentario_selecionado;
            END IF;
        ELSE
            -- Se não tiver vídeos recentes, selecionar qualquer mensagem (sem agendamento)
            RAISE NOTICE 'Sem vídeos recentes, buscando qualquer mensagem';

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
            -- NOVA VERIFICAÇÃO: Excluir mensagens que já têm agendamento
            AND NOT EXISTS (
                SELECT 1 FROM "Settings messages posts" s
                WHERE s."Mensagens" = m.id
            )
            ORDER BY random()
            LIMIT 1;

            RAISE NOTICE 'Tentativa 3: Mensagem: %, Vídeo: %, Comentário: %', mensagem_selecionada, video_selecionado, comentario_selecionado;
        END IF;

        -- Se não encontrar mensagem, encerrar loop
        IF mensagem_selecionada IS NULL THEN
            RAISE NOTICE 'Não encontrou nenhuma mensagem disponível (todas já agendadas ou respondidas), encerrando loop';
            EXIT;
        END IF;

        -- Calcular horário humanizado
        hora_base := 9 + ((i + mensagem_selecionada) % 14);
        RAISE NOTICE 'Hora base inicial: %', hora_base;

        -- Evitar horas já usadas nos últimos 7 dias
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

        -- Minutos com componente natural
        minutos_base := (mensagem_selecionada % 25) + floor(random() * (35 - (mensagem_selecionada % 10)));
        IF minutos_base >= 60 THEN
            minutos_base := minutos_base - 20;
        END IF;

        RAISE NOTICE 'Minutos calculados: %', minutos_base;

        -- Criar timestamp no fuso horário local e converter para UTC para armazenamento
        proxima_data := data_local +
                       (hora_base * INTERVAL '1 hour') +
                       (minutos_base * INTERVAL '1 minute');

        -- Converter do fuso local para UTC para armazenamento
        proxima_data := proxima_data AT TIME ZONE fuso_horario_projeto AT TIME ZONE 'UTC';

        RAISE NOTICE 'Data e hora para postagem (local): %, em UTC: %',
                   proxima_data AT TIME ZONE 'UTC' AT TIME ZONE fuso_horario_projeto,
                   proxima_data;

        -- VERIFICAÇÃO ADICIONAL: Confirmar que a mensagem ainda não foi agendada (proteção extra)
        IF EXISTS (
            SELECT 1 FROM "Settings messages posts"
            WHERE "Mensagens" = mensagem_selecionada
        ) THEN
            RAISE NOTICE 'AVISO: Mensagem % já tem agendamento, pulando...', mensagem_selecionada;
            CONTINUE; -- Pula para próxima iteração
        END IF;

        -- Usar uma transação explícita para garantir atomicidade
        BEGIN
            -- Inicia transação explícita
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

            RAISE NOTICE 'Registro inserido com ID % para mensagem %', insert_id, mensagem_selecionada;

            -- Atualizar arrays de controle apenas se a transação for bem-sucedida
            IF video_selecionado IS NOT NULL THEN
                videos_recentes := array_append(videos_recentes, video_selecionado);
            END IF;
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

    RAISE NOTICE 'Finalizado agendamento com % posts criados', posts_criados;
    RETURN posts_criados;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro não tratado na função: %', SQLERRM;
        RETURN 0;
END;
$function$
