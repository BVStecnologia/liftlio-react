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
-- Atualizado: 2025-10-26 - Mudança para proporção MEIO A MEIO entre produto/engajamento
--                          Remove sistema de 3 níveis (0-4, 5-8, >8)
--                          Divisão: Par=50/50, Ímpar=favorece produtos (+1)
--                          Proteções: fallback quando tipo zerado ou insuficiente
--                          BUG CORRIGIDO #1: Nível 3 INVERTIA TIPO (usava v_tipo_alternativo)
--                          Agora Nível 3 = MESMO TIPO + permite vídeo repetido
--                          BUG CORRIGIDO #2: Nível 3 filtrava vídeo diferente, impedindo engajamento
--                          Removido filtro de vídeo no Nível 3 (permite repetição)
--                          LÓGICA CORRETA: N1/N2=tipo+vídeo_dif, N3=tipo+vídeo_rep, N4=qualquer
-- Atualizado: 2025-10-28 - FIX: Agendar para AMANHÃ se já passou das 22h (evita posts no passado)
-- Atualizado: 2025-10-31 - BUFFER SYSTEM: Distribuição multi-dia com limite per-day
--                          Remove "all or nothing" logic (já agendado hoje = skip total)
--                          NOVO: Preenche dias até alcançar meta de posts criados
--                          Respeita Postagem_dia como LIMITE POR DIA (não por batch)
--                          Loop WHILE com offset de dias (tenta até 14 dias futuros)
--                          Cada dia: verifica slots disponíveis, agenda até preencher
--                          Se dia cheio (posts >= Postagem_dia) → pula para próximo dia
--                          Garante distribuição natural ao longo de múltiplos dias
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
    data_alvo date;  -- Data para agendar (hoje ou amanhã, depende da hora)

    -- NOVO: Variáveis para distribuição multi-dia
    v_data_agendamento date;
    v_dia_offset integer := 0;
    v_max_dias_tentar integer := 14;  -- Tenta até 14 dias no futuro
    v_posts_nesse_dia integer;
    v_slots_disponiveis integer;
    v_posts_para_esse_dia integer;
    v_max_posts_por_dia integer;
    v_posts_a_criar integer;
    v_posts_pending integer;  -- NOVO: Contador de posts pending atuais
    v_buffer_target integer := 2;  -- NOVO: Buffer desejado (sempre 2 posts pending)

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

    -- =============================================
    -- NOVO: BUFFER SYSTEM - Manter sempre 2 posts pending
    -- =============================================
    SELECT COUNT(*) INTO v_posts_pending
    FROM "Settings messages posts"
    WHERE "Projeto" = projeto_id_param
    AND status = 'pending';

    RAISE NOTICE '📊 BUFFER CHECK: % posts pending de meta %', v_posts_pending, v_buffer_target;

    -- Calcular quantos posts criar para atingir buffer de 2
    v_posts_a_criar := GREATEST(0, v_buffer_target - v_posts_pending);

    IF v_posts_a_criar = 0 THEN
        RAISE NOTICE '✅ BUFFER OK: Já tem % posts pending (meta: %), não precisa criar mais',
                     v_posts_pending, v_buffer_target;
        RETURN 0;
    END IF;

    RAISE NOTICE '🎯 BUFFER INSUFICIENTE: Criando % posts para atingir meta de %',
                 v_posts_a_criar, v_buffer_target;

    -- Guardar o limite diário (Postagem_dia)
    v_max_posts_por_dia := posts_por_dia;
    RAISE NOTICE 'Limite por dia: %, Total a criar: %', v_max_posts_por_dia, v_posts_a_criar;

    -- Obter data local no fuso horário do projeto
    data_local := (CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE fuso_horario_projeto)::date;
    RAISE NOTICE 'Data local no fuso %: %', fuso_horario_projeto, data_local;

    -- Determinar data inicial: se passou das 22h, começa a partir de AMANHÃ
    IF EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'UTC' AT TIME ZONE fuso_horario_projeto)) >= 22 THEN
        data_alvo := data_local + INTERVAL '1 day';
        RAISE NOTICE '⏰ Hora >= 22h, data inicial: AMANHÃ (%)', data_alvo;
    ELSE
        data_alvo := data_local;
        RAISE NOTICE '⏰ Hora < 22h, data inicial: HOJE (%)', data_alvo;
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

    -- =============================================
    -- NOVO: Proporção MEIO A MEIO produto/engajamento
    -- =============================================
    IF v_produto_disponivel = 0 AND v_engajamento_disponivel = 0 THEN
        -- Nenhuma mensagem disponível
        v_produtos_por_dia := 0;
        RAISE NOTICE 'AVISO: Nenhuma mensagem disponível (produto=0, engajamento=0)';
        RETURN 0; -- Encerra função imediatamente

    ELSIF v_produto_disponivel = 0 THEN
        -- Só engajamento disponível
        v_produtos_por_dia := 0;
        RAISE NOTICE 'ESTRATÉGIA: Só engajamento disponível (produto=0)';
        RAISE NOTICE 'Agendando % posts de engajamento', posts_por_dia;

    ELSIF v_engajamento_disponivel = 0 THEN
        -- Só produto disponível
        v_produtos_por_dia := posts_por_dia;
        RAISE NOTICE 'ESTRATÉGIA: Só produto disponível (engajamento=0)';
        RAISE NOTICE 'Agendando % posts de produto', posts_por_dia;

    ELSE
        -- Ambos disponíveis: Divisão meio a meio
        IF posts_por_dia % 2 = 0 THEN
            -- Par: divide exato
            v_produtos_por_dia := posts_por_dia / 2;
        ELSE
            -- Ímpar: arredonda para cima para produtos
            v_produtos_por_dia := (posts_por_dia / 2) + 1;
        END IF;

        -- Proteção: Se não tiver produtos suficientes para metade
        IF v_produto_disponivel < v_produtos_por_dia THEN
            v_produtos_por_dia := v_produto_disponivel;
            RAISE NOTICE 'AJUSTE: Produtos insuficientes, limitando a %', v_produto_disponivel;
        END IF;

        -- Proteção: Se não tiver engajamentos suficientes
        IF v_engajamento_disponivel < (posts_por_dia - v_produtos_por_dia) THEN
            RAISE NOTICE 'AJUSTE: Engajamentos insuficientes (%)', v_engajamento_disponivel;
            -- Dá o resto para produtos se possível
            v_produtos_por_dia := LEAST(
                v_produto_disponivel,
                posts_por_dia - v_engajamento_disponivel
            );
        END IF;
    END IF;

    RAISE NOTICE 'ESTRATÉGIA MEIO A MEIO: % produtos e % engajamentos de % posts totais',
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

    -- =============================================
    -- NOVO: Distribuição multi-dia com limite per-day
    -- =============================================
    RAISE NOTICE '========== INICIANDO DISTRIBUIÇÃO MULTI-DIA ==========';
    RAISE NOTICE 'Meta: criar % posts totais', v_posts_a_criar;
    RAISE NOTICE 'Limite por dia: % posts', v_max_posts_por_dia;

    WHILE posts_criados < v_posts_a_criar AND v_dia_offset < v_max_dias_tentar LOOP
        -- Determinar data de agendamento para esta iteração
        v_data_agendamento := data_alvo + (v_dia_offset * INTERVAL '1 day');

        RAISE NOTICE '========== Analisando dia: % (offset: %) ==========',
                     v_data_agendamento, v_dia_offset;

        -- 🛡️ ANTI-SPAM PER-DAY: Contar posts JÁ agendados para este dia específico
        SELECT COUNT(*) INTO v_posts_nesse_dia
        FROM "Settings messages posts"
        WHERE "Projeto" = projeto_id_param
        AND status = 'pending'
        AND DATE(proxima_postagem AT TIME ZONE 'UTC' AT TIME ZONE fuso_horario_projeto) = v_data_agendamento;

        RAISE NOTICE 'Posts já agendados para %: %', v_data_agendamento, v_posts_nesse_dia;

        -- Verificar se este dia já está cheio
        IF v_posts_nesse_dia >= v_max_posts_por_dia THEN
            RAISE NOTICE '⚠️ Dia % CHEIO (%/%), pulando para próximo dia',
                         v_data_agendamento, v_posts_nesse_dia, v_max_posts_por_dia;
            v_dia_offset := v_dia_offset + 1;
            CONTINUE;  -- Pula para o próximo dia
        END IF;

        -- Calcular quantos slots estão disponíveis neste dia
        v_slots_disponiveis := v_max_posts_por_dia - v_posts_nesse_dia;

        -- Calcular quantos posts criar para este dia (menor entre slots disponíveis e posts restantes)
        v_posts_para_esse_dia := LEAST(v_slots_disponiveis, v_posts_a_criar - posts_criados);

        RAISE NOTICE '✅ Dia % tem % slots disponíveis, criando % posts',
                     v_data_agendamento, v_slots_disponiveis, v_posts_para_esse_dia;

        -- Criar posts para este dia específico
        FOR i IN 1..v_posts_para_esse_dia LOOP
            RAISE NOTICE '========== Criando postagem %/%  para dia % ==========',
                         posts_criados + 1, v_posts_a_criar, v_data_agendamento;

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

        -- NÍVEL 3: MESMO TIPO desejado + permite vídeo repetido (NÃO inverte tipo!)
        IF NOT v_mensagem_encontrada THEN
            v_tentativa := 3;
            RAISE NOTICE 'Tentativa NÍVEL 3: MESMO TIPO=% (permite vídeo repetido)', v_tipo_desejado;

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
            AND m.tipo_resposta = v_tipo_desejado  -- CORREÇÃO CRÍTICA: Mantém tipo desejado!
            -- REMOVIDO filtro de vídeo diferente - Nível 3 permite repetição
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

        -- Usar v_data_agendamento (data específica desta iteração do loop)
        proxima_data := v_data_agendamento +
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
        END LOOP;  -- Fim do FOR i IN 1..v_posts_para_esse_dia

        -- Avançar para o próximo dia
        v_dia_offset := v_dia_offset + 1;
        RAISE NOTICE 'Avançando para próximo dia (offset: %)', v_dia_offset;

    END LOOP;  -- Fim do WHILE posts_criados < v_posts_a_criar

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