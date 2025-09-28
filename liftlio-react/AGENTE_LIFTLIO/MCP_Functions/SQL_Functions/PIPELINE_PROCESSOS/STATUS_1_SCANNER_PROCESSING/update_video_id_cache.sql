-- =============================================
-- Função: update_video_id_cache
-- Descrição: Busca IDs de vídeos do YouTube via Edge Function
-- Dependência de: process_next_project_scanner
-- Criado: 2025-01-27
-- =============================================

CREATE OR REPLACE FUNCTION public.update_video_id_cache(scanner_id bigint)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
  DECLARE
      http_response http_response;
      edge_response json;
      video_ids text := '';
      request_body text;
      timeout_ms integer := 60000; -- 60 segundos em milissegundos
  BEGIN
      -- Verifica se o scanner existe
      IF NOT EXISTS (SELECT 1 FROM public."Scanner de videos do youtube" WHERE id = scanner_id) THEN
          RETURN 'Scanner ID ' || scanner_id || ' não encontrado';
      END IF;

      -- Prepara o corpo da requisição
      request_body := jsonb_build_object('scannerId', scanner_id::text)::text;

      -- Configura o timeout
      PERFORM http_set_curlopt('CURLOPT_TIMEOUT_MS', timeout_ms::text);

      -- Faz a chamada à Edge Function CORRETA: Retornar-Ids-do-youtube
      SELECT * INTO http_response
      FROM http((
          'POST',
          'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/Retornar-Ids-do-youtube',
          ARRAY[
              http_header('Content-Type', 'application/json'),
              http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I')
          ]::http_header[],
          'application/json',
          request_body
      )::http_request);

      -- Reseta as opções CURL
      PERFORM http_reset_curlopt();

      -- Verifica status da resposta
      IF http_response.status != 200 THEN
          RETURN 'Erro na chamada da edge function. Status: ' || http_response.status || ', Resposta: ' || http_response.content;
      END IF;

      -- Processa a resposta
      BEGIN
          edge_response := http_response.content::json;
          video_ids := edge_response->>'text';

          -- Verifica se encontramos os IDs
          IF video_ids IS NULL OR video_ids = '' THEN
              -- INSERIR "NOT" QUANDO NÃO ENCONTRAR VÍDEOS
              UPDATE public."Scanner de videos do youtube"
              SET "ID cache videos" = 'NOT',
                  rodada = NULL
              WHERE id = scanner_id;

              RETURN 'Nenhum vídeo encontrado - marcado como NOT';
          END IF;

          -- Atualiza o cache de IDs
          UPDATE public."Scanner de videos do youtube"
          SET "ID cache videos" = video_ids,
              rodada = NULL
          WHERE id = scanner_id;

          RETURN 'IDs atualizados com sucesso: ' || video_ids;
      EXCEPTION WHEN OTHERS THEN
          RETURN 'Erro ao processar a resposta: ' || SQLERRM || ' | Resposta: ' || COALESCE(http_response.content, 'NULL');
      END;

  EXCEPTION WHEN OTHERS THEN
      -- Garantir que as opções CURL sejam resetadas mesmo em caso de erro
      PERFORM http_reset_curlopt();
      RETURN 'Erro ao chamar a edge function: ' || SQLERRM;
  END;
  $function$