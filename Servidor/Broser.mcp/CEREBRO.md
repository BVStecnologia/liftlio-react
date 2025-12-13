# CEREBRO - Liftlio Browser Agent

> **IMPORTANTE**: Este arquivo e a fonte de verdade. SEMPRE leia antes de trabalhar no projeto.
> **Ultima Atualizacao**: 2025-12-12

---

## 1. ESTADO ATUAL DO SISTEMA

### Container Rodando
```
docker-compose -f claude-code-agent/docker-compose-vnc.yml up -d
```

| Container | Porta | Funcao |
|-----------|-------|--------|
| liftlio-browser-117 | 10117 (API), 16117 (VNC) | Browser + Claude Code |
| claude-token-refresher | - | Renova token OAuth a cada 6h |

### Volumes Docker
- `claude-credentials` - Token OAuth compartilhado
- `claude-config` - Config base (onboarding=true)
- `browser-chrome` - Sessao Chrome persistente (/home/claude/.chrome-persistent)
- `browser-workspace` - Workspace do projeto

### Health Check
```bash
curl http://localhost:10117/health
```

---

## 2. ARQUITETURA

```
                    +---------------------------+
                    |   FRONTEND (React)        |
                    |   /computer page          |
                    +------------+--------------+
                                 |
                                 v
                    +---------------------------+
                    |   CONTAINER liftlio-117   |
                    |   Porta 10117 (API)       |
                    |   Porta 16117 (VNC)       |
                    +---------------------------+
                    |                           |
                    |  +---------------------+  |
                    |  | Chrome Persistente  |  |
                    |  | CDP porta 9222      |  |
                    |  | --user-data-dir     |  |
                    |  +---------------------+  |
                    |            |              |
                    |            v              |
                    |  +---------------------+  |
                    |  | Claude Code Max     |  |
                    |  | --dangerously-skip  |  |
                    |  | Playwright MCP CDP  |  |
                    |  +---------------------+  |
                    |            |              |
                    |            v              |
                    |  +---------------------+  |
                    |  | API Server (10100)  |  |
                    |  | /agent/task         |  |
                    |  | /login/google       |  |
                    |  | /captcha/solve      |  |
                    |  +---------------------+  |
                    +---------------------------+
```

---

## 3. CREDENCIAIS

> **IMPORTANTE**: Credenciais estao em `CREDENTIALS_AND_SERVICES.md` (gitignored)
> NUNCA commitar credenciais no git!

### Servicos Configurados:
- CapMonster (CAPTCHA) - ver CREDENTIALS_AND_SERVICES.md
- Data Impuse (Proxy) - ver CREDENTIALS_AND_SERVICES.md
- Supabase - ver CREDENTIALS_AND_SERVICES.md
- Conta Google Teste - ver CREDENTIALS_AND_SERVICES.md

---

## 4. ENDPOINTS DA API

### Task Execution
```bash
# Executar task com Claude
POST http://localhost:10117/agent/task
Content-Type: application/json
{"task": "Vá para youtube.com e me diga o título do primeiro vídeo"}

# Task rápida (menos iterações)
POST http://localhost:10117/agent/task-fast
```

### Login Google (Direto, sem Claude)
```bash
POST http://localhost:10117/login/google
Content-Type: application/json
{"email": "your-email@gmail.com", "password": "your-password"}
# Usuario aprova 2FA no celular
# CREDENCIAIS REAIS: Ver CREDENTIALS_AND_SERVICES.md
```

### CAPTCHA Solver
```bash
POST http://localhost:10117/captcha/solve
# Tira screenshot, envia para CapMonster, clica nas coordenadas
```

### Sessão
```bash
# Salvar sessão atual
POST http://localhost:10117/session/save

# Restaurar sessão do Supabase
POST http://localhost:10117/session/restore
```

---

## 5. PROBLEMAS CONHECIDOS E SOLUCOES

### Problema: Claude recusa fazer login
- **Causa**: Restricoes de seguranca do Claude Code
- **Solucao**: Usar endpoint `/login/google` que usa CDP diretamente

### Problema: Sessao Google nao persiste entre tasks
- **Causa**: Playwright MCP via CDP cria contexto isolado quando chama `browser.newContext()`
- **Causa 2**: Session cookies (sem `Expires`) nao sao salvos no disco pelo Chrome
- **Solucao Implementada (2025-12-12)**:
  1. `hasValidGoogleSession(cookies)` - Verifica cookies Google (SID, HSID, __Secure-1PSID)
  2. `ensureSessionBeforeTask()` - Restaura sessao do Supabase antes de cada task
  3. `startSessionWatchdog()` - Auto-save sessao a cada 60 segundos
  4. Save automatico apos cada task completada
- **Fluxo**:
  ```
  Task recebida -> ensureSessionBeforeTask() -> executeTask() -> saveSession()
  ```

### Problema: Tasks via UI nao executam
- **Causa**: Container nao faz polling do banco
- **Solucao**: Implementar polling ou webhook Supabase Realtime

### Problema: Cookies de autenticacao nao salvos
- **Causa**: Apenas cookies publicos capturados (NID, AEC)
- **Solucao**: Confiar no Chrome persistente, nao em cookies extraidos

---

## 6. ARQUIVOS IMPORTANTES

```
claude-code-agent/
├── docker-compose-vnc.yml    <- USAR ESTE para subir containers
├── Dockerfile.vnc            <- Imagem do container
├── api/server-vnc.js         <- API server (endpoints)
├── chrome-persistent.sh      <- Script que inicia Chrome
├── supervisord-claude.conf   <- Gerencia processos
├── .env                      <- Variaveis de ambiente
└── refresh_token.py          <- Renova token OAuth
```

---

## 7. COMANDOS ESSENCIAIS

### Subir Sistema
```bash
cd /c/Users/User/Desktop/Liftlio/Servidor/Broser.mcp/claude-code-agent
docker-compose -f docker-compose-vnc.yml up -d
```

### Ver Logs
```bash
docker logs -f liftlio-browser-117
```

### Rebuild
```bash
docker-compose -f docker-compose-vnc.yml up -d --build
```

### Parar
```bash
docker-compose -f docker-compose-vnc.yml down
```

### Verificar Saude
```bash
curl http://localhost:10117/health | jq .
```

### Acessar VNC
```
http://localhost:16117/vnc.html
```

---

## 8. REGRAS PARA NAO PERDER CONTEXTO

### SEMPRE fazer antes de trabalhar:
1. Ler este arquivo CEREBRO.md
2. Verificar containers: `docker ps`
3. Verificar health: `curl localhost:10117/health`

### SEMPRE fazer apos mudancas:
1. Atualizar este CEREBRO.md com o que mudou
2. Atualizar CREDENTIALS_AND_SERVICES.md se credenciais mudaram
3. Commitar mudancas no git

### NUNCA fazer:
1. Criar containers manualmente (usar docker-compose)
2. Mudar portas sem atualizar este arquivo
3. Ignorar erros de health check
4. Esquecer de salvar sessao apos login

---

## 9. HISTORICO DE MUDANCAS

### 2025-12-12 (Tarde)
- [x] **Persistencia de sessao Google implementada**:
  - `hasValidGoogleSession()` - Verifica cookies criticos (SID, HSID, __Secure-1PSID)
  - `ensureSessionBeforeTask()` - Restaura sessao automaticamente antes de cada task
  - `startSessionWatchdog()` - Auto-save a cada 60 segundos
  - Save automatico apos cada task completada
- [x] Container rebuilt com nova logica de sessao

### 2025-12-12 (Manha)
- [x] Containers reorganizados via docker-compose-vnc.yml
- [x] Portas: API 10117, VNC 16117
- [x] CAPTCHA solver integrado (CapMonster)
- [x] Endpoint /login/google para login direto
- [x] Chrome persistente em /home/claude/.chrome-persistent

### 2025-12-11
- [x] Migracao para Claude Code Max (OAuth)
- [x] Token refresher automatico (6h)
- [x] Volume compartilhado de credenciais

### 2025-12-08
- [x] Testes de comentarios YouTube
- [x] Sessao persistente no Supabase

---

## 10. PROXIMOS PASSOS (TODO)

- [ ] Implementar polling de tasks do Supabase no container
- [ ] Botao "Login Google" no frontend
- [x] ~~Verificar sessao antes de cada task~~ (implementado: ensureSessionBeforeTask)
- [x] ~~Testar persistencia de sessao apos rebuild~~ (implementado: watchdog + auto-save)
- [ ] Testar fluxo completo: Login -> Task YouTube -> Reiniciar -> Nova Task

---

*Arquivo consolidado em 2025-12-12. Substitui: PLANO_CLAUDE_CODE_MAX.md, INTEGRATION_GUIDE.md, CEREBRO_BROWSER.md, CEREBRO_TESTE_COMENTARIOS.md*
