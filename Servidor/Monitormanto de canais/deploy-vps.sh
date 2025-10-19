#!/bin/bash

# ============================================
# Video Qualifier - VPS Deploy (Build Remoto)
# Build e deploy direto no VPS 173.249.22.2
# ============================================

set -e  # Exit on error

# ============================================
# Configuration
# ============================================
VPS_HOST="173.249.22.2"
VPS_USER="root"
VPS_PATH="/opt/liftlio-video-qualifier"
CONTAINER_NAME="liftlio-video-qualifier-prod"
PORT="8000"
SSH_KEY="$HOME/.ssh/contabo_key"
SSH_OPTS="-i ${SSH_KEY} -o StrictHostKeyChecking=no"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# ============================================
# Pre-flight checks
# ============================================

log_info "🚀 Starting VPS deployment..."

# Check .env file
if [ ! -f ".env" ]; then
    log_warn ".env file not found! Copy .env.example and fill credentials."
    exit 1
fi

# Check SSH connection
log_info "Testing SSH connection..."
if ! ssh ${SSH_OPTS} -o ConnectTimeout=5 ${VPS_USER}@${VPS_HOST} "echo 'SSH OK'" &> /dev/null; then
    log_warn "Cannot connect to VPS. Check SSH connection."
    exit 1
fi

log_info "✅ SSH connection OK"

# ============================================
# Deploy to VPS
# ============================================

log_info "Creating directory on VPS..."
ssh ${SSH_OPTS} ${VPS_USER}@${VPS_HOST} "mkdir -p ${VPS_PATH}"

log_info "Copying project files to VPS..."
rsync -avz -e "ssh ${SSH_OPTS}" --exclude='venv' --exclude='__pycache__' --exclude='*.pyc' \
    --exclude='server*.log' --exclude='.git' \
    ./ ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/

log_info "✅ Files copied successfully"

# ============================================
# Build and Run on VPS
# ============================================

log_info "Building Docker image on VPS..."

ssh ${SSH_OPTS} ${VPS_USER}@${VPS_HOST} bash << 'ENDSSH'
set -e

cd /opt/liftlio-video-qualifier

echo "Building Docker image..."
docker build -t liftlio-video-qualifier:latest .

echo "Stopping existing container (if any)..."
docker stop liftlio-video-qualifier-prod 2>/dev/null || true
docker rm liftlio-video-qualifier-prod 2>/dev/null || true

echo "Starting new container..."
docker run -d \
    --name liftlio-video-qualifier-prod \
    --restart unless-stopped \
    -p 8000:8000 \
    --env-file .env \
    liftlio-video-qualifier:latest

echo "Container started successfully!"
docker ps | grep liftlio-video-qualifier-prod

ENDSSH

log_info "✅ Container deployed and running"

# ============================================
# Health Check
# ============================================

log_info "Waiting 10s for service to start..."
sleep 10

log_info "Performing health check..."
if curl -s -f http://${VPS_HOST}:${PORT}/health > /dev/null; then
    log_info "✅ Health check PASSED!"
else
    log_warn "⚠️ Health check failed. Check logs: ssh ${VPS_USER}@${VPS_HOST} 'docker logs ${CONTAINER_NAME}'"
fi

# ============================================
# Summary
# ============================================

echo ""
echo "============================================"
log_info "🎉 Deployment complete!"
echo "============================================"
log_info "Service URL: http://${VPS_HOST}:${PORT}"
log_info "Health: http://${VPS_HOST}:${PORT}/health"
log_info "Docs: http://${VPS_HOST}:${PORT}/docs"
echo ""
log_info "Useful commands:"
echo "  - View logs: ssh ${VPS_USER}@${VPS_HOST} 'docker logs -f ${CONTAINER_NAME}'"
echo "  - Restart: ssh ${VPS_USER}@${VPS_HOST} 'docker restart ${CONTAINER_NAME}'"
echo "  - Stop: ssh ${VPS_USER}@${VPS_HOST} 'docker stop ${CONTAINER_NAME}'"
echo "============================================"
