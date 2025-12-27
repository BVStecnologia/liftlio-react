# Liftlio Claude Code API - Lightweight

Container Docker leve para executar Claude Code CLI via HTTP API.

## Diferenças do Browser Agent

| Aspecto | Claude Code API (Lite) | Browser Agent (Full) |
|---------|------------------------|----------------------|
| **Tamanho** | ~200MB | ~2GB+ |
| **Browser** | Nenhum | Chrome + Playwright |
| **VNC** | Nenhum | Sim |
| **Uso** | Chat/Código apenas | Automação web |
| **Porta** | 10200 | 10100+ |

## Setup Rápido

### 1. Copiar credenciais para volume Docker

```bash
cd Servidor/claude-code-api
bash setup-credentials.sh
```

### 2. Build e iniciar

```bash
docker-compose up -d --build
```

### 3. Testar

```bash
# Health check
curl http://localhost:10200/health

# Enviar mensagem
curl -X POST http://localhost:10200/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Olá! O que é 2+2?"}'
```

## Endpoints

### `GET /health`
Health check do container.

### `GET /status`
Status atual (task rodando, session ID).

### `POST /chat`
Executa mensagem e retorna resposta.

```json
{
  "message": "Sua pergunta aqui",
  "maxTurns": 10,
  "continueSession": false
}
```

Resposta:
```json
{
  "success": true,
  "response": "Resposta do Claude",
  "duration": 1234,
  "sessionId": "abc123"
}
```

### `POST /chat/stream`
Streaming via Server-Sent Events.

### `POST /session/reset`
Limpa sessão de conversa.

### `GET /history`
Histórico das últimas 20 tarefas.

### `POST /cancel`
Tenta cancelar task atual.

### `POST /force-cleanup`
Força limpeza de task travada.

## Exemplo de Uso (JavaScript)

```javascript
// Chamada simples
const response = await fetch('http://localhost:10200/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Explique o que é recursão em programação',
    maxTurns: 5
  })
});

const data = await response.json();
console.log(data.response);
```

## Exemplo de Uso (Edge Function Supabase)

```typescript
// Chamar Claude API do Liftlio
const claudeResponse = await fetch('http://SEU_VPS:10200/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: `Analise este texto: ${userInput}`,
    maxTurns: 10
  })
});

const result = await claudeResponse.json();
return new Response(JSON.stringify(result), {
  headers: { 'Content-Type': 'application/json' }
});
```

## Notas

- **Autenticação**: Usa OAuth token do plano Max (não API key)
- **Limites**: Segue fair use do plano Claude Max
- **Segurança**: Credenciais montadas como read-only
- **Sessão**: Suporta `--resume` para conversas contínuas
