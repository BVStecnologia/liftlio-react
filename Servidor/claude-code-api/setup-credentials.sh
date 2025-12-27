#!/bin/bash
# =============================================================================
# LIFTLIO CLAUDE CODE API - Setup Credentials
# =============================================================================
# Copies your Claude Max credentials to Docker volume
# Run BEFORE docker-compose up
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}=============================================="
echo "  LIFTLIO CLAUDE CODE API - Setup"
echo -e "==============================================${NC}"
echo ""

# Detect home directory
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash / MSYS)
    CLAUDE_HOME="$USERPROFILE/.claude"
else
    # Linux / macOS
    CLAUDE_HOME="$HOME/.claude"
fi

CREDS_FILE="$CLAUDE_HOME/.credentials.json"

echo -e "${YELLOW}[1/4] Checking local credentials...${NC}"

if [ ! -f "$CREDS_FILE" ]; then
    echo -e "${RED}[ERROR] Credentials file not found: $CREDS_FILE${NC}"
    echo ""
    echo "To generate credentials, run:"
    echo "  claude"
    echo "  > /login"
    echo ""
    exit 1
fi

echo -e "${GREEN}[OK] Credentials found!${NC}"

# Check for Max subscription
if grep -q '"subscriptionType".*"max"' "$CREDS_FILE" 2>/dev/null; then
    echo -e "${GREEN}[OK] Claude Max subscription confirmed!${NC}"
else
    echo -e "${YELLOW}[WARNING] Could not confirm Max subscription${NC}"
    echo "Continuing anyway..."
fi

echo ""
echo -e "${YELLOW}[2/4] Creating Docker volume...${NC}"

docker volume create claude-credentials 2>/dev/null || true
echo -e "${GREEN}[OK] Volume created!${NC}"

echo ""
echo -e "${YELLOW}[3/4] Copying credentials to volume...${NC}"

# Handle Windows paths
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    WIN_CREDS_FILE=$(cygpath -w "$CREDS_FILE" 2>/dev/null || echo "$CREDS_FILE")
    docker run --rm \
        -v claude-credentials:/credentials \
        -v "$WIN_CREDS_FILE":/src/.credentials.json:ro \
        alpine sh -c "cp /src/.credentials.json /credentials/.credentials.json && chmod 644 /credentials/.credentials.json"
else
    docker run --rm \
        -v claude-credentials:/credentials \
        -v "$CREDS_FILE":/src/.credentials.json:ro \
        alpine sh -c "cp /src/.credentials.json /credentials/.credentials.json && chmod 644 /credentials/.credentials.json"
fi

echo -e "${GREEN}[OK] Credentials copied!${NC}"

echo ""
echo -e "${YELLOW}[4/4] Creating base config...${NC}"

# Create .claude.json with hasCompletedOnboarding
docker run --rm \
    -v claude-credentials:/credentials \
    alpine sh -c 'cat > /credentials/.claude.json << EOF
{
  "hasCompletedOnboarding": true,
  "theme": "dark",
  "autoUpdaterStatus": "disabled",
  "hasAcknowledgedCostThreshold": true,
  "preferredNotifChannel": "none"
}
EOF
chmod 644 /credentials/.claude.json'

echo -e "${GREEN}[OK] Config created!${NC}"

echo ""
echo -e "${BLUE}Verifying volume contents:${NC}"
docker run --rm -v claude-credentials:/data alpine ls -la /data/

echo ""
echo -e "${GREEN}=============================================="
echo "  SETUP COMPLETE!"
echo -e "==============================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo -e "  ${YELLOW}1. Build and start:${NC}"
echo "     docker-compose up -d --build"
echo ""
echo -e "  ${YELLOW}2. Test:${NC}"
echo "     curl http://localhost:10200/health"
echo ""
echo -e "  ${YELLOW}3. Send a message:${NC}"
echo '     curl -X POST http://localhost:10200/chat \'
echo '       -H "Content-Type: application/json" \'
echo '       -d '"'"'{"message": "Hello, what is 2+2?"}'"'"
echo ""
