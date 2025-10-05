# 📋 TESTE COMPLETO DE ONBOARDING E PAGAMENTOS - Liftlio

**Criado em**: 04/10/2025
**Objetivo**: Validar fluxo completo de novos usuários (signup → pagamento → dashboard)
**Status**: 🟢 EM ANDAMENTO

---

## 🎯 NOVA TAREFA: Sistema de Reset de Password

### Objetivo
Implementar fluxo completo de recuperação de senha com:
- Página de solicitação de reset
- Template de email na tabela `email_templates`
- Edge Function global para envio de emails
- Página de confirmação de reset

**Status**: 🔴 NÃO INICIADO

### Tarefas
- [ ] Criar página `/reset-password` no frontend
- [ ] Criar template de email na tabela `email_templates` do Supabase
- [ ] Configurar Edge Function de envio de email (usar função global existente)
- [ ] Criar página de confirmação `/reset-password/confirm`
- [ ] Testar fluxo completo: solicitar → receber email → resetar → login

**Observação**: JAMAIS modificar Edge Functions de email já existentes. Usar apenas a função global de envio.

---

## 🚨 BUGS CRÍTICOS A CORRIGIR

### BUG #1: Autenticação por Email Quebrada ✅ RESOLVIDO

**Erro Anterior**:
```
AuthApiError: Database error saving new user
ERROR: function gen_random_bytes(integer) does not exist (SQLSTATE 42883)
```

**Solução Aplicada**: ✅ Corrigido via Supabase Dashboard
- Configuração de extensões ajustada
- Search_path do schema auth corrigido

**Validação**:
- [x] ✅ Criar conta por email em localhost → **FUNCIONOU**
- [x] ✅ Erro 500 desapareceu → **CONFIRMADO**
- [x] ✅ Usuário criado no Supabase → **VERIFICADO**
- [ ] Testar em produção também → **PENDENTE**

**Testado em**: 04/10/2025 às 23:45 UTC
**Conta teste criada**: teste.liftlio.2025@gmail.com

---

### BUG #2: Campo Mentions NULL Após Pagamento ⚠️

**Problema**:
```sql
-- Esperado: Mentions = 210 (Growth Plan)
-- Atual: Mentions = NULL
```

**Impacto**:
- Dashboard mostra "0/210" mentions
- Usuário pode não conseguir usar o sistema
- Dados inconsistentes

**Investigação Necessária**:
- [ ] Verificar logs da Edge Function `create-checkout`
  ```bash
  # No Supabase Dashboard → Edge Functions → Logs
  # Procurar por erros ao atualizar campo Mentions
  ```

- [ ] Testar update manual no Supabase
  ```sql
  -- Verificar se consegue atualizar manualmente
  UPDATE customers
  SET "Mentions" = 210
  WHERE id = 21;

  -- Ver se persiste
  SELECT id, "Mentions" FROM customers WHERE id = 21;
  ```

- [ ] Revisar código da Edge Function `create-checkout`
  - [ ] Verificar se `mentionsToAdd` está sendo calculado corretamente
  - [ ] Adicionar logs antes/depois do update
  - [ ] Verificar se há erro sendo silenciado

**Correção Provável**:
- [ ] Adicionar error handling robusto
  ```typescript
  // Em create-checkout Edge Function
  const { data: updateResult, error: mentionsError } = await supabase
    .from('customers')
    .update({ Mentions: mentionsToAdd })
    .eq('id', savedCard.customer_id)
    .select();

  if (mentionsError) {
    console.error('Erro ao atualizar mentions:', mentionsError);
    // NÃO deixar falhar silenciosamente
    throw new Error(`Failed to credit mentions: ${mentionsError.message}`);
  }

  console.log('Mentions credited:', updateResult);
  ```

- [ ] Considerar DEFAULT value na coluna
  ```sql
  -- Migration para adicionar DEFAULT
  ALTER TABLE customers
  ALTER COLUMN "Mentions" SET DEFAULT 0;
  ```

**Validação**:
- [ ] Fazer novo pagamento teste
- [ ] Verificar campo Mentions no Supabase imediatamente após
- [ ] Confirmar que mentions aparecem no dashboard

---

## 🧪 TESTE COMPLETO DE PAGAMENTO LOCAL

### Pré-requisitos
- [ ] Servidor de desenvolvimento rodando (`npm start`)
- [ ] Navegador MCP Playwright configurado
- [ ] Conta Google disponível para OAuth (ou email após corrigir Bug #1)
- [ ] Cartão de teste Square disponível

### Dados de Teste

**Cartões de Teste Square (Sandbox)**:
```
Aprovado:
- Número: 4111 1111 1111 1111
- CVV: 111
- Data: Qualquer futura (ex: 12/2026)
- ZIP: 12345

Recusado (para teste de erro):
- Número: 4000 0000 0000 0002
- CVV: 111
- Data: Qualquer futura
```

**Planos Disponíveis**:
- Starter: $49/mo - 75 mentions
- Growth: $99/mo - 200 mentions (Mais Popular)
- Scale: $199/mo - 450 mentions

---

### FASE 1: Criação de Conta ✅

- [x] **1.1** Navegar para http://localhost:3000
- [x] **1.2** Clicar em "Sign In"
- [x] **1.3** Escolher método de autenticação

**OPÇÃO A: OAuth Google** (Funciona)
- [x] **1.4a** Clicar em "Continue with Google"
- [x] **1.5a** Autorizar acesso
- [x] **1.6a** Verificar redirecionamento para dashboard
- [x] **1.7a** Confirmar nome/email no canto superior direito

**OPÇÃO B: Email/Password** (Quebrado - Bug #1)
- [ ] **1.4b** Clicar em "Sign in with Email"
- [ ] **1.5b** Clicar em "Don't have an account? Sign up"
- [ ] **1.6b** Preencher:
  - Email: `teste.liftlio.2025@gmail.com`
  - Password: `TesteLiftlio2025!`
  - Confirm Password: `TesteLiftlio2025!`
- [ ] **1.7b** Clicar em "Create Account"
- [ ] **1.8b** Verificar se conta foi criada sem erro 500
- [ ] **1.9b** Confirmar redirecionamento para dashboard

**Validação Fase 1**:
- [ ] Usuário autenticado visível no canto superior direito
- [ ] URL em `/dashboard` ou `/overview`
- [ ] Sem mensagens de erro no console

---

### FASE 2: Navegação para Checkout

- [ ] **2.1** No dashboard, clicar em "Billing" no menu lateral
- [ ] **2.2** Verificar se página Billing carrega
- [ ] **2.3** Verificar se mostra "No active subscription" ou similar
- [ ] **2.4** Clicar em botão "Subscribe" ou "Choose Plan"
- [ ] **2.5** Confirmar redirecionamento para `/checkout`

**Validação Fase 2**:
- [ ] Página de checkout carrega os 3 planos
- [ ] Plano "Growth" marcado como "Most Popular"
- [ ] Preços exibidos corretamente ($49, $99, $199)

---

### FASE 3: Seleção de Plano e Preenchimento de Cartão

- [ ] **3.1** Selecionar plano desejado (sugestão: **Growth - $99/mo**)
- [ ] **3.2** Verificar que "summary" atualiza com:
  - Plan: Growth
  - Amount: $99.00
  - Next Billing: Data 30 dias no futuro
  - Features listadas

**Preenchimento do Cartão**:
- [ ] **3.3** Preencher Card Number: `4111 1111 1111 1111`
- [ ] **3.4** Preencher Expiration: `12/26`
- [ ] **3.5** Preencher CVV: `111`
- [ ] **3.6** Preencher Postal Code: `12345`

**Validação Fase 3**:
- [ ] Formulário aceita todos os campos
- [ ] Sem erros de validação
- [ ] Botão "Subscribe Now" fica habilitado

---

### FASE 4: Processamento do Pagamento

- [ ] **4.1** Clicar em "Subscribe Now"
- [ ] **4.2** Aguardar processamento (até 10 segundos)
- [ ] **4.3** Observar console do navegador para logs:
  ```
  Esperado:
  - "Tokenizing card..."
  - "Creating subscription..."
  - "Processing payment..."
  - "Subscription created successfully"
  ```

**Validação Fase 4**:
- [ ] Modal de sucesso aparece
- [ ] Sem erro de rate limit (429)
- [ ] Sem erro de servidor (500)
- [ ] Sem "Database error"

---

### FASE 5: Verificação no Supabase (DADOS)

**Abrir Supabase Dashboard → Table Editor**

**5.1 Tabela `customers`**:
- [ ] Verificar novo registro criado
- [ ] Conferir campos:
  ```sql
  SELECT
    id,
    email,
    "Mentions",  -- ⚠️ DEVE SER 200 para Growth (Bug #2)
    created_at
  FROM customers
  WHERE email = 'seu_email_teste@gmail.com'
  ORDER BY created_at DESC
  LIMIT 1;
  ```
- [ ] ✅ Mentions = 200 (ou NULL se bug persistir)

**5.2 Tabela `cards`**:
- [ ] Verificar cartão salvo
  ```sql
  SELECT
    id,
    customer_id,
    last_4,
    card_brand,
    exp_month,
    exp_year,
    square_card_id
  FROM cards
  WHERE customer_id = (
    SELECT id FROM customers
    WHERE email = 'seu_email_teste@gmail.com'
  )
  ORDER BY created_at DESC
  LIMIT 1;
  ```
- [ ] ✅ last_4 = "1111"
- [ ] ✅ card_brand = "VISA"
- [ ] ✅ square_card_id presente

**5.3 Tabela `subscriptions`**:
- [ ] Verificar assinatura criada
  ```sql
  SELECT
    id,
    customer_id,
    plan_name,
    status,
    base_amount,
    next_billing_date,
    is_production,
    created_at
  FROM subscriptions
  WHERE customer_id = (
    SELECT id FROM customers
    WHERE email = 'seu_email_teste@gmail.com'
  )
  ORDER BY created_at DESC
  LIMIT 1;
  ```
- [ ] ✅ plan_name = "Growth"
- [ ] ✅ status = "active"
- [ ] ✅ base_amount = 9900 ($99.00)
- [ ] ✅ is_production = FALSE (localhost)
- [ ] ✅ next_billing_date = ~30 dias futuro

**5.4 Tabela `payments`**:
- [ ] Verificar pagamento registrado
  ```sql
  SELECT
    id,
    subscription_id,
    amount,
    status,
    square_payment_id,
    items,
    created_at
  FROM payments
  WHERE subscription_id = (
    SELECT id FROM subscriptions
    WHERE customer_id = (
      SELECT id FROM customers
      WHERE email = 'seu_email_teste@gmail.com'
    )
    ORDER BY created_at DESC
    LIMIT 1
  )
  ORDER BY created_at DESC
  LIMIT 1;
  ```
- [ ] ✅ amount = 9900
- [ ] ✅ status = "completed"
- [ ] ✅ square_payment_id começa com "TEST_"
- [ ] ✅ items contém "Growth Plan"

---

### FASE 6: Verificação na Interface (UI)

**Voltar para o navegador - Página Billing**:

- [ ] **6.1** Navegar para `/billing`
- [ ] **6.2** Verificar card "Subscription Plan":
  - Badge: ✅ Active
  - Plan: Growth - $99/mo
  - Mentions Available: **⚠️ 0/200** (Bug #2) ou **✅ 200/200**
  - Next Billing Date: Data correta (~30 dias)
  - Environment: Development

- [ ] **6.3** Verificar seção "Payment Methods":
  - Card: VISA •••• 1111
  - Expires: 12/2026
  - Badge: Default

- [ ] **6.4** Botões visíveis:
  - "Upgrade Plan" (habilitado)
  - "Cancel Subscription" (habilitado)

**Validação Fase 6**:
- [ ] Todos os dados correspondem ao pagamento feito
- [ ] Sem inconsistências entre Supabase e UI

---

### FASE 7: Teste de Cancelamento (Opcional)

**⚠️ IMPORTANTE: Só fazer se quiser testar cancelamento**

- [ ] **7.1** Clicar em "Cancel Subscription"
- [ ] **7.2** Confirmar modal de cancelamento
- [ ] **7.3** Verificar que status muda para "cancelled"
- [ ] **7.4** Conferir no Supabase:
  ```sql
  SELECT status, cancelled_at
  FROM subscriptions
  WHERE id = [subscription_id];
  ```
- [ ] ✅ status = "cancelled"
- [ ] ✅ cancelled_at = timestamp atual

---

## 🔍 LOGS E DEBUGGING

### Logs Importantes a Verificar

**Console do Navegador**:
```javascript
// Procurar por:
- "Tokenizing card..."
- "Card tokenized:"
- "Creating subscription..."
- "Subscription created:"
- "Payment processed:"
- Erros em vermelho
```

**Supabase Edge Functions Logs**:
```bash
# Ir em Supabase Dashboard → Edge Functions → create-checkout → Logs
# Procurar por:
- Requisições recentes
- Status codes (200, 400, 500)
- Erros ao atualizar Mentions
- Tempo de execução
```

**Network Tab (DevTools)**:
- [ ] Verificar requisição para `/functions/v1/create-checkout`
- [ ] Status: 200 OK
- [ ] Response body contém `success: true`
- [ ] Tempo de resposta < 10s

---

## 📊 CRITÉRIOS DE SUCESSO

### ✅ Teste Passou se:
1. Conta criada sem erros (OAuth ou Email)
2. Checkout completado sem erro 429/500
3. Todos os registros criados no Supabase:
   - Customer
   - Card
   - Subscription (status: active)
   - Payment (status: completed)
4. UI mostra assinatura ativa corretamente
5. ⚠️ Mentions creditados (ou documentado Bug #2)

### ❌ Teste Falhou se:
- Erro 500 ao criar conta
- Erro 429 (rate limit) no checkout
- Pagamento não registrado no Supabase
- Campo Mentions não atualizado
- UI não reflete dados do banco

---

## 🚀 PRÓXIMOS PASSOS APÓS TESTES

### Se Testes Passarem:
- [ ] Repetir teste em ambiente de staging
- [ ] Testar com cartão de produção (valor real)
- [ ] Validar renovação automática após 30 dias
- [ ] Testar upgrade de plano
- [ ] Testar downgrade de plano

### Se Testes Falharem:
- [ ] Documentar erro específico encontrado
- [ ] Adicionar logs extras na Edge Function
- [ ] Verificar permissões no Supabase
- [ ] Consultar docs do Square sobre sandbox
- [ ] Abrir issue no GitHub (se necessário)

---

## 📝 NOTAS ADICIONAIS

### Diferenças Development vs Production

| Item | Development | Production |
|------|-------------|------------|
| Square API | Sandbox | Production |
| Payment IDs | `TEST_xxx` | `xxx` |
| `is_production` | `false` | `true` |
| Renovação | Manual | Automática |
| Valor cobrado | $0 (teste) | Valor real |

### Contatos de Suporte

- **Square Support**: https://squareup.com/help
- **Supabase Support**: https://supabase.com/support
- **Liftlio Docs**: `/project-docs/`

---

## ✅ CHECKLIST FINAL

Antes de considerar PRONTO PARA PRODUÇÃO:

- [ ] Bug #1 (Auth Email) corrigido e testado
- [ ] Bug #2 (Mentions NULL) corrigido e testado
- [ ] Teste completo de pagamento passou 100%
- [ ] Dados consistentes entre Supabase e UI
- [ ] Teste em staging com cartão real concluído
- [ ] Documentação atualizada
- [ ] Monitoramento de erros configurado
- [ ] Plano de rollback definido

**Status Atual**: 🔴 NÃO PRONTO (2 bugs críticos pendentes)

---

**Última Atualização**: 04/10/2025
**Responsável**: Claude Code + Valdair
**Prioridade**: 🔴 CRÍTICA
