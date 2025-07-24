# MCP Gmail Server

Servidor MCP para integração com Gmail API usando OAuth2.

## Status da Instalação

### ✅ Concluído
1. **Instalação do servidor** - Script completo criado
2. **Configuração básica** - Server.js com endpoints REST
3. **Containerização** - Docker Compose configurado para ambos MCPs

### 🔄 Em Andamento
1. **OAuth2 Configuration** - Aguardando código de autorização
   - Client ID: 663489109439-u2f2araidp8n2o6u1q1ao40vdqclndvp.apps.googleusercontent.com
   - Redirect URI: http://localhost
   - Scopes: https://mail.google.com/

### 📝 Próximos Passos
1. Obter código de autorização OAuth2
2. Trocar código por tokens (access_token e refresh_token)
3. Configurar tokens no servidor
4. Testar envio de emails
5. Criar Edge Functions para integração

## Endpoints Disponíveis

- `POST /api/send-email` - Enviar email simples
- `POST /api/send-template` - Enviar email com template
- `POST /api/send-bulk` - Enviar emails em massa
- `GET /health` - Status do servidor

## Docker

Os serviços MCP estão containerizados em:
- `/home/mcp-services/docker-compose.yml`
- MCP Trello: porta 5173
- MCP Gmail: porta 3000

## Edge Functions Exemplo

```typescript
const response = await fetch('http://173.249.22.2:3000/api/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'destinatario@email.com',
    subject: 'Assunto',
    text: 'Corpo do email',
    html: '<p>HTML opcional</p>'
  })
});
```