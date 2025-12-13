-- =============================================
-- Funcao: process_all_projects_pipeline2
-- Descricao: Processa TODOS os projetos ativos (chamada pelo CRON)
-- Criado: 2025-11-25
-- Atualizado: 2025-11-28 - Adicionado filtro "Youtube Active" = TRUE
-- =============================================

DROP FUNCTION IF EXISTS process_all_projects_pipeline2();

CREATE OR REPLACE FUNCTION public.process_all_projects_pipeline2()
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_project RECORD;
    v_result TEXT;
    v_output TEXT := '';
BEGIN
    FOR v_project IN
        SELECT id FROM "Projeto"
        WHERE status::integer >= 0
        AND status::integer < 6
        AND "Youtube Active" = TRUE  -- FIX 2025-11-28: Ignorar projetos desativados
        ORDER BY id
    LOOP
        BEGIN
            v_result := pipeline2_process_project(v_project.id);
            v_output := v_output || 'P' || v_project.id || ': ' || LEFT(COALESCE(v_result, 'NULL'), 80) || E'\n';
        EXCEPTION WHEN OTHERS THEN
            v_output := v_output || 'P' || v_project.id || ': ERR - ' || LEFT(SQLERRM, 50) || E'\n';
        END;
    END LOOP;

    IF v_output = '' THEN
        RETURN 'Nenhum projeto com status 0-5';
    END IF;

    RETURN v_output;
END;
$function$;

-- =============================================
-- COMENTARIOS
-- =============================================
-- Funcao chamada pelo CRON a cada 30 segundos
--
-- FUNCIONAMENTO:
-- 1. Busca todos os projetos com status 0-5 (nao completos)
-- 2. Para cada projeto, chama pipeline2_process_project()
-- 3. Captura erros para nao parar o loop
-- 4. Retorna resumo de todos os projetos processados
--
-- CRON ASSOCIADO:
-- ```sql
-- SELECT cron.schedule(
--     'pipeline2_fast',
--     '30 seconds',
--     'SELECT process_all_projects_pipeline2()'
-- );
-- ```
--
-- EXEMPLO DE RETORNO:
-- "P117: Projeto 117: Processado
--  P58: Projeto 58: Nenhum scanner pendente"
-- =============================================
