-- =============================================
-- Função: process_next_project_scanner
-- Descrição: Processa o próximo scanner pendente de um projeto
-- Criado: 2025-01-24
-- Atualizado: Função para processar scanners com tentativas e advisory lock
-- =============================================

CREATE OR REPLACE FUNCTION public.process_next_project_scanner(projeto_id bigint)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    scanner_record RECORD;
    result text;
    lock_obtained boolean;
    remaining_count integer;
    attempt_count integer := 0;
    max_attempts integer := 2;
    success boolean := false;
BEGIN
    -- Tentar obter um advisory lock específico para este projeto
    SELECT pg_try_advisory_lock(projeto_id) INTO lock_obtained;

    IF NOT lock_obtained THEN
        RETURN 'Processamento para o projeto ' || projeto_id || ' já está em andamento. Ignorando esta chamada.';
    END IF;

    BEGIN
        -- Selecionar apenas um scanner pendente do projeto para processar
        SELECT id INTO scanner_record
        FROM public."Scanner de videos do youtube"
        WHERE "Projeto_id" = projeto_id
          AND rodada IS NOT NULL
        ORDER BY id
        LIMIT 1
        FOR UPDATE SKIP LOCKED;

        -- Se não encontrou nenhum scanner para processar
        IF scanner_record.id IS NULL THEN
            PERFORM pg_advisory_unlock(projeto_id);
            RETURN 'Nenhum scanner pendente encontrado para o projeto ' || projeto_id;
        END IF;

        -- Fazer até 2 tentativas para processar o scanner
        WHILE attempt_count < max_attempts AND NOT success LOOP
            attempt_count := attempt_count + 1;

            BEGIN
                -- Processar o scanner selecionado
                SELECT update_video_id_cache(scanner_record.id) INTO result;

                -- Se chegou aqui, o processamento foi bem-sucedido
                success := true;

                -- Limpar o campo rodada após processamento bem-sucedido
                UPDATE public."Scanner de videos do youtube"
                SET rodada = NULL
                WHERE id = scanner_record.id;

            EXCEPTION WHEN OTHERS THEN
                -- Se estamos na última tentativa, propagar o erro
                IF attempt_count = max_attempts THEN
                    PERFORM pg_advisory_unlock(projeto_id);
                    RETURN 'Erro ao processar scanner ' || scanner_record.id || ' após ' || max_attempts ||
                           ' tentativas para o projeto ' || projeto_id || ': ' || SQLERRM;
                END IF;
                -- Se não for a última tentativa, apenas registrar o erro e tentar novamente
            END;
        END LOOP;

        -- Verificar quantos scanners ainda estão pendentes após processar este
        SELECT COUNT(*) INTO remaining_count
        FROM public."Scanner de videos do youtube"
        WHERE "Projeto_id" = projeto_id
          AND rodada IS NOT NULL;

        -- Se este era o último scanner, atualizar o status do projeto
        IF remaining_count = 0 THEN
            UPDATE public."Projeto"
            SET status = '2'
            WHERE id = projeto_id;

            PERFORM pg_advisory_unlock(projeto_id);
            RETURN 'Scanner ' || scanner_record.id || ' processado com sucesso na tentativa ' ||
                   attempt_count || '. Projeto ' || projeto_id || ' completamente processado. Status atualizado para 2.';
        ELSE
            PERFORM pg_advisory_unlock(projeto_id);
            RETURN 'Scanner ' || scanner_record.id || ' processado com sucesso na tentativa ' ||
                   attempt_count || '. Restam ' || remaining_count || ' scanners pendentes no projeto ' || projeto_id;
        END IF;

    EXCEPTION WHEN OTHERS THEN
        -- Liberar o lock em caso de erro geral
        PERFORM pg_advisory_unlock(projeto_id);
        RETURN 'Erro geral ao processar scanner para o projeto ' || projeto_id || ': ' || SQLERRM;
    END;
END;
$function$