# CEREBRO - Liftlio Browser Agent

> **IMPORTANTE**: Este arquivo e a fonte de verdade. SEMPRE leia antes de trabalhar no projeto.
> **Ultima Atualizacao**: 2025-12-20

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

### Problema: Session Watchdog nao salva no Supabase- **Causa**: `.env` define `SUPABASE_ANON_KEY` mas codigo espera `SUPABASE_KEY`- **Sintoma**: Container mostra `SUPABASE_KEY=` vazio, watchdog nao inicia- **Solucao (2025-12-19)**: Adicionar `SUPABASE_KEY` ao `.env` (mesmo valor que ANON_KEY)- **Verificacao**: `docker exec container env | grep SUPABASE_KEY`
### Problema: Token OAuth expira muito rapido
- **Causa**: Access token tem duracao de ~8 horas (28.800 segundos)
- **Causa 2**: Claude Code CLI NAO implementa refresh automatico de forma confiavel
- **Causa 3**: Bug conhecido de "retry storm" pode consumir tokens em 19+ tentativas
- **Solucao**: Ver secao 6 abaixo (OAuth Token Management)

---

## 6. OAUTH TOKEN MANAGEMENT (CRITICO!)

> **ATENCAO**: O Claude Code CLI NAO faz refresh automatico confiavel!
> Este e um BUG CONHECIDO (Issues #956, #7744, #9403, #10784, #12447)
> Access token expira em ~1-8 HORAS dependendo do contexto.

### TOKEN REFRESH CONFIRMADO FUNCIONANDO! (2025-12-15)

**PROVA CONCRETA:**
- Container `claude-token-refresher` iniciou em: **2025-12-14 12:31 UTC**
- Token atual criado em: **2025-12-15 12:31 UTC** (24 horas depois!)
- Isso prova que houve **~4 refreshes automaticos** (tokens de 8h cada)

**TESTE AO VIVO (2025-12-15):**
- Token ANTES do refresh: `sk-ant-oat01-ENvJ_yt-HJaDD8K1M...`
- Token DEPOIS do refresh: `sk-ant-oat01-QxhNotxzi0djmBbTn...`
- O token MUDOU! O refresh esta funcionando corretamente.


### Multiplos Dispositivos - PERMITIDO!

- A Anthropic **NAO impoe limite de dispositivos** no plano Max
- Cada dispositivo recebe seu **proprio token OAuth independente**
- Login em um PC **NAO invalida** os tokens dos outros
- O que compartilha e apenas a **cota de uso** (reseta a cada 5h)

### Solucao para VPS/Docker: setup-token

```bash
# Gerar token de longa duracao para uso nao-interativo
claude setup-token

# Usar via variavel de ambiente no Docker/VPS
export CLAUDE_CODE_OAUTH_TOKEN="sk-ant-oat01-..."
```

Este token e feito especificamente para containers e ambientes headless!

### Estrutura de Credenciais

Tokens ficam em `~/.claude/.credentials.json`:

```json
{
  "claudeAiOauth": {
    "accessToken": "sk-ant-oat01-...",
    "refreshToken": "sk-ant-ort01-...",
    "expiresAt": 1748658860401,
    "scopes": ["user:inference", "user:profile"]
  }
}
```

| Token | Prefixo | Duracao | Uso |
|-------|---------|---------|-----|
| Access Token | `sk-ant-oat01-` | ~8 horas | Chamadas API |
| Refresh Token | `sk-ant-ort01-` | Longa duracao | Obter novos access tokens |

### API Endpoint para Refresh

```bash
curl -X POST https://console.anthropic.com/v1/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "sk-ant-ort01-SEU-REFRESH-TOKEN",
    "client_id": "9d1c250a-e61b-44d9-88ed-5944d1962f5e"
  }'
```

**Resposta:**
```json
{
  "token_type": "Bearer",
  "access_token": "sk-ant-oat01-...",
  "expires_in": 28800,
  "refresh_token": "sk-ant-ort01-...",
  "scope": "user:inference user:profile"
}
```

### Dados Importantes

| Item | Valor |
|------|-------|
| Client ID Oficial | `9d1c250a-e61b-44d9-88ed-5944d1962f5e` |
| Endpoint Refresh | `https://console.anthropic.com/v1/oauth/token` |
| Duracao Access Token | 28.800 segundos (~8 horas) |
| Intervalo Refresh Recomendado | 4-6 horas (proativo) |
| Arquivo Credenciais | `~/.claude/.credentials.json` |

### Script Python para Refresh (refresh_token.py)

```python
import requests
import json
import time
from pathlib import Path

CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e"
TOKEN_URL = "https://console.anthropic.com/v1/oauth/token"

def refresh_claude_token():
    creds_path = Path.home() / ".claude" / ".credentials.json"

    with open(creds_path) as f:
        creds = json.load(f)

    refresh_token = creds["claudeAiOauth"]["refreshToken"]

    response = requests.post(TOKEN_URL, json={
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": CLIENT_ID
    })

    if response.status_code == 200:
        new_tokens = response.json()
        creds["claudeAiOauth"]["accessToken"] = new_tokens["access_token"]
        creds["claudeAiOauth"]["refreshToken"] = new_tokens["refresh_token"]
        creds["claudeAiOauth"]["expiresAt"] = int(time.time() * 1000) + (new_tokens["expires_in"] * 1000)

        with open(creds_path, "w") as f:
            json.dump(creds, f, indent=2)

        print(f"[OK] Token renovado. Expira em {new_tokens['expires_in']/3600:.1f}h")
        return True
    else:
        print(f"[ERRO] Refresh falhou: {response.status_code}")
        return False
```

### Configuracao Docker (Volume Compartilhado)

**docker-compose-vnc.yml** ja usa volumes compartilhados:
```yaml
volumes:
  - claude-credentials:/opt/claude-credentials:ro
  - claude-config:/opt/claude-config:ro
```

**Token Refresher Service** roda automaticamente:
```yaml
token-refresher:
  image: python:3.11-slim
  volumes:
    - claude-credentials:/opt/claude/credentials
    - ./refresh_token.py:/app/refresh.py:ro
  environment:
    - REFRESH_INTERVAL_HOURS=6
```

### Verificacao e Troubleshooting

```bash
# Ver status de autenticacao
claude /status

# Verificar expiracao no arquivo
jq '.claudeAiOauth.expiresAt' ~/.claude/.credentials.json

# Converter timestamp para data legivel
date -d @$(($(jq '.claudeAiOauth.expiresAt' ~/.claude/.credentials.json) / 1000))

# Forcar refresh manual
python3 refresh_token.py --force

# Ver logs do token-refresher
docker logs claude-token-refresher
```

### Workarounds para Erro 401

1. **Dentro do Claude Code**: `/logout` seguido de `/login`
2. **Reiniciar sessao**: `claude --continue`
3. **Gerar token de longa duracao**: `claude setup-token` (para VPS/Docker)
4. **Usar variavel de ambiente**: `export CLAUDE_CODE_OAUTH_TOKEN="sk-ant-oat01-..."`

### Configuracao apiKeyHelper (Nativo)

Em `~/.claude/settings.json`:
```json
{
  "apiKeyHelper": "/path/to/seu-script-refresh.sh"
}
```
- Chamado automaticamente a cada 5 minutos
- Chamado quando ocorre erro HTTP 401
- Customizavel via `CLAUDE_CODE_API_KEY_HELPER_TTL_MS`

### Cron Job para Refresh Automatico

```bash
# Adicionar ao crontab (crontab -e)
0 */4 * * * /usr/bin/python3 /path/to/refresh_token.py >> /var/log/claude-refresh.log 2>&1
```

### Bug Critico: Retry Storm (Issue #10784)

Quando o token OAuth expira, o Claude Code **tenta 19+ vezes** com credenciais
invalidas, enviando ~134k tokens por tentativa. Isso pode consumir toda a cota
sem nenhum resultado produtivo. Tentativas falhas **contam contra a cota**!

### Comandos de Diagnostico

```bash
# Verificar versao
claude --version

# Diagnostico completo
claude doctor

# Status dentro do Claude Code
/status

# Verificar expiracao (Linux/Windows)
cat ~/.claude/.credentials.json | jq '.claudeAiOauth.expiresAt'

# Reset completo de autenticacao (se necessario)
rm ~/.claude.json
rm -rf ~/.claude/
claude   # Fazer login novamente
```

### Issues Conhecidas (GitHub)

- **#956** - Token expira durante sessoes longas (marcado como corrigido, mas persiste)
- **#7744** - Claude Code nao solicita scope `offline_access` no OAuth
- **#9403** - Bug do macOS Keychain (escrita vs leitura em servicos diferentes)
- **#10784** - Retry storm consome cota com tentativas falhas
- **#12447** - Tokens expiram sem refresh automatico

---

## 7. ARQUIVOS IMPORTANTES

```
claude-code-agent/
├── docker-compose-vnc.yml    <- USAR ESTE para subir containers
├── Dockerfile.vnc            <- Imagem do container
├── api/server-vnc.js         <- API server (endpoints)
├── chrome-persistent.sh      <- Script que inicia Chrome
├── supervisord-claude.conf   <- Gerencia processos
├── proxy-server.js           <- Proxy para Data Impulse
├── refresh_token.py          <- Renova token OAuth (CRITICO!)
├── window-watchdog.sh        <- Monitora janelas Chrome
├── anti-automation.js        <- Bypass deteccao anti-bot
├── .env.example              <- Template de variaveis
└── .env                      <- Variaveis de ambiente (gitignored)
```

---

## 8. COMANDOS ESSENCIAIS

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

## 9. REGRAS PARA NAO PERDER CONTEXTO

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

## 10. VARIAVEIS DE AMBIENTE (CRITICO!)

> **⚠️ SEMPRE verificar TODAS as variaveis antes de fazer deploy!**
> **Falta de variavel = sistema quebrado silenciosamente!**

### Arquivo: `/opt/browser-mcp/.env` (SERVIDOR)
```bash
# ===========================================
# TODAS AS VARIAVEIS OBRIGATORIAS
# ===========================================

# Supabase (AMBAS sao necessarias!)
SUPABASE_URL=https://suqjifkhmekcdflwowiw.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...anon...
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...service_role...

# CapMonster (CAPTCHA solver)
CAPMONSTER_API_KEY=dfa5ce816cbc662599ae29378241a231

# DataImpulse (Proxy residencial)
DATAIMPULSE_LOGIN=2e6fd60c4b7ca899cef0
DATAIMPULSE_PASSWORD=5742ea9e468dae46
DATAIMPULSE_HOST=gw.dataimpulse.com
DATAIMPULSE_STICKY_BASE_PORT=10000
PROXY_URL=http://LOGIN:PASS@gw.dataimpulse.com:10000

# Claude API
CLAUDE_API_KEY=sk-ant-api03-...

# Seguranca
API_SECRET_KEY=liftlio-browser-mcp-secret-key-2025

# Server Config
HOST_IP=173.249.22.2
MAX_CONTAINERS=6
SESSION_TIMEOUT_MINUTES=30
```

### Arquivo: `docker-compose.yml` (OBRIGATORIO!)
Todas variaveis precisam estar mapeadas em `environment:`:
```yaml
environment:
  - SUPABASE_URL=${SUPABASE_URL}
  - SUPABASE_KEY=${SUPABASE_KEY}           # service_role!
  - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
  - CAPMONSTER_API_KEY=${CAPMONSTER_API_KEY}  # <-- ESQUECI ISSO!
  - PROXY_URL=${PROXY_URL}
  # ... outras
```

### Verificacao Rapida
```bash
# No servidor (173.249.22.2):
docker exec browser-orchestrator printenv | grep -E 'CAPMONSTER|SUPABASE_KEY|PROXY'
docker exec liftlio-browser-117 printenv | grep -E 'CAPMONSTER|SUPABASE_KEY'
```

### Checklist Pre-Deploy
- [ ] `.env` tem TODAS as variaveis?
- [ ] `docker-compose.yml` mapeia TODAS as variaveis?
- [ ] SUPABASE_KEY e service_role (nao anon)?
- [ ] CAPMONSTER_API_KEY presente?
- [ ] Apos mudanca no .env: `docker-compose down && docker-compose up -d`?

---

## 11. HISTORICO DE MUDANCAS

### 2025-12-24 - FIX v4.6 + PESQUISA PROFUNDA SOBRE SESSOES GOOGLE

#### PESQUISA: O que invalida sessoes Google (mesmo com cookies validos)

| Fator | Risco | Detalhes |
|-------|-------|----------|
| **Device Bound Session Credentials (DBSC)** | ALTO | Google lancou em Abril/2024 - vincula sessoes ao hardware via TPM. Chrome 136+ |
| **Mudanca significativa de IP** | MEDIO | Trocar de pais/regiao pode invalidar |
| **Sticky session expira** | MEDIO | Data Impulse: 30 min maximo por sessao |
| **Padrao nao-humano** | MEDIO | Requests muito rapidos, sem delays |
| **Formato de cookie mudou** | BAIXO | __Secure-1PSID nao termina mais com . (Jan/2024) |

**Fonte**: Pesquisa doc-research-expert (Playwright MCP docs, Google policies, CookieDatabase)

#### FIX v4.6: --cdp-endpoint + --storage-state (ATUAL NO SERVIDOR)

- **Problema**: Fixes v4.2-v4.5 nao funcionavam porque Playwright MCP Issue #983 nao suportava combinacao
- **Solucao**: Issue #983 foi RESOLVIDO em Set/2025 - agora suporta --cdp-endpoint + --storage-state
- **Arquivo modificado**: /opt/browser-agent-v4/Servidor/Broser.mcp/claude-code-agent/api/server-vnc.js

#### PROXY DATA IMPULSE - ROTATING vs STICKY (IMPORTANTE\!)

**Credenciais (conta Steve no Data Impulse):**
- Login: 2e6fd60c4b7ca899cef0
- Password: 5742ea9e468dae46
- Host: gw.dataimpulse.com
- Traffic disponivel: ~50 GB

**Portas disponiveis:**

| Porta | Tipo | Comportamento | Uso |
|-------|------|---------------|-----|
| 823 | Rotating | IP muda A CADA REQUEST | Scraping em massa (NAO usar para login\!) |
| 10000 | Sticky | IP fica estavel por ~30 min | Login Google, sessoes (USAR ESTE\!) |

**Por que Sticky (10000) e melhor para Google:**
- IP dinamico de CASA = muda a cada horas/dias = OK para Google
- Proxy ROTATING = muda a cada REQUEST = Google detecta como bot
- Proxy STICKY = IP estavel durante sessao = simula usuario real

**Exemplo de uso:**
- Sticky (CORRETO): http://LOGIN:PASS@gw.dataimpulse.com:10000
- Rotating (NAO usar para login\!): http://LOGIN:PASS@gw.dataimpulse.com:823

#### PROXY_URL vs DATAIMPULSE_* (ESCLARECIMENTO)

- PROXY_URL pode estar VAZIO se codigo usa DATAIMPULSE_* para montar dinamicamente
- **Formato dinamico**: http://{LOGIN}:{PASS}@{HOST}:10000
- **Porta sticky**: 10000 (base para sticky session)
- **Data Impulse sticky session**: Maximo 30 minutos por IP

#### TESTE DE PERSISTENCIA (2025-12-24)

1. Container liftlio-browser-117 parado e removido
2. Container recriado com mesmo volume
3. Sessao Google (valdair3d@gmail.com) PERSISTIU via Docker volume
4. 71 cookies salvos no Supabase como backup

---

### 2025-12-20 - FIX v4.2: SESSAO PERSISTE APOS RECRIAR CONTAINER!
- [x] **FIX CRITICO v4.2: Sessao Google persiste mesmo apos docker rm + docker run**
  - Problema: restoreSessionToChrome() LIMPAVA cookies validos do Chrome antes de restaurar do Supabase
  - Causa raiz: Funcao fazia Network.clearBrowserCookies() ANTES de verificar se Chrome ja tinha sessao
  - Solucao (Fix v4.2): Step 0 - Verificar se Chrome ja tem sessao valida ANTES de limpar
  - Arquivo modificado: server-vnc.js (linha ~850)
  - Imagem Docker: liftlio/browser-agent:vnc (rebuilt com fix permanente)

- [x] **TESTE COMPLETO DE PERSISTENCIA (PROVA):**
  1. Login Google realizado (valdair3d@gmail.com) via Playwright MCP
  2. Usuario aprovou 2FA no celular
  3. Sessao salva: 64 cookies no Supabase
  4. Container DESTRUIDO: docker stop && docker rm
  5. Container RECRIADO: docker run com mesmo volume
  6. Logs mostram Fix v4.2 funcionando:
     [SESSION] Step 0: Checking if Chrome already has valid session...
     [SESSION] Chrome has 43 cookies. SID=true, HSID=true, 1PSID=true
     [SESSION] Chrome already has valid Google session from Docker volume!
     [SESSION] Skipping Supabase restore to preserve existing session.
  7. YouTube verificado: Conta Valdair Demello (valdair3d@gmail.com) LOGADA!

- [x] **ARQUITETURA DINAMICA CONFIRMADA FUNCIONANDO:**
  - CapMonster: OK (API Key configurada, RecaptchaV2/V3, hCaptcha, Turnstile)
  - DataImpulse: OK (IP unico por projeto - porta 10000 + index)
  - Containers dinamicos: OK (POST /containers cria por projeto)
  - Volumes persistentes: OK (browser-data-{projectId})
  - Frontend integrado: OK (portas dinamicas via orchestrator)


### 2025-12-19 (Sessao 2)
- [x] **FIX CRITICO: Container parava durante tasks em execucao**
  - Problema: CRON3 parava container apos 5 min "inativo" MESMO com task rodando
  - Causa raiz: Orchestrator usava `anon` key → RLS bloqueava query de tasks running
  - Solucao: Trocado para `service_role` key no .env E docker-compose.yml
  - Verificacao: CRON3 agora ve tasks running e NAO para o container
- [x] **FIX: CRON3 verifica atividade recente (ultimos 5 min)**
  - Problema: CRON3 so verificava `status='running'`, nao atividade recente
  - Solucao: Query `browser_tasks` onde (created_at OU completed_at) >= 5 min atras
  - Arquivo: `/opt/browser-mcp/orchestrator/index.js` + dist/index.js
  - Log: `"Container teve atividade recente, NAO parar!"`
  - Verificacao: `grep -c 'atividade recente' /app/dist/index.js` retorna "2"

- [x] **FIX: CapMonster nao estava sendo usado para CAPTCHAs**
  - Problema: CAPMONSTER_API_KEY faltando no docker-compose.yml
  - Claude recebia instrucao para usar CapMonster mas key estava vazia
  - Solucao: Adicionado `CAPMONSTER_API_KEY=${CAPMONSTER_API_KEY}` no docker-compose.yml
  - Verificacao: `docker exec container printenv | grep CAPMONSTER`

- [x] **DOCUMENTACAO: Secao 10 adicionada com checklist de variaveis**
  - Lista completa de TODAS variaveis obrigatorias
  - Verificacao rapida para debug
  - Checklist pre-deploy

### 2025-12-19 (Sessao 1)
- [x] **PERSISTENCIA SUPABASE CONFIRMADA FUNCIONANDO!**
  - Problema: `.env` tinha `SUPABASE_ANON_KEY` mas codigo esperava `SUPABASE_KEY`
  - Container recebia `SUPABASE_KEY=` (vazio) → Session Watchdog nao iniciava
  - Correcao: Adicionado `SUPABASE_KEY` no `.env` e `docker-compose.yml` do servidor
  - Testado: Login Google → Container destruido → Recriado → Sessao restaurada (115 cookies)
- [x] **Sticky Proxy corrigido (Data Impulse)**
  - Problema: Proxy usava porta 823 (rotating IP) → Google bloqueava login
  - Correcao: Alterado para porta 10000+ (sticky session = mesmo IP)
  - Resultado: Login Google funciona SEM 2FA (IP confiavel)
- [x] **Orchestrator gerencia containers dinamicos**
  - Portas dinamicas: API 10100+, VNC 16000+
  - Containers por projeto: `liftlio-browser-{projectId}`
  - Volumes persistentes: `browser-chrome-{projectId}`
  - Auto-save sessao para Supabase (Watchdog 60s)
### 2025-12-15
- [x] **TOKEN REFRESH CONFIRMADO FUNCIONANDO!**
  - Container rodando ha 24+ horas com tokens de 8h = ~4 refreshes automaticos
  - Teste ao vivo: token mudou de `ENvJ_yt...` para `QxhNotxzi0...`
  - Script `refresh_token.py` funciona corretamente
  - Endpoint oficial: `https://console.anthropic.com/v1/oauth/token`
  - Client ID: `9d1c250a-e61b-44d9-88ed-5944d1962f5e`
  - Refresh token tambem e renovado a cada refresh
- [x] Fix /computer page para producao (HTTPS)
  - Adicionado proxy nginx para VPS (browser-proxy/*, vnc-proxy/*)
  - Corrigido WebSocket params para noVNC em producao
  - Adicionado keepalive para orchestrator (evita CRON3 parar container)

### 2025-12-13
- [x] **Documentacao OAuth Token Refresh COMPLETA** (Secao 6):
  - Multiplos dispositivos SAO PERMITIDOS no plano Max
  - Cada dispositivo tem token INDEPENDENTE (nao invalida outros)
  - `claude setup-token` para gerar token de longa duracao (VPS/Docker)
  - `CLAUDE_CODE_OAUTH_TOKEN` variavel de ambiente para headless
  - Bug conhecido: retry storm consome cota (Issue #10784)
  - Issues: #956, #7744, #9403, #10784, #12447
  - Client ID oficial: `9d1c250a-e61b-44d9-88ed-5944d1962f5e`
  - Comandos de diagnostico: `claude doctor`, `/status`
- [x] Limpeza de arquivos nao usados (browser-agent/, orchestrator/ antigos)
- [x] Remocao de credenciais hardcoded da documentacao

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

## 11. PROXIMOS PASSOS (TODO)

- [x] ~~Token refresh automatico~~ (CONFIRMADO FUNCIONANDO 2025-12-15!)
- [ ] Configurar `CLAUDE_CODE_OAUTH_TOKEN` no docker-compose
- [ ] Implementar polling de tasks do Supabase no container
- [ ] Botao "Login Google" no frontend
- [ ] Implementar auto-standby (desligar container apos X min sem uso)
- [x] ~~Verificar sessao antes de cada task~~ (implementado: ensureSessionBeforeTask)
- [x] ~~Testar persistencia de sessao apos rebuild~~ (implementado: watchdog + auto-save)
- [x] ~~Testar fluxo completo: Login -> Task YouTube -> Reiniciar -> Nova Task~~ (CONFIRMADO 2025-12-19)

---

*Arquivo consolidado em 2025-12-13. Substitui: PLANO_CLAUDE_CODE_MAX.md, INTEGRATION_GUIDE.md, CEREBRO_BROWSER.md, CEREBRO_TESTE_COMENTARIOS.md*
