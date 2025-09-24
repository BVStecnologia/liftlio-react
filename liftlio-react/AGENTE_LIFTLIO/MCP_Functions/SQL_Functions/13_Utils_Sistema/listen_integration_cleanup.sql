-- =============================================
-- Função: listen_integration_cleanup
-- Descrição: Escuta eventos de limpeza de integração
-- Criado: 2025-01-24
-- Atualizado: Função para escutar eventos LISTEN/NOTIFY
-- =============================================

CREATE OR REPLACE FUNCTION public.listen_integration_cleanup()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    LISTEN integration_cleanup;
END;
$function$