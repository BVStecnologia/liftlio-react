-- =============================================
-- Funcao: setup_pipeline2_fast_cron
-- Descricao: Configura cron RAPIDO para Pipeline 2 (30 segundos)
-- Criado: 2025-11-25
-- =============================================

-- =============================================
-- ATIVAR CRON RAPIDO (30 segundos)
-- =============================================

-- Primeiro, remover cron antigo lento (5 minutos)
SELECT cron.unschedule('pipeline2_all_projects');

-- Criar cron rapido (30 segundos)
SELECT cron.schedule(
    'pipeline2_fast',           -- Nome do job
    '30 seconds',               -- A cada 30 segundos
    'SELECT process_all_projects_pipeline2()'
);

-- =============================================
-- VERIFICAR SE FOI CRIADO
-- =============================================
-- SELECT * FROM cron.job WHERE jobname = 'pipeline2_fast';

-- =============================================
-- COMENTARIOS
-- =============================================
-- Cron Rapido para Pipeline 2
--
-- PROBLEMA:
-- Cron antigo rodava a cada 5 minutos
-- Usuario esperava muito para ver progresso
--
-- SOLUCAO:
-- Cron novo roda a cada 30 segundos
-- Progresso visivel rapidamente no frontend
--
-- TEMPO ESTIMADO:
-- 6 videos x 80 segundos = ~8 minutos para completar
-- Com cron de 30s, usuario ve status atualizando constantemente
--
-- SEGURANCA:
-- - process_all_projects_pipeline2() ja tem protecoes
-- - Cada projeto processado em sequencia
-- - Cada video avanca 1 step por chamada
-- - Sem risco de duplicatas
--
-- PARA VOLTAR AO CRON LENTO:
-- ```sql
-- SELECT cron.unschedule('pipeline2_fast');
-- SELECT cron.schedule('pipeline2_all_projects', '*/5 * * * *', 'SELECT process_all_projects_pipeline2()');
-- ```
--
-- PARA DESATIVAR COMPLETAMENTE:
-- ```sql
-- SELECT cron.unschedule('pipeline2_fast');
-- ```
-- =============================================


-- =============================================
-- FUNCAO AUXILIAR: Alternar entre cron rapido e lento
-- =============================================

DROP FUNCTION IF EXISTS toggle_pipeline2_cron_speed(BOOLEAN);

CREATE OR REPLACE FUNCTION public.toggle_pipeline2_cron_speed(fast_mode BOOLEAN DEFAULT TRUE)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Remover jobs existentes
    BEGIN
        PERFORM cron.unschedule('pipeline2_fast');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        PERFORM cron.unschedule('pipeline2_all_projects');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    IF fast_mode THEN
        -- Modo RAPIDO: 30 segundos
        PERFORM cron.schedule(
            'pipeline2_fast',
            '30 seconds',
            'SELECT process_all_projects_pipeline2()'
        );
        RETURN 'SUCCESS: Cron RAPIDO ativado (30 segundos)';
    ELSE
        -- Modo LENTO: 5 minutos
        PERFORM cron.schedule(
            'pipeline2_all_projects',
            '*/5 * * * *',
            'SELECT process_all_projects_pipeline2()'
        );
        RETURN 'SUCCESS: Cron LENTO ativado (5 minutos)';
    END IF;
END;
$function$;

-- =============================================
-- USO:
-- ```sql
-- -- Ativar modo rapido (30 segundos)
-- SELECT toggle_pipeline2_cron_speed(TRUE);
--
-- -- Ativar modo lento (5 minutos)
-- SELECT toggle_pipeline2_cron_speed(FALSE);
--
-- -- Verificar crons ativos
-- SELECT * FROM cron.job WHERE jobname LIKE 'pipeline2%';
-- ```
-- =============================================
