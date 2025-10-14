# 🔧 Correção: Erro 401 ao Executar Funções SQL na Branch DEV

**Data**: 12/10/2025 - 23:00
**Status**: ✅ IDENTIFICADO - Em correção
**Severidade**: 🔴 CRITICAL (bloqueia desenvolvimento local)
**Branch Afetada**: DEV (`cdnzajygbcujwcaoswpi`)
**Branch OK**: MAIN (`suqjifkhmekcdflwowiw`) - funcionando perfeitamente

---

## 🎯 PROBLEMA RELATADO

### Sintomas
```
1. ✅ Autenticação funciona (login com sucesso)
2. ❌ Ao chamar funções SQL via RPC → ERRO 401 Unauthorized
3. ❌ Como se as funções não existissem ou não tivessem permissão
4. ✅ MAIN funciona 100% sem problemas
```

### Contexto
- Branch DEV criada em 12/10/2025 para desenvolvimento local
- 12 migrations aplicadas com sucesso (status: `FUNCTIONS_DEPLOYED`)
- Todas tabelas, triggers, RLS e indexes funcionando
- MAS funções SQL retornam 401 após autenticação

---

## 🔍 CAUSA RAIZ IDENTIFICADA

### Análise da Migration RLS
**Arquivo**: `/Supabase/supabase/migrations/20251012070000_add_rls_policies.sql`

**Linhas 329-348** - Seção de GRANTs:
```sql
-- Grant usage on all schemas to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant basic permissions to authenticated users on tables they need
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant sequence usage to authenticated users
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;  ← ❌ PROBLEMA AQUI!
```

### ❌ O QUE ESTÁ FALTANDO:

1. **GRANT EXECUTE para role `anon`**
   - Migration só dá permissão para `authenticated`
   - Se app usa `anon` key (comum em apps React) → SEM PERMISSÃO → 401!

2. **GRANT só pegou funções existentes em 12/10/2025**
   - `GRANT EXECUTE ON ALL FUNCTIONS` é executado UMA VEZ
   - Funções criadas DEPOIS da migration → não têm GRANT → 401!

### ✅ Por que MAIN funciona?
- MAIN tem ~315 funções SQL criadas AO LONGO DE MESES
- Cada função foi criada individualmente com `GRANT EXECUTE` correto
- Não depende de uma migration única de GRANTs

---

## 💡 SOLUÇÃO PROPOSTA

### Nova Migration: `20251012230000_fix_function_grants.sql`

```sql
-- =============================================
-- Migration: Fix Function GRANTs - Adicionar permissões faltantes
-- Date: 2025-10-12
-- Description: Corrige erro 401 ao chamar funções SQL
-- =============================================

-- Garantir que TODAS as funções do schema public
-- sejam executáveis por authenticated E anon

-- Re-aplicar GRANT para authenticated (garantir todas funções)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ADICIONAR GRANT para anon (estava faltando!)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Verificar se aplicou
SELECT 'Function grants aplicados com sucesso' AS status;

-- Mostrar contagem de funções por schema
SELECT
    n.nspname as schema_name,
    COUNT(*) as total_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
GROUP BY n.nspname;
```

### O que a correção faz:
- ✅ Adiciona `GRANT EXECUTE... TO anon` (corrige permissão faltante)
- ✅ Re-aplica `GRANT EXECUTE... TO authenticated` (pega funções criadas depois)
- ✅ Garante que TODAS ~567 funções sejam executáveis
- ✅ Não quebra nada (só adiciona permissões)

---

## 📋 PLANO DE EXECUÇÃO

### Fase 1: Criar Correção ✍️
- [x] Criar documento de diagnóstico (este arquivo)
- [ ] Criar migration `20251012230000_fix_function_grants.sql`

### Fase 2: Aplicar na DEV 🚀
- [ ] Commit da migration
- [ ] Push para branch dev do Git
- [ ] Aguardar auto-deploy (~2-3 min)
- [ ] Verificar logs no Dashboard > Branches > dev

### Fase 3: Validar 🧪
- [ ] Conectar React app ao DEV
- [ ] Testar chamada RPC: `supabase.rpc('get_project_dashboard_stats')`
- [ ] Confirmar que erro 401 sumiu
- [ ] Testar múltiplas funções diferentes

### Fase 4: Documentar 📝
- [ ] Atualizar `/Supabase/README.md` com nova migration
- [ ] Registrar lição aprendida
- [ ] Marcar como ✅ RESOLVIDO

---

## ⚠️ AVISOS IMPORTANTES

### NUNCA Tocar em MAIN
- ❌ MAIN está 100% funcional
- ❌ Não aplicar esta migration em MAIN
- ✅ Só corrigir DEV
- ✅ Se DEV funcionar bem → considerar aplicar no futuro (se necessário)

### Rollback (se necessário)
Se algo der errado:
```sql
-- Remover GRANTs (rollback)
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
```

Mas **não deve** dar problema - é só adicionar permissões!

---

## 📊 MÉTRICAS

### Antes da Correção
- ✅ Funções existem: ~567 funções na DEV
- ❌ Permissão `authenticated`: Parcial (só funções antigas)
- ❌ Permissão `anon`: NENHUMA
- 🔴 Status: Erro 401 ao chamar funções

### Depois da Correção (Esperado)
- ✅ Funções existem: ~567 funções na DEV
- ✅ Permissão `authenticated`: TODAS as funções
- ✅ Permissão `anon`: TODAS as funções
- 🟢 Status: Chamadas RPC funcionando

---

## 📝 REGISTRO DE MUDANÇAS

### 2025-10-12 23:00 - INVESTIGAÇÃO INICIAL
- Problema relatado: Erro 401 ao chamar funções SQL na DEV
- Inicialmente pensado: Funções faltando (ERRADO)
- Investigação: Comparação DEV vs MAIN via navegador + MCP
- Resultado: DEV tem MAIS funções que MAIN (567 vs 504)
- Conclusão: Problema não é função faltando, é PERMISSÃO!

### 2025-10-12 23:15 - CAUSA RAIZ IDENTIFICADA
- Análise da migration RLS: `20251012070000_add_rls_policies.sql`
- Descoberto: GRANT EXECUTE faltando para role `anon`
- Descoberto: GRANT só pegou funções existentes em 12/10
- Solução: Nova migration com GRANTs corretos

### 2025-10-12 23:20 - SOLUÇÃO CRIADA
- Documento de diagnóstico criado (este arquivo)
- Migration de correção preparada
- Aguardando aplicação e validação

### [PRÓXIMO] - SOLUÇÃO APLICADA
- Timestamp do deploy
- Logs do resultado
- Validação de sucesso

---

## 🎓 LIÇÕES APRENDIDAS

### 1. GRANT EXECUTE deve incluir TODAS as roles necessárias
```sql
-- ❌ ERRADO (só authenticated)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ✅ CORRETO (authenticated + anon)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
```

### 2. Branches novas podem perder GRANTs
- Supabase copia SCHEMA mas pode não copiar todas PERMISSÕES
- Sempre validar GRANTs após criar branch
- Considerar migration de GRANTs padrão para novas branches

### 3. Erro 401 ≠ Função não existe
- 401 = Unauthorized (problema de PERMISSÃO)
- 404 = Not Found (função não existe)
- Diagnóstico: Primeiro verificar se função existe, depois verificar GRANTs

### 4. Testing de Branches
- Após criar branch DEV, sempre testar:
  - [ ] Autenticação funciona?
  - [ ] Chamadas RPC funcionam?
  - [ ] Queries SELECT funcionam?
  - [ ] Inserts/Updates funcionam?

---

**Última atualização**: 2025-10-12 23:20
**Mantido por**: Valdair / BVS Tecnologia / Claude Code
**Status**: 🟡 EM PROGRESSO - Aplicando correção
