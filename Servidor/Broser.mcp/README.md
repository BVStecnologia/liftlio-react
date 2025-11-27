# Browser MCP - Liftlio Browser Automation System

Sistema de automacao de browser com AI (Claude) para o Liftlio. Permite executar tarefas de browser automaticamente usando linguagem natural E acesso manual via VNC para usuarios interagirem diretamente.

## Arquitetura Multi-Projeto com Isolamento

Cada projeto tem seu proprio container isolado com:
- Browser Chromium isolado com perfil persistente
- Agente AI Claude independente (ate 1000 iteracoes)
- IP residencial proprio via DataImpulse
- VNC Server para acesso manual do usuario

### Portas por Projeto

| Projeto | MCP Port | VNC Port | DataImpulse Port | IP |
|---------|----------|----------|------------------|-------|
| 0 | 10100 | 16080 | 823 | IP #1 |
| 1 | 10101 | 16081 | 824 | IP #2 |
| 2 | 10102 | 16082 | 825 | IP #3 |
| N | 10100+N | 16080+N | 823+N | IP #N+1 |

## Componentes

### 1. Orchestrator (porta 8080)

Gerencia containers por projeto.

**Criar container:**
{"error":"Internal Server Error","message":"An unexpected error occurred"}

**Listar containers:**
{"count":1,"containers":[{"projectId":"117","userId":"test-user","containerName":"browser-agent-117","status":"running","mcpUrl":"http://173.249.22.2:10100","mcpPort":10100,"vncPort":16080,"vncUrl":"http://173.249.22.2:16080/vnc.html?autoconnect=true&password=liftlio","createdAt":"2025-11-27T15:17:48.861Z","lastActivity":"2025-11-27T15:17:48.861Z"}]}

### 2. Browser Agent (1 por projeto)

Endpoints:
- GET /health - Status
- POST /agent/task - Executar tarefa AI
- POST /agent/task-list - Lista de tarefas
- GET /mcp/snapshot - Estado da pagina
- POST /mcp/navigate - Navegar
- POST /mcp/click - Clicar
- POST /mcp/type - Digitar
- GET /mcp/screenshot - Screenshot base64
- GET /sse - Server-Sent Events

## Acesso Manual (VNC)

Para usuarios usarem o navegador manualmente (logar, ver videos, etc).

### Servicos necessarios no container:

| Servico | Funcao | Porta |
|---------|--------|-------|
| Xvfb | Virtual Frame Buffer | :99 interno |
| x11vnc | VNC Server | 5900 interno |
| websockify | WebSocket proxy | 6080 exposto |
| noVNC | Cliente web | via websockify |
| Chromium | Browser | --display=:99 |
| supervisor | Gerencia processos | - |

### Opcoes VNC

| Opcao | Complexidade | Performance |
|-------|-------------|-------------|
| noVNC + react-vnc | Baixa | Boa |
| Apache Guacamole | Media | Muito Boa |
| Kasm Workspaces | Alta | Excelente |
| Neko | Media | Excelente (video) |

**Recomendacao:** noVNC + react-vnc para simplicidade

### React Integration


added 3 packages in 4s



## Anti-Deteccao

Cada tarefa usa padroes comportamentais diferentes:
- Mouse: bezier_smooth, overshoot, zigzag_subtle
- Digitacao: hunt_peck, burst, with_typos
- Scroll: smooth, stepped, fast_scan
- Delay: impatient, thoughtful, erratic

## Deploy



## API Reference

### Orchestrator (:8080)
- GET /health
- GET /containers
- POST /containers
- GET /containers/:projectId
- DELETE /containers/:projectId

### Browser Agent (porta dinamica)
- GET /health
- POST /agent/task
- POST /agent/task-list
- GET/POST /mcp/*

## Custos
- Claude Haiku: ~USD 0.80/1M input
- DataImpulse: ~USD 1/GB
- Por tarefa: USD 0.001 - 0.01
