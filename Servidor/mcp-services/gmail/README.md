# Gmail MCP Server

## 🚀 Status: Funcionando!

O servidor Gmail MCP está rodando no container Docker e funcionando perfeitamente.

## 📊 Informações do Servidor

- **Container**: `mcp-gmail`
- **Porta**: `3000`
- **URL**: `http://173.249.22.2:3000`
- **Endpoints**:
  - `GET /health` - Status do servidor
  - `POST /api/send-email` - Enviar email
  - `GET /sse` - Endpoint SSE para MCP

## 🔧 Configuração no Claude Code

```bash
# Remover configuração antiga (se existir)
claude mcp remove gmail

# Adicionar novo servidor
claude mcp add gmail -s user --transport sse "http://173.249.22.2:3000/sse"
```

## 📧 Teste de Envio de Email

```bash
# No servidor
ssh root@173.249.22.2
# Senha: Bvs20211993***

# Testar envio
echo '{"to":"valdair3d@gmail.com","subject":"Teste","text":"Olá!"}' | \
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" -d @-
```

## 🐳 Gerenciamento do Container

```bash
# Ver logs
docker logs mcp-gmail --tail 50

# Reiniciar
docker restart mcp-gmail

# Parar
docker stop mcp-gmail

# Iniciar
docker start mcp-gmail
```

## ✅ Funcionalidades

- ✅ Enviar emails com Gmail OAuth2
- ✅ Auto-renovação de tokens
- ✅ Suporte a HTML e texto plano
- ✅ Integração com Claude Code via SSE

## 📝 Notas

- O servidor usa OAuth2 com renovação automática de tokens
- As credenciais estão em `/root/.gmail-mcp/` no servidor
- O container reinicia automaticamente se houver falha