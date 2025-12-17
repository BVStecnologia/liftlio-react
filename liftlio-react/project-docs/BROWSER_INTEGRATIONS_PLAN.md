# Browser Integrations - Plano de Implementacao

## Resumo

Migrar o sistema de integracoes de OAuth2 via API para login real via Browser Agent.
O usuario nao tera acesso a pagina "Computer" - toda interacao sera via pagina de Integracoes.

## Arquitetura Atual vs Nova

### Sistema Atual (OAuth2)
```
Usuario -> Clica Connect -> Redirect Google OAuth -> Tokens salvos -> API calls
```

### Sistema Novo (Browser Agent)
```
Usuario -> Clica Connect -> Formulario login -> Agente faz login -> Cookies salvos -> Acesso real
```

---

## Fluxo de Login por Plataforma

### YouTube / Google
```
Opcoes de login:
1. "Entrar com Google existente" (se ja tem conta Google logada no projeto)
2. Email + Senha

Fluxo:
1. Usuario escolhe opcao
2. Se opcao 1: Agente usa sessao Google existente
3. Se opcao 2: Agente navega para accounts.google.com
4. Digita email -> Next
5. Digita senha -> Next
6. Se 2FA: Agente responde "Preciso do codigo de verificacao do seu celular/email"
7. Usuario digita codigo no chat
8. Agente completa login
9. Navega para youtube.com para confirmar
10. Marca integracao como conectada
```

### Reddit
```
Opcoes de login:
1. Email + Senha
2. "Continue with Google"

Fluxo:
1. Agente navega para reddit.com/login
2. Se Google: clica no botao, usa sessao Google
3. Se email/senha: preenche formulario
4. Se 2FA: pede codigo
5. Confirma login
6. Marca como conectado
```

### LinkedIn
```
Opcoes de login:
1. Email + Senha
2. "Sign in with Google"

Fluxo:
1. Agente navega para linkedin.com/login
2. Preenche email e senha
3. Se verificacao: pede codigo
4. Confirma login
5. Marca como conectado
```

### Facebook
```
Opcoes de login:
1. Email + Senha

Fluxo:
1. Agente navega para facebook.com/login
2. Preenche email e senha
3. Se 2FA: pede codigo
4. Se "dispositivo nao reconhecido": pede confirmacao
5. Confirma login
6. Marca como conectado
```

### Twitter/X
```
Opcoes de login:
1. Email/Usuario + Senha
2. "Sign in with Google"

Fluxo:
1. Agente navega para twitter.com/login
2. Digita email/usuario
3. Digita senha
4. Se 2FA: pede codigo
5. Confirma login
6. Marca como conectado
```

### Instagram
```
Opcoes de login:
1. Email/Usuario + Senha
2. "Log in with Facebook"

Fluxo:
1. Agente navega para instagram.com/accounts/login
2. Preenche usuario e senha
3. Se 2FA: pede codigo
4. Se "salvar informacoes de login": aceita
5. Confirma login
6. Marca como conectado
```

---

## Mudancas no Banco de Dados

### Tabela: Integracoes (alteracoes)

```sql
-- Novos campos
ALTER TABLE "Integracoes" ADD COLUMN IF NOT EXISTS
  integration_method TEXT DEFAULT 'oauth'; -- 'oauth' | 'browser'

ALTER TABLE "Integracoes" ADD COLUMN IF NOT EXISTS
  browser_login_email TEXT; -- Email usado no login via browser

ALTER TABLE "Integracoes" ADD COLUMN IF NOT EXISTS
  browser_connected_at TIMESTAMPTZ; -- Quando conectou via browser

ALTER TABLE "Integracoes" ADD COLUMN IF NOT EXISTS
  browser_last_verified TIMESTAMPTZ; -- Ultima verificacao de sessao

ALTER TABLE "Integracoes" ADD COLUMN IF NOT EXISTS
  browser_session_valid BOOLEAN DEFAULT false; -- Se sessao ainda valida
```

### Tabela: browser_tasks (usa existente)

A tabela `browser_tasks` ja existe e sera usada para:
- Enviar comandos de login
- Receber respostas do agente (pedido de 2FA, erros, sucesso)
- Chat interativo com usuario

---

## Mudancas no Frontend

### Pagina: Integrations.tsx

#### Novo Modal de Login

```tsx
// Substituir modal OAuth por modal de login via browser

interface LoginFormData {
  platform: 'youtube' | 'reddit' | 'linkedin' | 'facebook' | 'twitter' | 'instagram';
  loginMethod: 'email' | 'google' | 'facebook';
  email?: string;
  password?: string;
}

// Estados do fluxo
type LoginFlowState =
  | 'idle'           // Nada acontecendo
  | 'form'           // Mostrando formulario
  | 'connecting'     // Agente fazendo login
  | 'need_2fa'       // Agente pediu codigo 2FA
  | 'need_confirm'   // Agente pediu confirmacao
  | 'success'        // Login completo
  | 'error';         // Erro no login
```

#### Componentes Novos

1. **LoginFormModal** - Formulario de email/senha
2. **LoginMethodSelector** - Escolher metodo (email, Google, Facebook)
3. **TwoFactorInput** - Input para codigo 2FA
4. **LoginProgress** - Status do login em andamento
5. **ChatBubble** - Mensagens do agente (pedidos, confirmacoes)

---

## Mudancas no Backend (Orchestrator)

### Novo Endpoint: POST /containers/:projectId/integration-login

```javascript
app.post('/containers/:projectId/integration-login', async (req, res) => {
  const { projectId } = req.params;
  const { platform, loginMethod, email, password } = req.body;

  // 1. Verificar se container existe, se nao criar
  // 2. Criar task especial de login
  // 3. Retornar taskId para frontend acompanhar
});
```

### Novo Endpoint: POST /containers/:projectId/integration-2fa

```javascript
app.post('/containers/:projectId/integration-2fa', async (req, res) => {
  const { projectId } = req.params;
  const { taskId, code } = req.body;

  // 1. Enviar codigo 2FA para task em andamento
  // 2. Agente continua login
});
```

### Novo Endpoint: GET /containers/:projectId/integration-status

```javascript
app.get('/containers/:projectId/integration-status', async (req, res) => {
  const { projectId } = req.params;
  const { platform } = req.query;

  // 1. Verificar se sessao da plataforma ainda valida
  // 2. Retornar status
});
```

---

## Mudancas no Agente (server-vnc.js)

### Nova Funcao: handleIntegrationLogin

```javascript
async function handleIntegrationLogin(platform, loginMethod, credentials) {
  // 1. Navegar para pagina de login da plataforma
  // 2. Executar fluxo de login baseado no metodo
  // 3. Detectar necessidade de 2FA
  // 4. Retornar status (success, need_2fa, error)
}
```

### Nova Funcao: verifyIntegrationSession

```javascript
async function verifyIntegrationSession(platform) {
  // 1. Navegar para pagina da plataforma
  // 2. Verificar se esta logado (procurar avatar, botao logout, etc)
  // 3. Retornar boolean
}
```

---

## Fluxo Completo do Usuario

```
1. Usuario vai em /integrations
2. Clica "Connect" no YouTube (por exemplo)
3. Modal aparece com opcoes:
   [ ] Entrar com Google (se ja tem conta Google no projeto)
   [ ] Email e Senha

4. Se escolher Email/Senha:
   - Digita email
   - Digita senha
   - Clica "Conectar"

5. Frontend envia para orchestrator:
   POST /containers/117/integration-login
   { platform: 'youtube', loginMethod: 'email', email: '...', password: '...' }

6. Orchestrator:
   - Verifica/cria container
   - Cria task especial na browser_tasks
   - Retorna taskId

7. Agente (no container):
   - Recebe task
   - Navega para accounts.google.com
   - Preenche email -> Next
   - Preenche senha -> Next

8. Se Google pedir 2FA:
   - Agente atualiza task: status='need_2fa', message='Digite o codigo...'
   - Frontend detecta via SSE/polling
   - Mostra input para usuario digitar codigo
   - Usuario digita "123456"
   - Frontend envia: POST /containers/117/integration-2fa { taskId, code: '123456' }
   - Agente continua

9. Login completo:
   - Agente atualiza task: status='completed'
   - Agente verifica se esta no YouTube
   - Atualiza tabela Integracoes: ativo=true, integration_method='browser'
   - Cookies salvos automaticamente (ja temos isso)

10. Frontend:
    - Detecta sucesso
    - Fecha modal
    - Mostra "YouTube Conectado" com badge verde
```

---

## Seguranca

### Credenciais
- Senha NUNCA salva no banco
- Senha enviada via HTTPS
- Agente usa senha apenas para digitar no navegador
- Apos login, sessao mantida via cookies (ja implementado)

### Verificacao Periodica
- CRON verifica sessoes a cada X horas
- Se sessao expirar, marca integracao como "needs_reconnect"
- Usuario ve aviso para reconectar

---

## Fases de Implementacao

### Fase 1: YouTube/Google (MVP)
- [ ] Modificar modal de integracao
- [ ] Criar formulario de login
- [ ] Criar endpoint integration-login
- [ ] Implementar fluxo no agente
- [ ] Implementar 2FA handling
- [ ] Testar fluxo completo

### Fase 2: Reddit
- [ ] Adicionar opcao "Continue with Google"
- [ ] Implementar fluxo de login Reddit
- [ ] Testar

### Fase 3: LinkedIn
- [ ] Implementar fluxo de login LinkedIn
- [ ] Testar

### Fase 4: Facebook
- [ ] Implementar fluxo de login Facebook
- [ ] Testar

### Fase 5: Twitter/X
- [ ] Implementar fluxo de login Twitter
- [ ] Testar

### Fase 6: Instagram
- [ ] Adicionar opcao "Log in with Facebook"
- [ ] Implementar fluxo de login Instagram
- [ ] Testar

---

## Estimativa de Complexidade

| Plataforma | Complexidade | Motivo |
|------------|--------------|--------|
| YouTube/Google | Media | 2FA variado (SMS, app, email) |
| Reddit | Baixa | Login simples |
| LinkedIn | Media | Verificacoes de seguranca |
| Facebook | Alta | Muitas verificacoes, dispositivo |
| Twitter/X | Media | 2FA, verificacao email |
| Instagram | Media | Vinculado ao Facebook |

---

## Proximos Passos

1. Aprovar este plano
2. Comecar pela Fase 1 (YouTube/Google)
3. Criar migration para novos campos
4. Modificar Integrations.tsx
5. Criar endpoints no orchestrator
6. Implementar funcoes no agente
7. Testar fluxo completo
8. Iterar e melhorar
