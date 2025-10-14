-- =============================================
-- Função: processar_novos_canais_youtube
-- Descrição: Processa novos canais do YouTube para projetos ativos
-- Criado: 2025-01-23
-- =============================================

CREATE OR REPLACE FUNCTION public.processar_novos_canais_youtube()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_projeto RECORD;
    v_resultado RECORD;
    v_contador INTEGER := 0;
    v_total_projetos INTEGER := 0;
    v_total_canais INTEGER := 0;
    v_log TEXT := '';
    v_max_canais_por_projeto INTEGER := 5; -- Limite de canais por projeto em cada execução
BEGIN
    -- Contador de projetos processados
    SELECT COUNT(*) INTO v_total_projetos 
    FROM "Projeto" 
    WHERE "Youtube Active" = true;
    
    -- Log inicial
    v_log := v_log || 'Iniciando processamento de canais para ' || v_total_projetos || ' projetos ativos no YouTube.' || E'\n';
    
    -- Para cada projeto ativo no YouTube
    FOR v_projeto IN 
        SELECT id FROM "Projeto" WHERE "Youtube Active" = true
    LOOP
        v_contador := 0;
        v_log := v_log || 'Processando projeto ID: ' || v_projeto.id || E'\n';
        
        -- Processar até v_max_canais_por_projeto canais para este projeto
        FOR v_resultado IN 
            SELECT * FROM adicionar_canais_automaticamente(v_projeto.id, v_max_canais_por_projeto)
        LOOP
            v_log := v_log || '  - Canal: ' || v_resultado.nome_canal || ' (' || v_resultado.id_canal || ') - ' || v_resultado.status || E'\n';
            v_contador := v_contador + 1;
            v_total_canais := v_total_canais + 1;
        END LOOP;
        
        -- Se não encontrou nenhum canal novo para adicionar
        IF v_contador = 0 THEN
            v_log := v_log || '  - Nenhum novo canal encontrado para este projeto.' || E'\n';
        ELSE
            v_log := v_log || '  - Total de ' || v_contador || ' canais processados para este projeto.' || E'\n';
        END IF;
    END LOOP;
    
    -- Resumo final
    v_log := v_log || 'Processamento concluído. ' || v_total_canais || ' canais processados em ' || v_total_projetos || ' projetos.' || E'\n';
    
    -- Retornar log completo
    RETURN v_log;
    
EXCEPTION WHEN OTHERS THEN
    -- Em caso de erro, retornar informações sobre o erro
    RETURN 'Erro durante o processamento: ' || SQLERRM || E'\n' || v_log;
END;
$function$
