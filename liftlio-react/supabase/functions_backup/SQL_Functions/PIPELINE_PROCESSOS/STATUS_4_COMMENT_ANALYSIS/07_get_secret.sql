-- =============================================
-- Função: get_secret
-- Tipo: Security Helper (acesso ao Vault)
--
-- Descrição:
--   Função segura para buscar secrets do Supabase Vault.
--   Usa SECURITY DEFINER para acessar vault.decrypted_secrets.
--
-- Entrada:
--   secret_name TEXT - Nome do secret no Vault
--
-- Saída:
--   TEXT - Valor do secret descriptografado
--
-- Conexões:
--   → Chamada por: 06_claude_complete (linha 20)
--   → Também usada por: Outras funções que precisam de API keys
--
-- Secrets usados:
--   - CLAUDE_API_KEY (usado em STATUS_3 e STATUS_4)
--
-- Criado: Data desconhecida
-- Atualizado: 2025-10-02 - Recuperado do Supabase e salvo localmente
-- =============================================

DROP FUNCTION IF EXISTS get_secret(TEXT);

CREATE OR REPLACE FUNCTION public.get_secret(secret_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    secret_value TEXT;
BEGIN
    SELECT decrypted_secret INTO secret_value
    FROM vault.decrypted_secrets
    WHERE name = secret_name;

    IF secret_value IS NULL THEN
        RAISE EXCEPTION 'Secret not found: %', secret_name;
    END IF;

    RETURN secret_value;
END;
$function$
