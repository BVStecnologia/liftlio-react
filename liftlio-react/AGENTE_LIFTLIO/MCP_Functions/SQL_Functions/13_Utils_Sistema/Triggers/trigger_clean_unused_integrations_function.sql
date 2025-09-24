-- =============================================
-- Função: trigger_clean_unused_integrations_function
-- Descrição: Trigger para limpar integrações não utilizadas após criação/atualização
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.trigger_clean_unused_integrations_function()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Aguarda 3 segundos para garantir que tudo foi atualizado
    PERFORM pg_sleep(3);

    -- Log para debug
    RAISE NOTICE 'Iniciando limpeza de integrações antigas';

    -- Remove APENAS integrações que não estão em nenhum projeto
    DELETE FROM public."Integrações"
    WHERE id NOT IN (
        SELECT "Integrações"
        FROM public."Projeto"
        WHERE "Integrações" IS NOT NULL
    )
    AND id != NEW.id  -- Não remove a nova
    AND created_at < NOW() - interval '3 seconds';  -- Só remove integrações com mais de 3 segundos

    -- Log para debug
    RAISE NOTICE 'Limpeza concluída';

    RETURN NEW;
END;
$function$