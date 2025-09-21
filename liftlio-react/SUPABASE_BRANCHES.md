# 🔀 Branches no Supabase - Como Funciona

## Situação Atual

Você tem **1 projeto Supabase** (suqjifkhmekcdflwowiw) que é **PRODUÇÃO**.

## Opções para Teste/Desenvolvimento

### Opção 1: Database Branches (PAGO - $0.32/dia)
```
Produção (main) ←→ Branch Teste (develop)
     ↓                    ↓
[Dados reais]      [Cópia sem dados]
```

**Como criar:**
1. Dashboard Supabase → Settings → Database
2. "Create branch" → Nome: "develop"
3. Custo: ~$10/mês

**Vantagens:**
- Isola testes de produção
- Pode testar migrations perigosas

**Desvantagens:**
- Custa dinheiro
- Não copia dados (só estrutura)

### Opção 2: Usar Só Produção (GRÁTIS - Seu caso atual)
```
Produção Only
     ↓
[Testa direto]
```

**Como funciona:**
- Cria funções com nomes diferentes: `test_process_engagement`
- Testa em tabelas específicas: `_test_videos`
- Usa transações com ROLLBACK para testar

### Opção 3: Projeto Separado (GRÁTIS - 2 projetos free)
```
Projeto Prod ←→ Projeto Dev
     ↓              ↓
[liftlio.com]  [dev.liftlio.com]
```

**Como criar:**
1. Criar novo projeto no Supabase
2. Aplicar todas migrations
3. Usar `.env.development` diferente

## 🎯 Recomendação para Você

**Use Opção 2 (atual) + Git:**

```sql
-- Teste no Dashboard
BEGIN;
  -- sua função perigosa aqui
  SELECT test_function();
ROLLBACK; -- Não aplica mudanças!

-- Se funcionou, aplica de verdade:
SELECT real_function();
```

## 📝 No Seletor do Supabase

Quando você usa o SQL Editor:

```
[Projeto: Liftlio ▼] [Banco: postgres ▼]
         ↓                    ↓
   (sempre prod)      (sempre postgres)
```

**Não tem seletor teste/prod porque:**
- Ou você tem 1 projeto (prod)
- Ou você tem 2 projetos separados
- Branches são acessadas via CLI, não Dashboard

## 🔄 Workflow Seguro Sem Branches

### 1. Testar Localmente Primeiro
```bash
# Criar migration local
echo "CREATE FUNCTION test_xyz()..." > supabase/migrations/test.sql

# Ver como ficaria
npx supabase db diff

# NÃO fazer push ainda
```

### 2. Testar com ROLLBACK
```sql
-- No SQL Editor do Supabase
BEGIN;
  CREATE OR REPLACE FUNCTION process_engagement_v2()...

  -- Testar
  SELECT process_engagement_v2(123);

  -- Ver resultado
  SELECT * FROM messages WHERE ...;

ROLLBACK; -- Desfaz tudo!
```

### 3. Aplicar de Verdade
```sql
-- Se funcionou no teste
CREATE OR REPLACE FUNCTION process_engagement()...
```

### 4. Sincronizar com Git
```bash
npx supabase db pull
git add supabase/
git commit -m "db: função process_engagement testada"
git push
```

## 🚨 Regra de Ouro

**SEMPRE teste com ROLLBACK primeiro em produção!**

Isso é mais seguro que branches porque:
1. Testa com dados reais
2. Não custa nada
3. Rollback garante que não quebra nada
4. Git guarda histórico se precisar voltar