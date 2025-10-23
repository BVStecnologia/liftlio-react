-- =============================================
-- Função: calcular_postagens_dia_projetos
-- Descrição: Distribui Mentions do customer entre seus projetos ativos
--            Roda DIARIAMENTE para rebalancear quando projetos mudam status
-- Critérios projeto ativo:
--   - "Youtube Active" = true
--   - integracao_valida = true
--   - Customer tem Mentions > 0
-- Criado: 2025-01-23
-- Atualizado: 2025-10-23 - Lógica ROUND para distribuição exata no mês
-- Execução: Cron DIÁRIO às 00:00 UTC
-- =============================================

DROP FUNCTION IF EXISTS calcular_postagens_dia_projetos();

CREATE OR REPLACE FUNCTION public.calcular_postagens_dia_projetos()
RETURNS TABLE(
    customer_email TEXT,
    customer_mentions INTEGER,
    total_projetos_ativos INTEGER,
    mentions_por_projeto NUMERIC,
    dias_no_mes INTEGER,
    projetos_detalhes JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_dias_no_mes INTEGER;
    v_customer RECORD;
    v_num_projetos_ativos INTEGER;
    v_mentions_base INTEGER;
    v_resto_mentions INTEGER;
    v_projetos_ids BIGINT[];
    v_total_atualizado INTEGER := 0;
    v_projeto_idx INTEGER := 1;
BEGIN
    -- Calcular dias do mês ATUAL
    v_dias_no_mes := EXTRACT(day FROM DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::INTEGER;

    RAISE NOTICE 'Iniciando distribuição de Mentions para o mês atual (% dias)', v_dias_no_mes;

    -- Para cada customer que tem Mentions
    FOR v_customer IN
        SELECT
            c.id as customer_id,
            c.user_id,
            c.email,
            c."Mentions"
        FROM customers c
        WHERE c."Mentions" > 0
    LOOP
        -- Contar projetos ATIVOS do customer
        -- Critérios: Youtube Active = true AND integracao_valida = true
        SELECT
            COUNT(*),
            ARRAY_AGG(p.id ORDER BY p.id)
        INTO v_num_projetos_ativos, v_projetos_ids
        FROM "Projeto" p
        WHERE p."User id" = v_customer.user_id
        AND p."Youtube Active" = true
        AND p.integracao_valida = true;

        -- Se não tem projetos ativos, pular
        IF v_num_projetos_ativos = 0 THEN
            RAISE NOTICE 'Customer % sem projetos ativos, pulando', v_customer.email;
            CONTINUE;
        END IF;

        -- Distribuir Mentions INTEGRALMENTE entre projetos
        -- Cada projeto recebe FLOOR(Mentions / Num_Projetos)
        -- Resto é distribuído 1 a 1 nos primeiros projetos
        v_mentions_base := FLOOR(v_customer."Mentions" / v_num_projetos_ativos)::INTEGER;
        v_resto_mentions := v_customer."Mentions" % v_num_projetos_ativos;

        -- Log da distribuição
        RAISE NOTICE 'Customer %: % Mentions / % projetos = % base + % resto',
            v_customer.email,
            v_customer."Mentions",
            v_num_projetos_ativos,
            v_mentions_base,
            v_resto_mentions;

        -- Atualizar cada projeto individualmente
        FOR v_projeto_idx IN 1..v_num_projetos_ativos LOOP
            DECLARE
                v_projeto_id BIGINT := v_projetos_ids[v_projeto_idx];
                v_mentions_projeto INTEGER;
                v_postagens_dia INTEGER;
            BEGIN
                -- Projeto recebe base + 1 se estiver no resto
                v_mentions_projeto := v_mentions_base;
                IF v_projeto_idx <= v_resto_mentions THEN
                    v_mentions_projeto := v_mentions_projeto + 1;
                END IF;

                -- Calcular postagens/dia: ROUND para distribuição exata no mês
                v_postagens_dia := GREATEST(
                    ROUND(v_mentions_projeto::NUMERIC / v_dias_no_mes)::INTEGER,
                    1  -- Mínimo 1 postagem/dia
                );

                -- Atualizar projeto
                UPDATE "Projeto"
                SET "Postagem_dia" = v_postagens_dia::TEXT
                WHERE id = v_projeto_id;

                RAISE NOTICE '  Projeto #%: % Mentions → % postagens/dia',
                    v_projeto_id,
                    v_mentions_projeto,
                    v_postagens_dia;
            END;
        END LOOP;

        GET DIAGNOSTICS v_total_atualizado = ROW_COUNT;

        -- Retornar dados para visualização
        customer_email := v_customer.email;
        customer_mentions := v_customer."Mentions";
        total_projetos_ativos := v_num_projetos_ativos;
        mentions_por_projeto := v_customer."Mentions"::NUMERIC / v_num_projetos_ativos;
        dias_no_mes := v_dias_no_mes;
        projetos_detalhes := (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', p.id,
                    'name', p."Project name",
                    'postagens_dia', p."Postagem_dia"::INTEGER
                ) ORDER BY p.id
            )
            FROM "Projeto" p
            WHERE p.id = ANY(v_projetos_ids)
        );

        RETURN NEXT;
    END LOOP;

    RAISE NOTICE 'Distribuição concluída! Total de projetos atualizados: %', v_total_atualizado;

    RETURN;
END;
$$;

COMMENT ON FUNCTION calcular_postagens_dia_projetos() IS
'Distribui Mentions do customer entre projetos ativos (Youtube Active + integracao_valida). Roda diariamente para rebalancear automático. Usa ROUND para distribuição exata no mês.';

-- =============================================
-- TESTES (executar manualmente antes do cron):
-- =============================================

/*
-- Teste 1: DRY RUN - Ver como seria a distribuição (sem aplicar UPDATE)
WITH customer_test AS (
    SELECT
        c.id as customer_id,
        c.email,
        c.user_id,
        c."Mentions",
        EXTRACT(day FROM DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::INTEGER as dias_no_mes
    FROM customers c
    WHERE c."Mentions" > 0
),
projetos_ativos AS (
    SELECT
        p.id,
        p."Project name",
        p."Postagem_dia" as postagem_dia_atual,
        ct.customer_id,
        ct.email,
        ct."Mentions",
        ct.dias_no_mes,
        COUNT(*) OVER (PARTITION BY ct.customer_id) as total_projetos
    FROM "Projeto" p
    CROSS JOIN customer_test ct
    WHERE p."User id" = ct.user_id
    AND p."Youtube Active" = true
    AND p.integracao_valida = true
)
SELECT
    email,
    "Mentions" as total_mentions,
    total_projetos,
    id as projeto_id,
    "Project name",
    postagem_dia_atual,
    -- Distribuir Mentions entre projetos
    FLOOR("Mentions" / total_projetos)::INTEGER as mentions_base_por_projeto,
    "Mentions" % total_projetos as resto_mentions,
    -- Se projeto está no resto, ganha +1 Mention
    CASE
        WHEN ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY id) <= ("Mentions" % total_projetos)
        THEN FLOOR("Mentions" / total_projetos)::INTEGER + 1
        ELSE FLOOR("Mentions" / total_projetos)::INTEGER
    END as mentions_para_este_projeto,
    -- Calcular postagens/dia com ROUND
    GREATEST(
        ROUND(
            (CASE
                WHEN ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY id) <= ("Mentions" % total_projetos)
                THEN FLOOR("Mentions" / total_projetos)::INTEGER + 1
                ELSE FLOOR("Mentions" / total_projetos)::INTEGER
            END)::NUMERIC / dias_no_mes
        )::INTEGER,
        1
    ) as postagens_dia_novo
FROM projetos_ativos
ORDER BY email, projeto_id;

-- Teste 2: Executar função (aplica UPDATE)
SELECT * FROM calcular_postagens_dia_projetos();

-- Teste 3: Ver resultado após execução
SELECT
    p.id,
    p."Project name",
    p."Postagem_dia",
    p."Youtube Active",
    p.integracao_valida,
    c."Mentions",
    c.email
FROM "Projeto" p
JOIN customers c ON p."User id" = c.user_id
WHERE p."Youtube Active" = TRUE
ORDER BY c.email, p.id;
*/

-- =============================================
-- EXEMPLOS DE CÁLCULO:
-- =============================================

/*
Exemplo 1: Um projeto, 208 Mentions, 31 dias (Outubro)
- Mentions/projeto: 208
- Postagens/dia: ROUND(208 / 31) = ROUND(6.71) = 7
- Total no mês: 7 × 31 = 217 (sobra 9 Mentions para próximo mês)

Exemplo 2: Três projetos, 200 Mentions, 30 dias
- Mentions/projeto: 66, 67, 67 (resto distribuído)
- Projeto 1: ROUND(67 / 30) = ROUND(2.23) = 2 postagens/dia
- Projeto 2: ROUND(67 / 30) = ROUND(2.23) = 2 postagens/dia
- Projeto 3: ROUND(66 / 30) = ROUND(2.20) = 2 postagens/dia
- Total no mês: (2+2+2) × 30 = 180 Mentions usados

Exemplo 3: Projeto desativado (rebalanceamento automático)
- Dia 1: 3 projetos ativos → 67 Mentions cada → 2 postagens/dia
- Dia 15: 1 projeto desativa → 2 projetos ativos → 100 Mentions cada → 3 postagens/dia
- Função roda diariamente e recalcula automaticamente!
*/

-- =============================================
-- CRON JOB (configurar no Supabase Dashboard):
-- =============================================

/*
-- Nome: calcular_postagens_dia_projetos
-- Agendamento: 0 0 * * * (DIÁRIO às 00:00 UTC)
-- Comando SQL:
SELECT calcular_postagens_dia_projetos();

-- Nota: Executa DIARIAMENTE para rebalancear quando:
--   - Projetos são ativados/desativados
--   - Integrações YouTube são conectadas/desconectadas
--   - Customers ganham/perdem Mentions
*/
