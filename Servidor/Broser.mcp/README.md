# Browser MCP - Liftlio Browser Automation System

Sistema de automacao de browser com AI (Claude) para o Liftlio. Permite executar tarefas de browser automaticamente usando linguagem natural.

## Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BROWSER MCP ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌──────────────────┐     ┌─────────────────────────┐  │
│  │   Frontend  │     │     Supabase     │     │      VPS Server         │  │
│  │   React     │     │                  │     │    173.249.22.2         │  │
│  └──────┬──────┘     └────────┬─────────┘     └───────────┬─────────────┘  │
│         │                     │                           │                 │
│         │  INSERT task        │                           │                 │
│         ├────────────────────►│                           │                 │
│         │                     │                           │                 │
│         │                     │  pg_cron (1 min)          │                 │
│         │                     │  ─────────────────►       │                 │
│         │                     │                           │                 │
│         │                     │  ┌──────────────────┐     │                 │
│         │                     │  │ browser-dispatch │     │                 │
│         │                     │  │ Edge Function    │     │                 │
│         │                     │  └────────┬─────────┘     │                 │
│         │                     │           │               │                 │
│         │                     │           │ HTTP POST     │                 │
│         │                     │           │ /agent/task   │                 │
│         │                     │           └──────────────►│                 │
│         │                     │                           │                 │
│         │                     │                    ┌──────┴──────┐          │
│         │                     │                    │ Docker      │          │
│         │                     │                    │ Orchestrator│          │
│         │                     │                    └──────┬──────┘          │
│         │                     │                           │                 │
│         │                     │              ┌────────────┼────────────┐    │
│         │                     │              │            │            │    │
│         │                     │         ┌────▼───┐  ┌─────▼────┐ ┌─────▼──┐│
│         │                     │         │Container│  │Container │ │Container││
│         │                     │         │ :3001  │  │  :3002   │ │ :3003  ││
│         │                     │         │Project1│  │ Project2 │ │Project3││
│         │                     │         └────┬───┘  └──────────┘ └────────┘│
│         │                     │              │                              │
│         │                     │              │ Claude AI                    │
│         │                     │              │ (Haiku)                      │
│         │                     │              ▼                              │
│         │                     │         ┌─────────┐                         │
│         │                     │         │Playwright│                        │
│         │                     │         │ Browser │                         │
│         │                     │         └────┬────┘                         │
│         │                     │              │                              │
│         │                     │              │ DataImpulse                  │
│         │                     │              │ Proxy (IP Residencial)       │
│         │                     │              ▼                              │
│         │                     │         ┌─────────┐                         │
│         │                     │         │ YouTube │                         │
│         │                     │         │ Google  │                         │
│         │                     │         │ etc...  │                         │
│         │                     │         └─────────┘                         │
│         │                     │                                             │
│         │                     │◄──────────────────────────────────────────  │
│         │                     │         UPDATE task                         │
│         │                     │         (completed/failed)                  │
│         │                     │         + response JSON                     │
│         │                     │                                             │
│         │◄────────────────────┤  Realtime subscription                      │
│         │   Task completed!   │                                             │
│         │   + response data   │                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Componentes

### 1. Tabela `browser_tasks` (Supabase)

Armazena todas as tarefas de automacao.

```sql
-- Estrutura da tabela
CREATE TABLE browser_tasks (
  id UUID PRIMARY KEY,
  project_id BIGINT REFERENCES "Projeto"(id),

  -- Tarefa
  task TEXT NOT NULL,              -- "Faca login no YouTube e..."
  task_type TEXT,                  -- action | query | scrape | login

  -- Status
  status TEXT,                     -- pending | running | completed | failed
  priority INT,                    -- 1 (urgente) a 10 (baixa)

  -- Resposta
  response JSONB,                  -- { result, data, success }
  error_message TEXT,

  -- Metricas
  iterations_used INT,
  actions_taken JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  container_port INT,

  -- Anti-detection: Padroes comportamentais usados nesta task
  behavior_used JSONB,          -- { mouse, typing, scroll, delay, click_offset }

  -- Meta
  created_at TIMESTAMPTZ,
  created_by UUID
);
```

**Exemplo de INSERT:**
```sql
INSERT INTO browser_tasks (project_id, task, task_type, priority)
VALUES (
  58,
  'Acesse youtube.com, procure por "AI news" e colete os titulos dos 5 primeiros videos',
  'scrape',
  5
);
```

**Exemplo de response (scrape):**
```json
{
  "result": "Encontrados 5 videos sobre AI news",
  "success": true,
  "data": {
    "videos": [
      {"title": "AI Revolution 2025", "views": "1.2M"},
      {"title": "ChatGPT vs Claude", "views": "890K"}
    ]
  }
}
```

### Sistema de Humanização Anti-Detecção

O browser usa um sistema sofisticado para parecer humano e evitar detecção:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ANTI-DETECTION: BEHAVIORAL MEMORY                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Task 1 (projeto 58) → grava behavior_used                                 │
│   { mouse: "bezier_smooth", typing: "fast", scroll: "stepped" }             │
│                                                                             │
│                           ↓                                                 │
│                                                                             │
│   Task 2 (projeto 58) → CONSULTA últimas 5 tasks                            │
│   "Já usaram bezier_smooth... vou usar OVERSHOOT"                           │
│   { mouse: "overshoot", typing: "slow", scroll: "smooth" }                  │
│                                                                             │
│                           ↓                                                 │
│                                                                             │
│   Task 3 (projeto 58) → CONSULTA últimas 5 tasks                            │
│   "Já usaram bezier_smooth, overshoot... vou usar ZIGZAG"                   │
│   { mouse: "zigzag_subtle", typing: "burst", scroll: "fast_scan" }          │
│                                                                             │
│   ✅ RESULTADO: Cada sessão parece um humano diferente!                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Padrões Disponíveis:**

| Categoria | Padrões                                                    |
|-----------|-----------------------------------------------------------|
| Mouse     | bezier_smooth, bezier_fast, overshoot, zigzag_subtle, linear_jitter |
| Digitação | hunt_peck, touch_typist, variable, burst, with_typos      |
| Scroll    | smooth, stepped, fast_scan, mouse_wheel                   |
| Delay     | impatient (500-1500ms), thoughtful (2-4s), erratic, natural |

**Exemplo de behavior_used salvo:**
```json
{
  "mouse": "overshoot",
  "typing": "burst",
  "scroll": "smooth",
  "delay": "erratic",
  "click_offset": {"x": 3, "y": -2},
  "typing_speed_ms": 120
}
```

**Benefícios:**
- ✅ Anti-ML: Impossível treinar modelo contra padrões que sempre mudam
- ✅ Por Projeto: Cada "usuário virtual" evolui independentemente
- ✅ Auditável: Log completo de comportamentos no campo `behavior_used`
- ✅ Realista: Humanos reais também variam comportamento

### 2. Edge Function `browser-dispatch`

Dispara tarefas pendentes para o Browser Agent.

- **Trigger:** pg_cron a cada 1 minuto
- **Funcao:** Busca tasks `pending`, envia para Agent, atualiza status

```bash
# Testar manualmente
curl -X POST "https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/browser-dispatch" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### 3. Edge Function `browser-webhook`

Recebe callbacks do Agent (para tarefas longas assincronas).

```bash
# Agent chama quando termina
curl -X POST "https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/browser-webhook" \
  -H "X-Webhook-Secret: liftlio-browser-webhook-2025" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "uuid-da-task",
    "success": true,
    "result": "Tarefa concluida",
    "iterations": 8,
    "data": {"key": "value"}
  }'
```

### 4. Browser Agent (Docker Container)

Servidor Node.js com Playwright + Claude AI.

**Endpoints principais:**

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/health` | GET | Status do container |
| `/agent/task` | POST | Executa uma tarefa |
| `/agent/task-list` | POST | Executa lista de tarefas |
| `/mcp/navigate` | POST | Navegar para URL |
| `/mcp/click` | POST | Clicar em elemento |
| `/mcp/type` | POST | Digitar texto |
| `/mcp/snapshot` | GET | Capturar estado da pagina |
| `/sse` | GET | Server-Sent Events (progresso) |

**Exemplo de uso:**

```bash
# Tarefa unica
curl -X POST "http://173.249.22.2:3001/agent/task" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Va ao Google e pesquise por Anthropic Claude",
    "maxIterations": 30
  }'

# Lista de tarefas
curl -X POST "http://173.249.22.2:3001/agent/task-list" \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      "Acesse youtube.com",
      "Pesquise por AI tutorials",
      "Clique no primeiro video",
      "Colete o titulo e descricao"
    ],
    "maxIterationsPerTask": 20
  }'
```

### 5. Docker Orchestrator

Gerencia multiplos containers (1 por projeto).

```bash
# Criar novo container para projeto
curl -X POST "http://173.249.22.2:3000/containers" \
  -H "Content-Type: application/json" \
  -d '{"projectId": "meu-projeto"}'

# Listar containers
curl "http://173.249.22.2:3000/containers"

# Remover container
curl -X DELETE "http://173.249.22.2:3000/containers/meu-projeto"
```

## Configuracao de Ambiente

### VPS (.env)

```env
# DataImpulse Proxy (IP Residencial)
DATAIMPULSE_LOGIN=2e6fd60c4b7ca899cef0
DATAIMPULSE_PASSWORD=5742ea9e468dae46
DATAIMPULSE_HOST=gw.dataimpulse.com
DATAIMPULSE_STICKY_BASE_PORT=823

# Claude API
CLAUDE_API_KEY=sk-ant-api03-xxx

# Seguranca
API_SECRET_KEY=liftlio-browser-mcp-secret-key-2025

# Server
HOST_IP=173.249.22.2
MAX_CONTAINERS=6
SESSION_TIMEOUT_MINUTES=30
```

### Supabase Secrets

```bash
# Configurar no Dashboard > Edge Functions > Secrets
BROWSER_AGENT_HOST=173.249.22.2
BROWSER_AGENT_BASE_PORT=3001
BROWSER_WEBHOOK_SECRET=liftlio-browser-webhook-2025
```

## Fluxo Completo de uma Tarefa

```
1. Frontend/Cron insere tarefa na tabela
   INSERT INTO browser_tasks (project_id, task) VALUES (58, 'Login no YouTube')
   status = 'pending'

2. pg_cron dispara browser-dispatch (a cada 1 min)
   SELECT * FROM browser_tasks WHERE status = 'pending'

3. browser-dispatch envia para Browser Agent
   POST http://173.249.22.2:3001/agent/task
   UPDATE browser_tasks SET status = 'running'

4. Browser Agent executa com Claude AI
   - Claude decide acoes (navigate, click, type)
   - Playwright executa no browser
   - DataImpulse fornece IP residencial

5. Agent responde (sincrono) ou chama webhook (assincrono)
   UPDATE browser_tasks SET
     status = 'completed',
     response = '{"result": "...", "data": {...}}'

6. Frontend recebe via Realtime subscription
   supabase.channel('browser_tasks')
     .on('postgres_changes', ...)
```

## Deploy

### 1. VPS (173.249.22.2)

```bash
# SSH no servidor
ssh root@173.249.22.2

# Clonar/atualizar codigo
cd /opt/browser-mcp
git pull

# Build e start containers
docker-compose build
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### 2. Supabase

```bash
# Edge Functions (ja deployadas)
# - browser-dispatch
# - browser-webhook

# Cron job (configurar no Dashboard > Database > Extensions > pg_cron)
SELECT cron.schedule(
  'browser-dispatch-cron',
  '* * * * *',  -- A cada minuto
  $$
  SELECT net.http_post(
    url := 'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/browser-dispatch',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

## Estrutura de Arquivos

```
Servidor/Broser.mcp/
├── README.md                    # Este arquivo
├── .env                         # Variaveis de ambiente
├── docker-compose.yml           # Orquestracao Docker
├── orchestrator/                # API de gerenciamento
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       └── index.ts
└── browser-agent/               # Agente com Playwright + Claude
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts             # Servidor Express
        ├── agent.ts             # Claude AI Agent
        ├── agent-endpoint.ts    # Endpoints /agent/*
        ├── browser-manager.ts   # Gerenciador Playwright
        └── proxy-config.ts      # Config DataImpulse
```

## Recursos

- **Modelo AI:** Claude Haiku (claude-haiku-4-5-20251001) - $0.80/1M input tokens
- **Browser:** Chromium via Playwright
- **Proxy:** DataImpulse (IP residencial sticky)
- **Persistencia:** Chrome profile salvo em volume Docker
- **Max containers:** 6 (1 por projeto)
- **Iteracoes por tarefa:** 30 (configuravel)

## Troubleshooting

### Task fica em "pending" forever
- Verificar se pg_cron esta ativo
- Verificar logs da Edge Function browser-dispatch
- Testar manualmente: `curl -X POST .../browser-dispatch`

### Agent nao responde
- Verificar container: `docker ps`
- Ver logs: `docker logs browser-agent-1`
- Testar health: `curl http://173.249.22.2:3001/health`

### Proxy bloqueado
- Verificar credenciais DataImpulse
- Mudar porta sticky (cada porta = IP diferente)
- Verificar saldo de trafego em dataimpulse.com

### Claude retorna erro
- Verificar CLAUDE_API_KEY no .env
- Verificar limites de rate da API
- Ver logs do agent para erro especifico

## Custos Estimados

| Recurso | Custo |
|---------|-------|
| Claude Haiku | ~$0.80/1M input, $4/1M output |
| DataImpulse | ~$1/GB trafego |
| VPS | Ja incluso no servidor existente |
| Supabase | Ja incluso no plano atual |

**Estimativa por tarefa:** $0.001 - $0.01 dependendo da complexidade

## SSH Access - Deploy

### Dados do Servidor
- **IP**: 173.249.22.2
- **Usuario**: root
- **Porta**: 22
- **Chave SSH**: `C:/c/Users/User/.ssh/contabo_key_new`

### Comando SSH (Windows)
```bash
ssh -i "C:/c/Users/User/.ssh/contabo_key_new" root@173.249.22.2
```

### Deploy Rapido
```bash
# 1. Conectar
ssh -i "C:/c/Users/User/.ssh/contabo_key_new" root@173.249.22.2

# 2. No servidor:
cd /opt/browser-mcp
docker-compose down
docker-compose up -d --build

# 3. Verificar
docker ps
curl http://localhost:3001/health
```

### Copiar arquivos (SCP)
```bash
# Copiar arquivo especifico
scp -i "C:/c/Users/User/.ssh/contabo_key_new" arquivo.ts root@173.249.22.2:/opt/browser-mcp/browser-agent/src/

# Copiar pasta inteira
scp -i "C:/c/Users/User/.ssh/contabo_key_new" -r browser-agent/src/ root@173.249.22.2:/opt/browser-mcp/browser-agent/
```

### Comandos Uteis
```bash
# Ver logs
ssh -i "C:/c/Users/User/.ssh/contabo_key_new" root@173.249.22.2 "docker logs browser-agent-1 --tail 50"

# Ver containers
ssh -i "C:/c/Users/User/.ssh/contabo_key_new" root@173.249.22.2 "docker ps"

# Restart container
ssh -i "C:/c/Users/User/.ssh/contabo_key_new" root@173.249.22.2 "cd /opt/browser-mcp && docker-compose restart"
```

### Testar Task
```bash
curl -X POST "http://173.249.22.2:3001/agent/task" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Acesse google.com e me diga o titulo da pagina",
    "projectId": 58,
    "taskId": "test-123"
  }'
```

### Problemas SSH?
Ver documentacao completa: `/Servidor/ACESSO_SSH_WINDOWS.md`
