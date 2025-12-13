#!/bin/bash
# =============================================================================
# LIFTLIO BROWSER AGENT v2 - Build Script
# =============================================================================

set -e

echo "=============================================="
echo "  LIFTLIO BROWSER AGENT v2 - Build"
echo "=============================================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se .env existe
if [ ! -f .env ]; then
    echo -e "${YELLOW}[WARNING] .env file not found!${NC}"
    echo "Copy .env.example to .env and fill in the values"
    echo ""

    if [ -f .env.example ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
        echo -e "${YELLOW}Please edit .env with your credentials before running!${NC}"
    fi
fi

# Verificar token OAuth
source .env 2>/dev/null || true
if [ -z "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
    echo -e "${RED}[ERROR] CLAUDE_CODE_OAUTH_TOKEN not set in .env${NC}"
    echo "Generate token with: claude setup-token"
    exit 1
fi

echo -e "${GREEN}[1/4] Building agent image...${NC}"
docker build -t liftlio-claude-code:latest .

echo ""
echo -e "${GREEN}[2/4] Building orchestrator image...${NC}"
docker build -t liftlio-orchestrator:latest ./orchestrator

echo ""
echo -e "${GREEN}[3/4] Creating networks and volumes...${NC}"
docker network create liftlio-network 2>/dev/null || true

echo ""
echo -e "${GREEN}[4/4] Build complete!${NC}"
echo ""
echo "=============================================="
echo "  Next steps:"
echo "=============================================="
echo ""
echo "1. Start the orchestrator:"
echo "   docker-compose up -d"
echo ""
echo "2. Test a task:"
echo "   curl -X POST http://localhost:10100/agent/task \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"projectId\": \"1\", \"task\": \"Go to google.com and tell me the page title\"}'"
echo ""
echo "3. Check status:"
echo "   curl http://localhost:10100/health"
echo ""
