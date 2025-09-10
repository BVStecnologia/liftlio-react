#!/bin/bash

# YouTube Search Engine v5 - Deploy Seguro
# Deploy para servidor remoto com SSHPASS

echo "🚀 Iniciando deploy do YouTube Search Engine v5..."

# Configurações
SERVER="173.249.22.2"
REMOTE_DIR="/opt/containers/youtube-search-engine"
SSH_KEY="$HOME/.ssh/contabo_key"

echo "📦 Preparando arquivos..."

# Criar tarball com arquivos necessários
tar -czf youtube-search-v5.tar.gz \
  youtube_search_engine.py \
  requirements.txt \
  Dockerfile \
  docker-compose.yml \
  .env

echo "📤 Enviando para servidor..."

# Copiar para servidor
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
  youtube-search-v5.tar.gz root@$SERVER:/tmp/

echo "🔧 Configurando no servidor..."

# Executar comandos no servidor
SSHPASS="$SSH_PASS" sshpass -e ssh -o StrictHostKeyChecking=no root@$SERVER << 'REMOTE_COMMANDS'
set -e

echo "📂 Preparando diretório..."
mkdir -p /opt/containers/youtube-search-engine
cd /opt/containers/youtube-search-engine

echo "📦 Extraindo arquivos..."
tar -xzf /tmp/youtube-search-v5.tar.gz
rm /tmp/youtube-search-v5.tar.gz

echo "🐳 Build e Deploy com Docker..."
docker-compose down 2>/dev/null || true
docker-compose build
docker-compose up -d

echo "✅ Deploy concluído!"
echo ""
echo "🔍 Status dos containers:"
docker-compose ps

echo ""
echo "📝 Últimas logs:"
sleep 3
docker-compose logs --tail=15

REMOTE_COMMANDS

# Limpar arquivo temporário
rm youtube-search-v5.tar.gz

echo ""
echo "🎉 Deploy finalizado com sucesso!"
echo "📍 Serviço rodando em: http://$SERVER:8000"
echo "🏥 Health check: curl http://$SERVER:8000/health"