-- =============================================
-- Função: atualizar_scanner_rodada
-- Descrição: Define rodada=1 para scanners ativos e muda status para 1
-- Status: 0 → 1
-- Criado: 2025-01-27
-- =============================================

DROP FUNCTION IF EXISTS public.atualizar_scanner_rodada(bigint);

CREATE OR REPLACE FUNCTION public.atualizar_scanner_rodada(project_id bigint)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  DECLARE
      scanners_ativos integer;
      scanners_atualizados integer;
      log_message text := '';
  BEGIN
      -- Contar quantos scanners ativos existem
      SELECT COUNT(*) INTO scanners_ativos
      FROM public."Scanner de videos do youtube"
      WHERE "Projeto_id" = project_id
          AND "Ativa?" = true;

      -- Validação: precisa ter pelo menos 1 scanner ativo
      IF scanners_ativos = 0 THEN
          log_message := 'ERRO: Nenhum scanner ativo encontrado para o projeto ' || project_id || E'\n';
          log_message := log_message || 'Status do projeto NÃO foi alterado.';
          RETURN log_message;
      END IF;

      -- ATUALIZAR: Define rodada = 1 para TODOS scanners ativos
      UPDATE public."Scanner de videos do youtube"
      SET rodada = 1
      WHERE "Projeto_id" = project_id
          AND "Ativa?" = true;

      -- Conta quantos foram atualizados
      GET DIAGNOSTICS scanners_atualizados = ROW_COUNT;

      -- Mensagem de log
      log_message := 'Definido campo rodada = 1 para ' || scanners_atualizados ||
                     ' scanners ativos do projeto ' || project_id || E'\n';

      -- Cache de scanners (mantido como estava, mesmo com função ausente)
      log_message := log_message || 'Cache de scanners não atualizado - função ausente' || E'\n';

      -- ATUALIZAR STATUS: Muda para status 1 para iniciar processamento
      UPDATE public."Projeto"
      SET status = '1'
      WHERE id = project_id;

      log_message := log_message || 'Status do projeto ' || project_id ||
                     ' atualizado para 1 - Pronto para processar' || E'\n';

      RETURN log_message;
  END;
  $function$;

COMMENT ON FUNCTION public.atualizar_scanner_rodada(bigint) IS 
'Define rodada=1 para scanners ativos e muda status do projeto para 1 (iniciar processamento)';
