# Browser MCP - Liftlio Browser Automation System

Sistema de automacao de browser com AI (Claude) para o Liftlio.
Permite executar tarefas automaticamente E acesso manual via VNC.

---

## Arquitetura Geral

```
+------------------+     +-------------------+     +------------------+
|   FRONTEND       |     |   SUPABASE        |     |   VPS SERVER     |
|   (React)        |     |   (Edge/Cron)     |     |   173.249.22.2   |
+------------------+     +-------------------+     +------------------+
        |                        |                        |
        |   LOCAL DEV            |   PRODUCAO             |
        |   (Docker direto)      |   (via Edge Functions) |
        v                        v                        v
+-------+--------+       +-------+--------+       +-------+--------+
|                |       |                |       |                |
|  localhost:    |       |  browser-proxy |       |  Orchestrator  |
|  3001          |       |  Edge Function |       |  :8080         |
|                |       |                |       |                |
+----------------+       +-------+--------+       +-------+--------+
                                 |                        |
                                 |    Proxy todas         |
                                 |    requisicoes         |
                                 +------------------------+
                                                          |
                                                          v
                                                  +-------+--------+
                                                  |  Browser Agent |
                                                  |  Container     |
                                                  |  :10100+N      |
                                                  +----------------+
```

---

## Arquitetura Local vs Producao

### LOCAL (Desenvolvimento)

```
React App (localhost:3000)
    |
    | HTTP direto
    v
Docker Standalone (localhost:3001)
    |
    +-- Browser Agent
    +-- Playwright + Chromium
    +-- AI Agent (Claude Haiku)
```

**Comando:**
```bash
cd Servidor/Broser.mcp
docker-compose -f docker-compose.standalone.yml up -d
```

**Variaveis (.env.development):**
```
REACT_APP_BROWSER_ORCHESTRATOR_URL=http://localhost:3001
```

### PRODUCAO (Deploy)

```
React App (liftlio.com)
    |
    | CORS-safe
    v
Edge Function: browser-proxy
    |
    | HTTP interno
    v
VPS Orchestrator (173.249.22.2:8080)
    |
    | Gerencia containers
    v
Browser Agents (:10100, :10101, ...)
    |
    | Callback async
    v
Edge Function: browser-webhook
    |
    | Atualiza status
    v
Supabase: browser_tasks
```

**Cron Job (pg_cron):**
```
* * * * *  -->  Edge Function: browser-dispatch
                    |
                    | Busca tasks pendentes
                    | Despacha para Browser Agent
                    v
                browser_tasks.status = 'running'
```

---

## Multi-Projeto com Isolamento

Cada projeto tem container isolado:
- Browser Chromium com perfil persistente
- Agente AI Claude independente (1000 iteracoes)
- IP residencial proprio via DataImpulse
- VNC Server para acesso manual (on-demand)

### Portas por Projeto

| Projeto | MCP Port | VNC Port | DataImpulse | IP |
|---------|----------|----------|-------------|------|
| 0 | 10100 | 16080 | 823 | IP #1 |
| 1 | 10101 | 16081 | 824 | IP #2 |
| N | 10100+N | 16080+N | 823+N | IP #N+1 |

---

## Edge Functions (Supabase)

### 1. browser-proxy

**Proposito:** Proxy CORS-safe para frontend acessar VPS

**URL:** `https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/browser-proxy`

**Acoes suportadas:**

| Action | Metodo | Descricao |
|--------|--------|-----------|
| `create` | POST | Cria container para projeto |
| `delete` | POST | Remove container |
| `status` | POST | Status do container |
| `health` | GET | Health check do agent |
| `screenshot` | GET | Screenshot base64 |
| `click-at` | POST | Click em coordenadas |
| `type-text` | POST | Digitar texto |
| `press-key` | POST | Pressionar tecla |
| `scroll` | POST | Scroll na pagina |

**Acoes Neko (WebRTC para video):**

| Action | Descricao |
|--------|-----------|
| `neko-start` | Inicia container Neko |
| `neko-status` | Status do Neko |
| `neko-stop` | Para container Neko |

**Exemplo:**
```typescript
// Frontend React
const response = await fetch(
  'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/browser-proxy',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'create',
      projectId: 'meu-projeto'
    })
  }
);
```

### 2. browser-dispatch

**Proposito:** Despacha tarefas pendentes para Browser Agents

**Chamado por:** pg_cron (a cada minuto)

**verify_jwt:** false (interno)

**Fluxo:**
```
1. SELECT * FROM browser_tasks WHERE status = 'pending'
2. JOIN com Projeto para pegar browser_mcp_url
3. POST para Browser Agent /agent/task
4. UPDATE browser_tasks SET status = 'running'
5. Quando agent termina, atualiza resultado
```

**SQL do Cron:**
```sql
SELECT cron.schedule(
  'dispatch-browser-tasks',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/browser-dispatch',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

### 3. browser-webhook

**Proposito:** Recebe callbacks assincronos do Browser Agent

**Autenticacao:** Header `X-Webhook-Secret`

**Payload esperado:**
```json
{
  "taskId": "uuid",
  "success": true,
  "result": "Tarefa concluida com sucesso",
  "iterations": 5,
  "actions": ["navigate", "click", "type"],
  "behaviorUsed": "bezier_smooth"
}
```

**Atualiza:**
```sql
UPDATE browser_tasks SET
  status = 'completed',
  response = result,
  iterations_used = iterations,
  actions_taken = actions,
  behavior_used = behaviorUsed,
  completed_at = now()
WHERE id = taskId;
```

---

## Tabelas Supabase

### Projeto (campos browser)

| Campo | Tipo | Descricao |
|-------|------|-----------|
| browser_mcp_url | text | URL do MCP container |
| browser_vnc_url | text | URL do noVNC |
| browser_session_status | text | inactive/creating/running/stopped/error |
| browser_session_started_at | timestamp | Quando iniciou |
| browser_container_id | text | Docker container ID |

### browser_tasks

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | uuid | PK |
| project_id | int | FK -> Projeto |
| task | text | Descricao da tarefa |
| task_type | text | Tipo (navigate, click, etc) |
| status | text | pending/running/completed/failed |
| priority | int | Prioridade (menor = mais urgente) |
| response | text | Resultado da execucao |
| error_message | text | Erro se falhou |
| iterations_used | int | Quantas iteracoes o agent usou |
| actions_taken | text[] | Acoes executadas |
| behavior_used | text | Padrao anti-deteccao usado |
| container_port | int | Porta do container |
| started_at | timestamp | Inicio da execucao |
| completed_at | timestamp | Fim da execucao |

---

## Orchestrator (porta 8080)

**API Key:** `liftlio-browser-mcp-secret-key-2025`

### Endpoints

**Criar container:**
```bash
curl -X POST http://173.249.22.2:8080/containers \
  -H "X-API-Key: liftlio-browser-mcp-secret-key-2025" \
  -H "Content-Type: application/json" \
  -d '{"projectId": "meu-projeto"}'
```

**Listar containers:**
```bash
curl http://173.249.22.2:8080/containers \
  -H "X-API-Key: liftlio-browser-mcp-secret-key-2025"
```

**Deletar container:**
```bash
curl -X DELETE http://173.249.22.2:8080/containers/meu-projeto \
  -H "X-API-Key: liftlio-browser-mcp-secret-key-2025"
```

---

## Browser Agent (1 por projeto)

### Endpoints

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/health` | GET | Health check |
| `/agent/task` | POST | Executa tarefa AI |
| `/agent/task-list` | POST | Lista de tarefas |
| `/mcp/snapshot` | GET | Accessibility snapshot |
| `/mcp/screenshot` | GET | Screenshot base64 |
| `/mcp/navigate` | POST | Navegar para URL |
| `/mcp/click` | POST | Click por ref |
| `/mcp/type` | POST | Digitar texto |
| `/sse` | GET | Server-Sent Events |

### Exemplo Task AI

```bash
curl -X POST http://173.249.22.2:10100/agent/task \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Acesse youtube.com e pesquise por Liftlio",
    "model": "claude-haiku-4-5-20251001",
    "verbose": true
  }'
```

---

## VNC - Acesso Manual

Para usuarios usarem navegador manualmente (logins no YouTube, assistir videos, etc).

### Servicos no Container

| Servico | Funcao |
|---------|--------|
| Xvfb | Virtual Frame Buffer |
| x11vnc | VNC Server |
| websockify | WebSocket proxy |
| noVNC | Cliente web |
| supervisor | Gerencia processos |

### VNC-on-Demand

- Servicos VNC iniciam apenas quando usuario conecta
- Sem consumo de recursos quando inativo
- Autenticacao via JWT (sem senha no painel)

### Opcoes de Implementacao

| Opcao | Prós | Contras |
|-------|------|---------|
| noVNC + react-vnc | Simples, leve | Audio limitado |
| Neko | Excelente video/audio | Mais recursos |
| Kasm | Enterprise-ready | Complexo |

### React Integration

```bash
npm install react-vnc --legacy-peer-deps
```

```tsx
import { VncScreen } from 'react-vnc';

<VncScreen
  url={`wss://173.249.22.2:16080?token=${jwtToken}`}
  scaleViewport
  autoConnect
/>
```

---

## Anti-Deteccao

Padroes comportamentais variaveis por tarefa:

| Tipo | Padroes |
|------|---------|
| Mouse | bezier_smooth, overshoot, zigzag |
| Digitacao | burst, hunt_peck, with_typos |
| Scroll | smooth, stepped, fast_scan |
| Delay | impatient, thoughtful, erratic |

---

## Deploy

### Local (Standalone)

```bash
cd Servidor/Broser.mcp
docker-compose -f docker-compose.standalone.yml up -d
```

### Producao (VPS)

```bash
ssh root@173.249.22.2
cd /opt/browser-mcp
docker-compose up -d
```

### Edge Functions

```bash
# Via Supabase CLI
supabase functions deploy browser-proxy
supabase functions deploy browser-dispatch
supabase functions deploy browser-webhook

# Via MCP
mcp__supabase__deploy_edge_function(...)
```

---

## Custos Estimados

| Item | Custo |
|------|-------|
| Claude Haiku | ~$0.80/1M input tokens |
| DataImpulse | ~$1/GB |
| Por tarefa simples | $0.001-$0.01 |

---

## Arquivos Importantes

```
Servidor/Broser.mcp/
├── docker-compose.yml           # Multi-projeto (orchestrator)
├── docker-compose.standalone.yml # Container unico (dev local)
├── orchestrator/
│   └── src/
│       ├── index.ts             # API orchestrator
│       └── container-manager.ts # Gerencia Docker containers
├── browser-agent/
│   ├── Dockerfile               # Imagem com Playwright
│   └── src/
│       ├── index.ts             # API do agent
│       ├── agent.ts             # AI Agent (Claude)
│       ├── browser-manager.ts   # Controle Playwright
│       └── humanization.ts      # Anti-deteccao
└── README.md                    # Este arquivo

liftlio-react/supabase/functions/
├── browser-proxy/index.ts       # Proxy CORS
├── browser-dispatch/index.ts    # Cron dispatcher
└── browser-webhook/index.ts     # Callback receiver
```

---

## Fluxo Completo de uma Tarefa

```
1. Usuario cria tarefa no Liftlio
   |
   v
2. INSERT browser_tasks (status: pending)
   |
   v
3. pg_cron dispara a cada minuto
   |
   v
4. browser-dispatch busca tasks pendentes
   |
   v
5. POST /agent/task para Browser Agent
   |
   v
6. Agent executa com Claude Haiku
   |  - Usa padrao anti-deteccao
   |  - Screenshot + accessibility
   |  - Até 1000 iteracoes
   |
   v
7. Agent retorna resultado
   |
   v
8. browser_tasks atualizado (status: completed)
   |
   v
9. Usuario ve resultado no dashboard
```
