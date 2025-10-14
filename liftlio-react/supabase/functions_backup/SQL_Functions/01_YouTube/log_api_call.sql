-- =============================================
-- Função: log_api_call
-- Descrição: Registra chamadas de API
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.log_api_call(uuid, text);

CREATE OR REPLACE FUNCTION public.log_api_call(user_id uuid, endpoint text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO api_logs (user_id, endpoint, called_at)
  VALUES (user_id, endpoint, NOW());
END;
$function$;