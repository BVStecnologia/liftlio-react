#!/bin/bash

# YouTube Search Engine v5 - Deploy Script
# Deploy para servidor remoto 173.249.22.2

echo "🚀 Iniciando deploy do YouTube Search Engine v5..."

# Servidor remoto
SERVER="173.249.22.2"
REMOTE_DIR="/opt/containers/youtube-search-engine"

echo "📦 Preparando arquivos..."

# Criar tarball com arquivos necessários
tar -czf youtube-search-v5.tar.gz \
  youtube_search_engine.py \
  requirements.txt \
  Dockerfile \
  docker-compose.yml \
  .env.example

echo "📤 Enviando para servidor..."

# Copiar para servidor
scp youtube-search-v5.tar.gz root@$SERVER:/tmp/

echo "🔧 Configurando no servidor..."

# Executar comandos no servidor
ssh root@$SERVER << 'REMOTE_COMMANDS'
set -e

echo "📂 Criando diretório..."
mkdir -p /opt/containers/youtube-search-engine
cd /opt/containers/youtube-search-engine

echo "📦 Extraindo arquivos..."
tar -xzf /tmp/youtube-search-v5.tar.gz
rm /tmp/youtube-search-v5.tar.gz

echo "🔐 Configurando variáveis de ambiente..."
if [ ! -f .env ]; then
  echo "⚠️  Arquivo .env não encontrado!"
  echo "Por favor, configure as variáveis de ambiente:"
  echo "  - YOUTUBE_API_KEY"
  echo "  - CLAUDE_API_KEY"
  echo "  - SUPABASE_URL"
  echo "  - SUPABASE_KEY"
  cp .env.example .env
  echo "📝 Edite o arquivo /opt/containers/youtube-search-engine/.env"
fi

echo "🐳 Fazendo build e deploy com Docker..."
docker-compose down || true
docker-compose build
docker-compose up -d

echo "✅ Deploy concluído!"
echo "🔍 Verificando status..."
sleep 5
docker-compose ps
docker-compose logs --tail=20

REMOTE_COMMANDS

echo "🎉 Deploy finalizado com sucesso!"
echo "📍 Serviço rodando em: http://$SERVER:8000"
echo "🏥 Health check: http://$SERVER:8000/health"