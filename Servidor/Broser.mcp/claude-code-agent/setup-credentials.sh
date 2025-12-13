#!/bin/bash
# =============================================================================
# LIFTLIO BROWSER AGENT v2 - Setup Credentials
# =============================================================================
# Este script copia suas credenciais Claude Max para os volumes Docker
# Executar ANTES do docker-compose up
# =============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}=============================================="
echo "  LIFTLIO BROWSER AGENT v2 - Setup"
echo -e "==============================================${NC}"
echo ""

# Detectar home do usuario
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows (Git Bash / MSYS)
    CLAUDE_HOME="$USERPROFILE/.claude"
    CLAUDE_CONFIG="$USERPROFILE/.claude.json"
else
    # Linux / macOS
    CLAUDE_HOME="$HOME/.claude"
    CLAUDE_CONFIG="$HOME/.claude.json"
fi

CREDS_FILE="$CLAUDE_HOME/.credentials.json"

echo -e "${YELLOW}[1/5] Verificando credenciais locais...${NC}"

if [ ! -f "$CREDS_FILE" ]; then
    echo -e "${RED}[ERROR] Arquivo de credenciais nao encontrado: $CREDS_FILE${NC}"
    echo ""
    echo "Para gerar credenciais, execute:"
    echo "  claude"
    echo "  > /login"
    echo ""
    exit 1
fi

# Verificar se tem subscriptionType: max
if ! grep -q '"subscriptionType".*"max"' "$CREDS_FILE" 2>/dev/null; then
    echo -e "${YELLOW}[WARNING] Nao foi possivel confirmar plano Max no arquivo de credenciais${NC}"
    echo "Continuando mesmo assim..."
fi

echo -e "${GREEN}[OK] Credenciais encontradas!${NC}"

echo ""
echo -e "${YELLOW}[2/5] Criando volumes Docker...${NC}"

# Criar volumes se nao existirem
docker volume create claude-credentials 2>/dev/null || true
docker volume create claude-config 2>/dev/null || true

echo -e "${GREEN}[OK] Volumes criados!${NC}"

echo ""
echo -e "${YELLOW}[3/5] Copiando credenciais para volume...${NC}"

# Criar container temporario para copiar arquivos
docker run --rm \
    -v claude-credentials:/credentials \
    -v "$(cygpath -w "$CREDS_FILE" 2>/dev/null || echo "$CREDS_FILE")":/src/.credentials.json:ro \
    alpine sh -c "cp /src/.credentials.json /credentials/.credentials.json && chmod 644 /credentials/.credentials.json"

echo -e "${GREEN}[OK] Credenciais copiadas!${NC}"

echo ""
echo -e "${YELLOW}[4/5] Criando configuracao base...${NC}"

# Criar .claude.json com hasCompletedOnboarding
docker run --rm \
    -v claude-config:/config \
    alpine sh -c 'cat > /config/.claude.json << EOF
{
  "hasCompletedOnboarding": true,
  "theme": "dark",
  "autoUpdaterStatus": "disabled",
  "hasAcknowledgedCostThreshold": true,
  "preferredNotifChannel": "none"
}
EOF
chmod 644 /config/.claude.json'

echo -e "${GREEN}[OK] Configuracao criada!${NC}"

echo ""
echo -e "${YELLOW}[5/5] Verificando...${NC}"

# Verificar conteudo
echo -e "${BLUE}  Volume claude-credentials:${NC}"
docker run --rm -v claude-credentials:/data alpine ls -la /data/

echo ""
echo -e "${BLUE}  Volume claude-config:${NC}"
docker run --rm -v claude-config:/data alpine ls -la /data/

echo ""
echo -e "${GREEN}=============================================="
echo "  SETUP COMPLETO!"
echo -e "==============================================${NC}"
echo ""
echo "Proximo passo: iniciar os containers"
echo ""
echo -e "  ${YELLOW}docker-compose up -d${NC}"
echo ""
echo "Para testar:"
echo ""
echo -e "  ${YELLOW}curl http://localhost:10100/health${NC}"
echo ""
