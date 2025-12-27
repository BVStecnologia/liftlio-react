-- =============================================
-- Função: cron_processar_postagens_browser_agent
-- Tipo: Cron Job (execução automática)
--
-- Descrição:
--   Executa processamento de postagens via Browser Agent.
--   Substitui cron_processar_todas_postagens_pendentes para Sistema 2.
--   O Browser Agent executa de forma humanizada.
--
-- Diferença do CRON anterior:
--   - Chama processar_postagens_via_browser_agent() (Browser Agent)
--   - Em vez de processar_postagens_pendentes() (API YouTube)
--   - Também verifica se projeto tem browser_mcp_url configurado
--
-- Criado: 2025-12-27
-- =============================================

DROP FUNCTION IF EXISTS cron_processar_postagens_browser_agent();

CREATE OR REPLACE FUNCTION cron_processar_postagens_browser_agent()
RETURNS TABLE(
    projetos_processados integer,
    total_enviados integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_projeto RECORD;
    v_resultado RECORD;
    v_total_enviados integer := 0;
    v_projetos_processados integer := 0;
BEGIN
    -- Buscar projetos com postagens pendentes E browser configurado
    FOR v_projeto IN (
        SELECT DISTINCT p.id
        FROM "Settings messages posts" smp
        JOIN "Projeto" p ON smp."Projeto" = p.id
        WHERE smp.status = 'pending'
        AND smp.proxima_postagem <= CURRENT_TIMESTAMP
        AND p."Youtube Active" = true
        AND p.integracao_valida = true
        AND p.browser_mcp_url IS NOT NULL  -- IMPORTANTE: Só projetos com browser
        ORDER BY p.id
    ) LOOP
        BEGIN
            RAISE NOTICE '[Browser Agent CRON] Processando projeto ID=%', v_projeto.id;

            -- Chamar função do Browser Agent
            SELECT
                p.total_enviados,
                p.status_mensagem
            INTO v_resultado
            FROM processar_postagens_via_browser_agent(v_projeto.id) p;

            -- Acumular estatísticas
            v_total_enviados := v_total_enviados + v_resultado.total_enviados;
            v_projetos_processados := v_projetos_processados + 1;

            RAISE NOTICE '[Browser Agent CRON] Projeto ID=%: enviados=%',
                v_projeto.id, v_resultado.total_enviados;

        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '[Browser Agent CRON] Erro projeto ID=%: %', v_projeto.id, SQLERRM;
        END;

        -- Pausa entre projetos
        PERFORM pg_sleep(0.5);
    END LOOP;

    RETURN QUERY SELECT v_projetos_processados, v_total_enviados;
END;
$$;

-- Grant para CRON
GRANT EXECUTE ON FUNCTION cron_processar_postagens_browser_agent() TO service_role;

COMMENT ON FUNCTION cron_processar_postagens_browser_agent IS
'CRON para processar postagens via Browser Agent.
Apenas projetos com browser_mcp_url configurado são processados.
Comportamento humanizado: assiste vídeo, curte, responde.';


-- =============================================
-- pg_cron job configuration
-- Execute a cada 5 minutos
-- =============================================

-- Primeiro, remover job antigo se existir (da API)
-- SELECT cron.unschedule('processar-postagens-pendentes');

-- Criar novo job para Browser Agent
-- SELECT cron.schedule(
--     'processar-postagens-browser-agent',
--     '*/5 * * * *',  -- A cada 5 minutos
--     $$SELECT cron_processar_postagens_browser_agent()$$
-- );

-- NOTA: O CRON precisa ser configurado via Dashboard do Supabase
-- ou via SQL direto. Descomente as linhas acima após revisar.
