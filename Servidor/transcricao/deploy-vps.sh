#!/bin/bash
set -e

echo "🚀 Deploying Liftlio Transcription Service to VPS..."

VPS_HOST="173.249.22.2"
VPS_USER="root"
VPS_PATH="/opt/liftlio-transcricao"
SSH_KEY="$HOME/.ssh/contabo_key"

# Create tarball
echo "📦 Creating package..."
tar -czf transcricao-deploy.tar.gz \
  api.py \
  main.py \
  requirements.txt \
  dockerfile \
  docker-compose.yml \
  .env

# Copy to VPS
echo "📤 Uploading to VPS..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
  transcricao-deploy.tar.gz root@$VPS_HOST:/tmp/

# Deploy on VPS
echo "🔧 Deploying on VPS..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no root@$VPS_HOST << 'REMOTE_COMMANDS'
set -e

echo "📂 Preparing directory..."
mkdir -p /opt/liftlio-transcricao
cd /opt/liftlio-transcricao

echo "📦 Extracting files..."
tar -xzf /tmp/transcricao-deploy.tar.gz
rm /tmp/transcricao-deploy.tar.gz

echo "🐳 Building and starting Docker..."
docker network create liftlio-network 2>/dev/null || true
docker-compose down 2>/dev/null || true
docker-compose build
docker-compose up -d

echo ""
echo "✅ Deploy completed!"
echo ""
echo "🔍 Container status:"
docker ps | grep transcricao || docker ps

echo ""
echo "📝 Recent logs:"
sleep 3
docker logs liftlio-transcricao --tail 30

REMOTE_COMMANDS

# Cleanup
rm transcricao-deploy.tar.gz

echo ""
echo "🎉 Deploy finished successfully!"
echo "🔗 Service: http://$VPS_HOST:8081"
echo "🏥 Health: curl http://$VPS_HOST:8081/docs"
