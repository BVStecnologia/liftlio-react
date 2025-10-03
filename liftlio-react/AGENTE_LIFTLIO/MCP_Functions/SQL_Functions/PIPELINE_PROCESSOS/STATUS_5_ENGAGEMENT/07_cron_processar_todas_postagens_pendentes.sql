-- =============================================
-- Função: cron_processar_todas_postagens_pendentes
-- Tipo: Cron Job (execução automática)
--
-- Descrição:
--   Executa processamento de todas as postagens pendentes de todos os projetos.
--   Chamada pelo pg_cron para rodar automaticamente.
--
-- Entrada:
--   Nenhuma
--
-- Saída:
--   TABLE (projetos_processados, total_processados, sucessos, falhas)
--
-- Conexões:
--   → Chamada por: pg_cron (job agendado)
--   → Chama: processar_postagens_pendentes(projeto_id) para cada projeto
--
-- Criado: Data desconhecida
-- Atualizado: 2025-10-02 - Recuperado do Supabase e salvo localmente
-- =============================================

DROP FUNCTION IF EXISTS cron_processar_todas_postagens_pendentes();

CREATE OR REPLACE FUNCTION public.cron_processar_todas_postagens_pendentes()
 RETURNS TABLE(projetos_processados integer, total_processados integer, sucessos integer, falhas integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_projeto RECORD;
    v_resultado RECORD;
    v_registros_processados INTEGER := 0;
    v_sucessos_total INTEGER := 0;
    v_falhas_total INTEGER := 0;
    v_projetos_processados INTEGER := 0;
BEGIN
    -- Buscar apenas projetos que têm postagens pendentes
    FOR v_projeto IN (
        SELECT DISTINCT p.id
        FROM "Settings messages posts" smp
        JOIN "Projeto" p ON smp."Projeto" = p.id
        WHERE smp.status = 'pending'
        AND smp.proxima_postagem <= CURRENT_TIMESTAMP
        AND p."Youtube Active" = true
        AND p.integracao_valida = true
        ORDER BY p.id
    ) LOOP
        BEGIN
            -- Processar postagens pendentes para este projeto
            RAISE NOTICE 'Processando postagens para projeto ID=%', v_projeto.id;

            -- Chamar a função que processa as postagens
            SELECT
                p.total_processados,
                p.sucessos,
                p.falhas
            INTO v_resultado
            FROM processar_postagens_pendentes(v_projeto.id) p;

            -- Acumular estatísticas
            v_registros_processados := v_registros_processados + v_resultado.total_processados;
            v_sucessos_total := v_sucessos_total + v_resultado.sucessos;
            v_falhas_total := v_falhas_total + v_resultado.falhas;
            v_projetos_processados := v_projetos_processados + 1;

            -- Log dos resultados por projeto
            RAISE NOTICE 'Projeto ID=%: processados=%, sucessos=%, falhas=%',
                v_projeto.id,
                v_resultado.total_processados,
                v_resultado.sucessos,
                v_resultado.falhas;

        EXCEPTION WHEN OTHERS THEN
            -- Registrar erro específico do projeto
            RAISE NOTICE 'Erro ao processar projeto ID=%: %',
                v_projeto.id,
                SQLERRM;
        END;

        -- Pequena pausa entre projetos para não sobrecarregar a API
        PERFORM pg_sleep(1);
    END LOOP;

    -- Retornar estatísticas simples
    RETURN QUERY SELECT
        v_projetos_processados,
        v_registros_processados,
        v_sucessos_total,
        v_falhas_total;
END;
$function$
