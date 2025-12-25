# CONTINUAR: Sistema de Login Browser

> **Data:** 2025-12-24
> **Branch:** feature/browser-integrations
> **Plano completo:** `.claude/plans/wondrous-juggling-curry.md`

---

## CONTEXTO COMPLETO

Estamos implementando um sistema de login de browser com:
1. **UX Simplificada** - Google primeiro, depois checkboxes para outros serviços
2. **Prompts no Banco** - Fácil de atualizar sem deploy
3. **Frontend faz toda lógica** - NÃO modificar server-vnc.js

---

## O QUE JÁ FOI FEITO

### Banco de Dados (Supabase LIVE)
- [x] Tabela `browser_platforms` criada com prompts
- [x] Tabela `browser_logins` criada para credenciais
- [x] Seed data: Google, YouTube, Reddit com prompts completos

```sql
-- Verificar dados:
SELECT platform_name, LENGTH(login_prompt) as prompt_len
FROM browser_platforms;
-- Resultado: google (1277), youtube (628), reddit (718)
```

### Frontend
- [x] Arquivo: `liftlio-react/src/pages/BrowserIntegrations.tsx` (CRIADO)
- [x] Rota: `/browser-integrations` configurada em App.tsx
- [x] Menu: Sidebar atualizado com "Browser Integrations"
- [x] `BrowserServices.tsx` antigo foi DELETADO

### Documentação
- [x] `Servidor/Broser.mcp/CEREBRO.md` atualizado (seção 0)
- [x] Plano em `.claude/plans/wondrous-juggling-curry.md`

---

## O QUE FALTA FAZER

### Fase 5: Testes (PENDENTE)
- [ ] 5.1. Testar login Google com 2FA
- [ ] 5.2. Testar login Reddit via Google SSO
- [ ] 5.3. Testar reconexão (sessão expirada)
- [ ] 5.4. Testar erros (credenciais erradas)

### Fase 6: Cleanup
- [ ] 6.3. Migrar dados existentes de `Projeto.browser_platforms` (opcional)

---

## ARQUITETURA

```
Frontend (BrowserIntegrations.tsx)
    │
    ├── 1. Usuário digita email/senha
    │
    ├── 2. Salva credenciais em browser_logins (Supabase)
    │
    ├── 3. Busca prompt de browser_platforms
    │
    ├── 4. Substitui {{email}} e {{password}} no prompt
    │
    └── 5. Envia task completo para agente (mesmo endpoint da página Computer)
            │
            └── POST http://173.249.22.2:10117/agent/task
                {
                  "task": "prompt completo com credenciais"
                }
```

---

## CÓDIGOS DE RESPOSTA DO AGENTE

| Código | Significado |
|--------|-------------|
| `LOGIN_SUCCESS` | Login OK |
| `ALREADY_LOGGED` | Já estava logado |
| `WAITING_2FA` | Aguardando aprovação no telefone |
| `WAITING_CODE` | Precisa digitar código |
| `INVALID_CREDENTIALS` | Email/senha errados |
| `CAPTCHA_FAILED` | Não conseguiu resolver CAPTCHA |
| `ACCOUNT_LOCKED` | Conta bloqueada |
| `ERROR: <msg>` | Erro genérico |

---

## ARQUIVOS IMPORTANTES

| Arquivo | Descrição |
|---------|-----------|
| `liftlio-react/src/pages/BrowserIntegrations.tsx` | Nova página de login |
| `Servidor/Broser.mcp/CEREBRO.md` | Documentação do sistema browser |
| `.claude/plans/wondrous-juggling-curry.md` | Plano detalhado |

---

## DECISÕES TOMADAS

1. **Senhas**: Texto simples agora, Vault depois
2. **Proxy**: Global (porta 10000 sticky)
3. **Backend**: NÃO modificar server-vnc.js - funciona bem para Computer

---

## PARA TESTAR

1. Iniciar app: `cd liftlio-react && npm start`
2. Acessar: http://localhost:3000/browser-integrations
3. Preencher email/senha Google
4. Clicar "Connect Google"
5. Verificar resposta do agente

**IMPORTANTE:** Container do browser precisa estar rodando no VPS (173.249.22.2)

---

## COMMIT PENDENTE

O código está pronto mas NÃO foi commitado (usuário não autorizou).

Para commitar:
```bash
git add .
git commit -m "feat(browser): new login system with database-driven prompts"
git push origin feature/browser-integrations
```

---

## PROMPT PARA CONTINUAR

Cole isso em uma nova conversa:

```
Continuar implementação do sistema de login do browser.

Contexto: `.claude/CONTINUE_BROWSER_INTEGRATIONS.md`
Plano: `.claude/plans/wondrous-juggling-curry.md`

Estado atual:
- Tabelas criadas no Supabase (browser_platforms, browser_logins)
- Frontend BrowserIntegrations.tsx criado
- Rotas configuradas

Próximo passo: Testar o login com o agente real
```
