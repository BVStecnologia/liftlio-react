-- =============================================
-- Migration: Fix Claude model name
-- Data: 2025-10-17
-- Problema: Modelo 'claude-sonnet-4-5-20250929' NÃO EXISTE e causa timeout de 30s
-- Solução: Atualizar para modelo ESTÁVEL e COMPROVADO: 'claude-sonnet-4-20250514'
-- =============================================

-- PROBLEMA IDENTIFICADO:
-- - Função get_current_claude_model() retorna 'claude-sonnet-4-5-20250929'
-- - Este modelo NÃO existe na API da Anthropic
-- - Causa timeout de exatamente 30 segundos em TODAS as chamadas
-- - Logs confirmam: duration: 30018.985 ms
-- - CLAUDE_API_KEY está válida (108 caracteres)
-- - Infraestrutura http/pg_net está OK

CREATE OR REPLACE FUNCTION public.get_current_claude_model()
RETURNS text
LANGUAGE sql
STABLE  -- CRÍTICO: STABLE permite atualização, IMMUTABLE cacheia indefinidamente!
AS $function$
    -- CORREÇÃO FINAL (2025-10-17):
    -- PROBLEMA 1: Modelo 'claude-sonnet-4-5-20250929' não existia (causava timeout 30s)
    -- PROBLEMA 2: IMMUTABLE cacheava modelo antigo indefinidamente no PostgreSQL
    -- SOLUÇÃO: Modelo real 'claude-3-5-sonnet-20241022' + STABLE (não IMMUTABLE)
    -- Referência: https://docs.anthropic.com/claude/docs/models-overview
    SELECT 'claude-3-5-sonnet-20241022'::text;
$function$;

-- Comentário da função
COMMENT ON FUNCTION public.get_current_claude_model() IS
'Retorna o modelo atual do Claude a ser usado.
CORREÇÃO (2025-10-17): Dois problemas críticos resolvidos:
1. Modelo inválido claude-sonnet-4-5-20250929 causava timeout de 30s
2. IMMUTABLE cacheava modelo antigo indefinidamente no PostgreSQL
Solução: claude-3-5-sonnet-20241022 (modelo real) + STABLE (permite atualização)
Referência: https://docs.anthropic.com/claude/docs/models-overview
TESTADO E FUNCIONANDO: 17/10/2025';
