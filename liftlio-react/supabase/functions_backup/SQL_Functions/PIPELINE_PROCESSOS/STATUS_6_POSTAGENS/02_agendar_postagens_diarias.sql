-- =============================================
-- Função: agendar_postagens_diarias
-- Tipo: Scheduler (agendamento inteligente)
--
-- Descrição:
--   Agenda postagens diárias para um projeto, distribuindo em horários humanizados.
--   Evita vídeos e horários já usados recentemente.
--   NOVO: Implementa proporção dinâmica produto/engajamento com sistema de 4 níveis
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
-- Atualizado: 2025-10-18 - Implementação de proporção dinâmica produto/engajamento + Removido filtro de 3 dias
-- Atualizado: 2025-10-23 - Adicionada verificação de Mentions disponíveis antes de agendar
--                          Proteção: não agenda se Mentions <= 0
--                          Ajuste: limita posts_por_dia se Mentions < posts_por_dia
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
    -- REMOVIDO: videos_recentes - não precisa evitar vídeos de dias anteriores
    mensagem_selecionada bigint;
    video_selecionado bigint;
    comentario_selecionado bigint;
    insert_id bigint;
    data_local date;

    -- NOVO: Variáveis para proporção dinâmica
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

    -- NOVO: Variáveis para verificação de Mentions
    v_mentions_disponiveis integer;
    v_user_id text;
    v_customer_email text;
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

    -- =============================================
    -- NOVO: Verificar Mentions disponíveis do customer
    -- =============================================
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

    -- Proteção: Se não tem Mentions, não agenda nada
    IF v_mentions_disponiveis IS NULL OR v_mentions_disponiveis <= 0 THEN
        RAISE NOTICE 'Customer sem Mentions disponíveis (Mentions=%)', v_mentions_disponiveis;
        RAISE NOTICE 'Não será agendado nenhum post. Sistema economiza recursos.';
        RETURN 0;
    END IF;

    -- Ajuste: Se Mentions < posts_por_dia, limita quantidade
    IF v_mentions_disponiveis < posts_por_dia THEN
        RAISE NOTICE 'AJUSTE: Mentions insuficientes para % posts/dia', posts_por_dia;
        RAISE NOTICE 'Limitando para % posts (Mentions disponíveis)', v_mentions_disponiveis;
        posts_por_dia := v_mentions_disponiveis;
    END IF;

    RAISE NOTICE 'Agendando % posts com % Mentions disponíveis',
                 posts_por_dia, v_mentions_disponiveis;

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

    -- =============================================
    -- NOVO: Análise de proporção dinâmica
    -- =============================================
    SELECT
        COUNT(*) FILTER (WHERE tipo_resposta = 'produto' AND respondido = false),
        COUNT(*) FILTER (WHERE tipo_resposta = 'engajamento' AND respondido = false),
        COUNT(*) FILTER (WHERE respondido = false)
    INTO v_produto_disponivel, v_engajamento_disponivel, v_total_disponivel
    FROM "Mensagens"
    WHERE project_id = projeto_id_param
    AND NOT EXISTS (
        SELECT 1 FROM "Settings messages posts" smp
        WHERE smp."Mensagens" = "Mensagens".id
    );

    RAISE NOTICE 'Material disponível - Produto: %, Engajamento: %, Total: %',
                v_produto_disponivel, v_engajamento_disponivel, v_total_disponivel;

    -- Calcular quantos produtos agendar hoje (máximo 1 se tiver poucos)
    IF v_produto_disponivel = 0 THEN
        v_produtos_por_dia := 0;
    ELSIF v_produto_disponivel <= 4 THEN
        v_produtos_por_dia := LEAST(1, posts_por_dia);  -- Máximo 1 por dia para durar mais
    ELSIF v_produto_disponivel <= 8 THEN
        v_produtos_por_dia := LEAST(2, posts_por_dia);  -- Máximo 2 por dia
    ELSE
        -- Proporção natural mas nunca mais que metade dos posts
        v_proporcao_produto := v_produto_disponivel::float / v_total_disponivel;
        v_produtos_por_dia := LEAST(
            ROUND(posts_por_dia * v_proporcao_produto),
            posts_por_dia / 2  -- Nunca mais que metade
        );
    END IF;

    RAISE NOTICE 'Estratégia do dia: % produtos e % engajamentos de % posts totais',
                v_produtos_por_dia, posts_por_dia - v_produtos_por_dia, posts_por_dia;

    -- REMOVIDO: Coleta de vídeos recentes (3 dias) - não é necessário
    -- O sistema deve postar a quantidade indicada todos os dias até acabar as mensagens

    -- Coletar horas usadas nos últimos 7 dias (para evitar padrões)
    SELECT ARRAY_AGG(DISTINCT EXTRACT(HOUR FROM proxima_postagem AT TIME ZONE 'UTC' AT TIME ZONE fuso_horario_projeto)::integer)
    INTO horas_usadas
    FROM "Settings messages posts"
    WHERE "Projeto" = projeto_id_param
    AND proxima_postagem > (data_local - INTERVAL '7 days')::timestamp AT TIME ZONE fuso_horario_projeto AT TIME ZONE 'UTC';

    RAISE NOTICE 'Horas usadas nos últimos 7 dias: %', horas_usadas;

    -- Criar postagens diárias
    FOR i IN 1..posts_por_dia LOOP
        RAISE NOTICE '========== Criando postagem % de % ==========', i, posts_por_dia;

        -- =============================================
        -- NOVO: Sistema de seleção em 4 níveis
        -- =============================================

        -- Determinar tipo desejado baseado na proporção e no que já foi agendado
        IF v_produtos_agendados < v_produtos_por_dia AND v_produto_disponivel > 0 THEN
            v_tipo_desejado := 'produto';
            RAISE NOTICE 'Tipo desejado: PRODUTO (agendados: %/%)', v_produtos_agendados, v_produtos_por_dia;
        ELSE
            v_tipo_desejado := 'engajamento';
            RAISE NOTICE 'Tipo desejado: ENGAJAMENTO';
        END IF;

        v_mensagem_encontrada := false;
        v_tentativa := 0;

        -- NÍVEL 1: Tipo desejado + Vídeo diferente dos já usados hoje + Lead
        IF NOT v_mensagem_encontrada THEN
            v_tentativa := 1;
            RAISE NOTICE 'Tentativa NÍVEL 1: Tipo=%, Vídeo diferente, Lead=true', v_tipo_desejado;

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
            WHERE m.project_id = projeto_id_param
            AND m.respondido = false
            AND m.tipo_resposta = v_tipo_desejado
            AND (videos_usados_hoje IS NULL OR NOT cp.video_id = ANY(videos_usados_hoje))
            -- REMOVIDO: Filtro de vídeos recentes - deve postar todos os dias
            AND cp.led = true  -- Campo correto: led, não is_lead
            AND NOT EXISTS (
                SELECT 1 FROM "Settings messages posts" s
                WHERE s."Mensagens" = m.id
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

        -- NÍVEL 2: Tipo desejado + Vídeo diferente (sem exigir lead)
        IF NOT v_mensagem_encontrada THEN
            v_tentativa := 2;
            RAISE NOTICE 'Tentativa NÍVEL 2: Tipo=%, Vídeo diferente, Qualquer lead', v_tipo_desejado;

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
            WHERE m.project_id = projeto_id_param
            AND m.respondido = false
            AND m.tipo_resposta = v_tipo_desejado
            AND (videos_usados_hoje IS NULL OR NOT cp.video_id = ANY(videos_usados_hoje))
            AND NOT EXISTS (
                SELECT 1 FROM "Settings messages posts" s
                WHERE s."Mensagens" = m.id
            )
            ORDER BY
                CASE WHEN cp.led THEN 0 ELSE 1 END,  -- Ainda prefere leads
                random()
            LIMIT 1;

            IF mensagem_selecionada IS NOT NULL THEN
                v_mensagem_encontrada := true;
                RAISE NOTICE 'NÍVEL 2 SUCESSO: Mensagem=%, Vídeo=%, Tipo=%',
                            mensagem_selecionada, video_selecionado, v_tipo_selecionado;
            END IF;
        END IF;

        -- NÍVEL 3: Tipo alternativo + Vídeo diferente
        IF NOT v_mensagem_encontrada THEN
            v_tentativa := 3;
            -- Inverter tipo desejado
            IF v_tipo_desejado = 'produto' THEN
                v_tipo_desejado := 'engajamento';
            ELSE
                v_tipo_desejado := 'produto';
            END IF;

            RAISE NOTICE 'Tentativa NÍVEL 3: Tipo ALTERNATIVO=%, Vídeo diferente', v_tipo_desejado;

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
            WHERE m.project_id = projeto_id_param
            AND m.respondido = false
            AND m.tipo_resposta = v_tipo_desejado
            AND (videos_usados_hoje IS NULL OR NOT cp.video_id = ANY(videos_usados_hoje))
            AND NOT EXISTS (
                SELECT 1 FROM "Settings messages posts" s
                WHERE s."Mensagens" = m.id
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

        -- NÍVEL 4: Qualquer mensagem disponível (emergência)
        IF NOT v_mensagem_encontrada THEN
            v_tentativa := 4;
            RAISE NOTICE 'Tentativa NÍVEL 4: EMERGÊNCIA - Qualquer mensagem disponível';

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
            WHERE m.project_id = projeto_id_param
            AND m.respondido = false
            AND NOT EXISTS (
                SELECT 1 FROM "Settings messages posts" s
                WHERE s."Mensagens" = m.id
            )
            ORDER BY
                -- Ainda tenta vídeo diferente se possível
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

        -- Se não encontrar mensagem, encerrar loop
        IF NOT v_mensagem_encontrada OR mensagem_selecionada IS NULL THEN
            RAISE NOTICE 'Nenhuma mensagem disponível, encerrando loop';
            EXIT;
        END IF;

        -- Atualizar contadores de tipo
        IF v_tipo_selecionado = 'produto' THEN
            v_produtos_agendados := v_produtos_agendados + 1;
        ELSE
            v_engajamentos_agendados := v_engajamentos_agendados + 1;
        END IF;

        -- Atualizar array de vídeos usados hoje
        IF video_selecionado IS NOT NULL THEN
            videos_usados_hoje := array_append(videos_usados_hoje, video_selecionado);
        END IF;

        -- Calcular horário humanizado (mantém lógica original)
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

            RAISE NOTICE 'Registro inserido com ID % para mensagem % (tipo: %)',
                        insert_id, mensagem_selecionada, v_tipo_selecionado;

            -- Atualizar arrays de controle apenas se a transação for bem-sucedida
            -- REMOVIDO: Atualização de videos_recentes - não é necessário
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

    -- Resumo final
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
$function$