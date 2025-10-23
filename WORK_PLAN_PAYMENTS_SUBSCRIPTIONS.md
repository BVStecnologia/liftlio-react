# 📋 PLANO DE TRABALHO: Sistema de Pagamentos e Distribuição de Postagens

**Data de Criação**: 21 de Outubro de 2025
**Status**: Em Implementação - Fase 1 Concluída ✅
**Última Atualização**: 23 de Outubro de 2025
**Prioridade**: Alta

---

## 🎯 OBJETIVO GERAL

Implementar sistema completo de gestão de subscriptions com:
1. Distribuição inteligente de postagens por projeto
2. Desativação automática de projetos sem pagamento
3. Cobrança automatizada de assinaturas
4. Integração com sistema anti-spam existente

---

## 📊 ARQUIVOS CRIADOS/MODIFICADOS

### ✅ Migration (Nova)
- **Arquivo**: `liftlio-react/supabase/supabase/migrations/20251021181315_add_postagens_dia_to_projeto.sql`
- **O que faz**: Adiciona campo `Postagens_dia` à tabela `Projeto`
- **Propósito**: Permitir distribuição personalizada de mentions por projeto
- **Fórmula**: `Postagens_dia = FLOOR(Mentions do customer / dias do mês)`
- **Status**: ⚠️ NÃO TESTADO

### ✅ Novas Funções SQL

#### 1. `calcular_postagens_dia_projetos()`
- **Arquivo**: `liftlio-react/supabase/functions_backup/SQL_Functions/10_Payments/calcular_postagens_dia_projetos.sql`
- **Execução**: Cron mensal (dia 1 às 00:00 UTC)
- **O que faz**:
  - Calcula `Postagens_dia` para todos projetos ativos
  - Baseado em: `Mentions do customer / dias do mês`
  - Garante mínimo de 1 postagem por dia
- **Retorna**: Tabela com projeto_id, mentions, dias no mês, valor calculado
- **Status**: ⚠️ NÃO DEPLOYADO

**Exemplo de cálculo**:
```
Mês com 30 dias:
- Customer com 300 Mentions → 300/30 = 10 postagens/dia
- Customer com 150 Mentions → 150/30 = 5 postagens/dia
- Customer com 25 Mentions  → 25/30 = 0.83 → FLOOR = 0 → MIN = 1 postagem/dia
```

#### 2. `desativar_projetos_sem_subscription()`
- **Arquivo**: `liftlio-react/supabase/functions_backup/SQL_Functions/10_Payments/desativar_projetos_sem_subscription.sql`
- **Execução**: Cron diário às 09:00 UTC (ANTES de check_subscriptions às 10:00)
- **O que faz**:
  - Desativa projetos YouTube quando subscription expira após grace period (15 dias)
  - Verifica status: payment_failed, cancelled, suspended
  - Define `Youtube Active = FALSE`
- **Retorna**: total_desativados, array de IDs, mensagem de status
- **Status**: ⚠️ NÃO DEPLOYADO

### ⚙️ Funções Modificadas

#### 3. `cobrar_assinaturas_hoje()`
- **Arquivo**: `liftlio-react/supabase/functions_backup/SQL_Functions/10_Payments/cobrar_assinaturas_hoje.sql`
- **Última modificação**: 21 Out 18:07
- **Status**: ⚠️ MUDANÇAS NÃO TESTADAS

#### 4. `check_and_update_projects_status()`
- **Arquivo**: `liftlio-react/supabase/functions_backup/SQL_Functions/06_Projetos/check_and_update_projects_status.sql`
- **Nova lógica**: Integração com sistema anti-spam (can_comment_on_channel)
- **Status**: ⚠️ MUDANÇAS NÃO TESTADAS

#### 5. `processar_postagens_pendentes()`
- **Arquivo**: `liftlio-react/supabase/functions_backup/SQL_Functions/PIPELINE_PROCESSOS/STATUS_6_POSTAGENS/04_processar_postagens_pendentes.sql`
- **Integração**: Sistema anti-spam
- **Status**: ⚠️ MUDANÇAS NÃO TESTADAS

#### 6. `can_comment_on_channel()`
- **Arquivo**: `liftlio-react/supabase/functions_backup/SQL_Functions/00_Monitoramento_YouTube/08_Anti_Spam_Sistema/01_ETAPA_1/can_comment_on_channel.sql`
- **Status**: ⚠️ MUDANÇAS NÃO TESTADAS

#### 7. `trigger_postar_comentario_youtube()`
- **Arquivo**: `liftlio-react/supabase/functions_backup/SQL_Functions/01_YouTube/trigger_postar_comentario_youtube.sql`
- **Status**: ⚠️ MUDANÇAS NÃO TESTADAS

### ✅ IMPLEMENTAÇÕES ADICIONAIS (23/10/2025)

#### 8. `agendar_postagens_diarias()` - MODIFICADA E TESTADA ✅
- **Arquivo**: `liftlio-react/supabase/functions_backup/SQL_Functions/PIPELINE_PROCESSOS/STATUS_6_POSTAGENS/02_agendar_postagens_diarias.sql`
- **Modificação**: Adicionada verificação de Mentions ANTES de agendar postagens
- **O que faz**:
  - Verifica se customer tem Mentions disponíveis
  - Se Mentions <= 0 → NÃO agenda nada (economiza recursos)
  - Se Mentions < posts_por_dia → ajusta quantidade automaticamente
  - Logs detalhados para debugging
- **Status**: ✅ IMPLEMENTADA, TESTADA E DEPLOYADA
- **Testado em**: Projeto 117 (210 Mentions disponíveis)
- **Commit**: 69dd3a6 - "feat: Add Mentions verification to agendar_postagens_diarias()"
- **Data**: 23/10/2025

**Benefícios imediatos**:
- ✅ Previne agendamento sem quota
- ✅ Economiza processamento de IA (Claude + OpenAI)
- ✅ Evita postagens "pending" inúteis
- ✅ Melhor gestão de recursos

---

## 🚨 STATUS ATUAL DO TRABALHO

### ✅ FASE 1 CONCLUÍDA (23/10/2025)
- **agendar_postagens_diarias()** modificada, testada e deployada ✅
- Verificação de Mentions implementada ✅
- Testado em produção (projeto 117) ✅
- Commit salvo no GitHub ✅

### ⚠️ PENDENTE DE IMPLEMENTAÇÃO
- Migration criada mas NÃO aplicada
- Funções SQL novas criadas mas NÃO deployadas no Supabase
- Funções modificadas antigas não foram validadas
- Testes pendentes para funções novas

### 📋 PRÓXIMOS PASSOS NECESSÁRIOS

#### ✅ CONCLUÍDO: Verificação de Mentions em agendar_postagens_diarias()
- Implementado e testado com sucesso
- Sistema já está protegido contra agendamento sem quota

#### 1. PRÓXIMO: TESTAR MIGRATION (CRÍTICO!)
```sql
-- Rodar na DEV primeiro (project_id: cdnzajygbcujwcaoswpi)
-- Via agente MCP supabase-mcp-expert

-- Verificar se migration funciona:
ALTER TABLE "Projeto" ADD COLUMN IF NOT EXISTS "Postagens_dia" INTEGER DEFAULT 1;
```

#### 2. TESTAR FUNÇÕES NOVAS (DRY RUN)
```sql
-- Teste 1: Ver cálculos SEM aplicar
SELECT
    p.id,
    p."Project name",
    c."Mentions" as mentions_total,
    EXTRACT(day FROM DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::INTEGER as dias_no_mes,
    GREATEST(FLOOR(COALESCE(c."Mentions", 0)::NUMERIC / 30)::INTEGER, 1) as postagens_dia_calculado
FROM "Projeto" p
JOIN customers c ON p."User id" = c.user_id
WHERE p."Youtube Active" = TRUE;

-- Teste 2: Ver projetos que SERIAM desativados
SELECT
    p.id,
    p."Project name",
    s.status,
    s.grace_period_ends,
    CURRENT_DATE - s.grace_period_ends as dias_expirado
FROM "Projeto" p
JOIN customers c ON p."User id" = c.user_id
JOIN subscriptions s ON c.id = s.customer_id
WHERE p."Youtube Active" = TRUE
AND s.grace_period_ends IS NOT NULL
AND s.grace_period_ends < CURRENT_DATE;
```

#### 3. DEPLOY GRADUAL
1. Aplicar migration na DEV
2. Deploy de `calcular_postagens_dia_projetos()` na DEV
3. Testar execução manual
4. Deploy de `desativar_projetos_sem_subscription()` na DEV
5. Testar execução manual
6. Validar integração com funções modificadas
7. Após sucesso na DEV → merge para MAIN (produção)

#### 4. CONFIGURAR CRONS
```sql
-- Cron 1: Calcular postagens mensalmente
-- Nome: calcular_postagens_dia_projetos
-- Schedule: 0 0 1 * * (dia 1 de cada mês às 00:00 UTC)
-- SQL: SELECT calcular_postagens_dia_projetos();

-- Cron 2: Desativar projetos sem subscription
-- Nome: desativar_projetos_sem_subscription
-- Schedule: 0 9 * * * (diário às 09:00 UTC)
-- SQL: SELECT desativar_projetos_sem_subscription();
```

---

## 🎯 BENEFÍCIOS ESPERADOS

### Distribuição Inteligente
- ✅ Cada projeto recebe quota diária baseada em Mentions
- ✅ Prevents overwhelming single customers
- ✅ Fair distribution across all active projects

### Automação de Payments
- ✅ Projetos sem pagamento são desativados automaticamente após grace period
- ✅ Reduz trabalho manual de gerenciamento
- ✅ Clareza para customers sobre status de subscription

### Integração Anti-Spam
- ✅ Sistema considera bloqueios de canais na distribuição
- ✅ Evita desperdício de mentions em canais bloqueados
- ✅ Melhora eficiência geral do sistema

---

## ⚠️ RISCOS E CUIDADOS

### ANTES DE APLICAR EM PRODUÇÃO:
1. ⚠️ **Testar DRY RUN**: Ver o que seria afetado antes de executar
2. ⚠️ **Backup**: Garantir backup recente do banco
3. ⚠️ **DEV First**: SEMPRE testar na branch DEV primeiro
4. ⚠️ **Validar Dados**: Conferir se customers têm Mentions configurados
5. ⚠️ **Grace Period**: Verificar se grace_period_ends está correto em subscriptions

### POSSÍVEIS PROBLEMAS:
- Customers sem Mentions configurados → resultado = 1 postagem/dia (mínimo)
- Projetos sem subscription ativa → serão desativados (intencional)
- Mês com dias diferentes → cálculo se adapta automaticamente ✅

---

## 📝 NOTAS IMPORTANTES

- **Source of truth**: `/liftlio-react/supabase/` (Git tracking completo)
- **Backup histórico**: `/liftlio-react/supabase/functions_backup/` (referência apenas)
- **Agente MCP**: SEMPRE usar DEV primeiro (cdnzajygbcujwcaoswpi)
- **LIVE**: Só recebe mudanças após aprovação manual (suqjifkhmekcdflwowiw)

---

## 🔗 ARQUIVOS RELACIONADOS

- `/liftlio-react/supabase/supabase/migrations/20251021181315_add_postagens_dia_to_projeto.sql`
- `/liftlio-react/supabase/functions_backup/SQL_Functions/10_Payments/calcular_postagens_dia_projetos.sql`
- `/liftlio-react/supabase/functions_backup/SQL_Functions/10_Payments/desativar_projetos_sem_subscription.sql`
- `/liftlio-react/supabase/functions_backup/SQL_Functions/10_Payments/cobrar_assinaturas_hoje.sql`
- `/liftlio-react/supabase/functions_backup/SQL_Functions/06_Projetos/check_and_update_projects_status.sql`

---

**⚠️ LEMBRETE CRÍTICO**: Nenhuma mudança foi aplicada ainda. Tudo precisa ser testado na DEV antes de ir para produção!
