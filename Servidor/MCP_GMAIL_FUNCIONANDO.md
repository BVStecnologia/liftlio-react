# ✅ MCP Gmail - Status: FUNCIONANDO!

**Data:** 24/01/2025
**Status:** 100% Operacional

## 🚀 Configuração Completa

### Servidor
- **URL:** http://173.249.22.2:3000
- **Versão:** 2.0.0 (OAuth2)
- **Container:** mcp-gmail
- **Status:** ✅ Rodando

### OAuth2
- **Client ID:** 663489109439-u2f2araidp8n2o6u1q1ao40vdqclndvp.apps.googleusercontent.com
- **Tokens:** ✅ Configurados e funcionando
- **Auto-renovação:** ✅ Ativada
- **Gmail API:** ✅ Habilitada

## 📧 Como Usar

### Enviar Email Simples
```bash
curl -X POST http://173.249.22.2:3000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "destinatario@email.com",
    "subject": "Assunto do Email",
    "text": "Conteúdo do email em texto simples"
  }'
```

### Enviar Email HTML
```bash
curl -X POST http://173.249.22.2:3000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "destinatario@email.com",
    "subject": "Email HTML",
    "html": "<h1>Título</h1><p>Conteúdo em HTML</p>"
  }'
```

### Endpoints Disponíveis
- `GET /health` - Verificar status do servidor
- `POST /api/send-email` - Enviar email
- `POST /mcp` - Endpoint MCP (send_email, get_profile)

## ✅ Teste Realizado
- **Para:** valdair3d@gmail.com
- **Message ID:** 1983d27a6bf2938b
- **Status:** Enviado com sucesso!

## 🔧 Manutenção

### Verificar Logs
```bash
ssh root@173.249.22.2
docker logs --tail 50 mcp-gmail
```

### Reiniciar Servidor
```bash
ssh root@173.249.22.2
docker restart mcp-gmail
```

### Verificar Status
```bash
curl http://173.249.22.2:3000/health
```

## 🎯 Próximos Passos
1. Integrar com o Liftlio para notificações
2. Criar templates de email
3. Adicionar queue para envios em massa
4. Implementar webhooks para tracking