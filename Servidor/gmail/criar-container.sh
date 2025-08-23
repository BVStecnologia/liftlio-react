#!/bin/bash

# Carregar variáveis de ambiente
source "$(dirname "$0")/../../.env"

echo "🚀 Criando container Docker do Gmail MCP no servidor"
echo "=================================================="

sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no $SSH_USER@$SSH_HOST << 'EOF'

# Parar e remover container antigo se existir
docker stop gmail-mcp-new 2>/dev/null || true
docker rm gmail-mcp-new 2>/dev/null || true

# Criar container diretamente
echo "Criando container..."
docker run -d \
  --name gmail-mcp-new \
  --restart unless-stopped \
  -p 3002:3000 \
  -v /root/.gmail-mcp:/root/.gmail-mcp \
  -e GMAIL_OAUTH_PATH=/root/.gmail-mcp/gcp-oauth.keys.json \
  -e GMAIL_CREDENTIALS_PATH=/root/.gmail-mcp/credentials.json \
  -it \
  node:20-alpine \
  sh -c "npm install -g @gongrzhe/server-gmail-autoauth-mcp && npx @gongrzhe/server-gmail-autoauth-mcp"

echo "Aguardando container iniciar..."
sleep 15

echo "Status do container:"
docker ps | grep gmail-mcp-new

echo "Logs:"
docker logs gmail-mcp-new --tail 50

echo "✅ Container criado na porta 3002!"

EOF