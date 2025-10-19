#!/bin/bash

# ============================================
# Video Qualifier - Production Deploy Script
# Deploy to VPS 173.249.22.2
# ============================================

set -e  # Exit on error

# ============================================
# Configuration
# ============================================
VPS_HOST="173.249.22.2"
VPS_USER="root"
VPS_PATH="/opt/liftlio-video-qualifier"
IMAGE_NAME="liftlio-video-qualifier"
CONTAINER_NAME="liftlio-video-qualifier-prod"
PORT="8000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# Functions
# ============================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================
# Pre-deployment Checks
# ============================================

log_info "Starting deployment to VPS ${VPS_HOST}..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    log_error ".env file not found! Copy .env.example and fill in credentials."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    log_error "Docker not installed! Please install Docker first."
    exit 1
fi

# Check SSH connection
log_info "Testing SSH connection to VPS..."
if ! ssh -o ConnectTimeout=5 ${VPS_USER}@${VPS_HOST} "echo 'SSH OK'" &> /dev/null; then
    log_error "Cannot connect to VPS via SSH. Check your connection."
    exit 1
fi

log_info "✅ Pre-deployment checks passed"

# ============================================
# Step 1: Build Docker Image
# ============================================

log_info "Building Docker image locally..."
docker build -t ${IMAGE_NAME}:latest .

log_info "✅ Docker image built successfully"

# ============================================
# Step 2: Save Image as TAR
# ============================================

log_info "Saving Docker image to TAR file..."
docker save ${IMAGE_NAME}:latest -o /tmp/${IMAGE_NAME}.tar

log_info "✅ Image saved to /tmp/${IMAGE_NAME}.tar"

# ============================================
# Step 3: Copy to VPS
# ============================================

log_info "Copying image to VPS (this may take a few minutes)..."

# Create directory on VPS
ssh ${VPS_USER}@${VPS_HOST} "mkdir -p ${VPS_PATH}"

# Copy TAR file
scp /tmp/${IMAGE_NAME}.tar ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/

# Copy .env file
scp .env ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/

log_info "✅ Files copied to VPS"

# ============================================
# Step 4: Deploy on VPS
# ============================================

log_info "Deploying on VPS..."

ssh ${VPS_USER}@${VPS_HOST} bash << 'ENDSSH'
set -e

cd /opt/liftlio-video-qualifier

echo "Loading Docker image..."
docker load -i liftlio-video-qualifier.tar

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

echo "Cleaning up TAR file..."
rm -f liftlio-video-qualifier.tar

echo "Checking container status..."
docker ps | grep liftlio-video-qualifier-prod

ENDSSH

log_info "✅ Container deployed and running on VPS"

# ============================================
# Step 5: Health Check
# ============================================

log_info "Waiting 10s for service to start..."
sleep 10

log_info "Performing health check..."
if curl -s -f http://${VPS_HOST}:${PORT}/health > /dev/null; then
    log_info "✅ Health check PASSED! Service is running."
else
    log_warn "⚠️ Health check failed. Check logs: ssh ${VPS_USER}@${VPS_HOST} 'docker logs ${CONTAINER_NAME}'"
fi

# ============================================
# Step 6: Cleanup Local Files
# ============================================

log_info "Cleaning up local files..."
rm -f /tmp/${IMAGE_NAME}.tar

# ============================================
# Deployment Complete
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
