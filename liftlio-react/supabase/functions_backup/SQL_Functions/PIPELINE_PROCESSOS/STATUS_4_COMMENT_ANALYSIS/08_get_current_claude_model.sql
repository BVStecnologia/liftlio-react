-- =============================================
-- Função: get_current_claude_model
-- Descrição: Retorna o ID do modelo Claude atual a ser usado em todas as chamadas
--
-- OBJETIVO:
--   Centralizar a definição do modelo Claude em um único lugar.
--   Quando um novo modelo for lançado, basta atualizar aqui e todas
--   as funções que usam claude_complete() herdarão automaticamente.
--
-- MODELOS RECOMENDADOS (em ordem de prioridade):
--   1. claude-sonnet-4-5-20250929 - MAIS RECENTE (melhor para coding/agentes)
--   2. claude-sonnet-4-20250514 - Estável, já testado no Liftlio
--   3. claude-opus-4-1-20250805 - Para tarefas complexas especializadas
--
-- MODELOS DEPRECIADOS (NÃO USAR):
--   ❌ claude-3-5-sonnet-latest - INVÁLIDO (não é ID oficial)
--   ❌ claude-3-5-sonnet-20240620 - MORTO (22/out/2025)
--   ❌ claude-3-5-sonnet-20241022 - MORTO (22/out/2025)
--
-- Criado: 2025-01-10
-- Atualizado: 2025-01-10 - Versão inicial
-- Atualizado: 2025-10-17 - Confirmado uso do Sonnet 4.5 (deployado no Supabase)
-- =============================================

DROP FUNCTION IF EXISTS get_current_claude_model();

CREATE OR REPLACE FUNCTION public.get_current_claude_model()
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
    -- Modelo atual recomendado: Claude Sonnet 4.5 (mais recente, melhor performance)
    SELECT 'claude-sonnet-4-5-20250929'::text;

    -- ALTERNATIVA: Se preferir estabilidade já testada no sistema
    -- SELECT 'claude-sonnet-4-20250514'::text;
$function$;

-- Testar a função
-- SELECT get_current_claude_model();
-- Resultado esperado: 'claude-sonnet-4-5-20250929'
