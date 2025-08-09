#!/bin/bash

# ============================================
# Deploy do Liftlio Analytics para Produção
# ============================================
# Servidor: 173.249.22.2
# Porta: 3100
# Container: liftlio-analytics-prod

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Deploy do Liftlio Analytics${NC}"
echo ""

# Verificar .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}Criando .env com credenciais padrão...${NC}"
    cat > .env << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://suqjifkhmekcdflwowiw.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I

# Server Configuration
PORT=3000
NODE_ENV=production
EOF
fi

# Criar pacote
echo -e "${YELLOW}📦 Criando pacote de deploy...${NC}"
zip -q analytics.zip server.js track.js package.json Dockerfile .env

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📋 INSTRUÇÕES DE DEPLOY:${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. Copie o arquivo para o servidor:"
echo -e "${BLUE}   scp analytics.zip root@173.249.22.2:/opt/containers/liftlio-analytics/${NC}"
echo ""
echo "2. Conecte ao servidor:"
echo -e "${BLUE}   ssh root@173.249.22.2${NC}"
echo ""
echo "3. Execute no servidor:"
echo -e "${BLUE}   cd /opt/containers/liftlio-analytics${NC}"
echo -e "${BLUE}   unzip -o analytics.zip${NC}"
echo -e "${BLUE}   docker-compose -f docker-compose.prod.yml down${NC}"
echo -e "${BLUE}   docker-compose -f docker-compose.prod.yml build${NC}"
echo -e "${BLUE}   docker-compose -f docker-compose.prod.yml up -d${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📊 Endpoints em produção:"
echo "   Health: http://173.249.22.2:3100/health"
echo "   Script: http://173.249.22.2:3100/track.js"
echo ""
echo "📝 Usar no HTML:"
echo '   <script src="http://173.249.22.2:3100/track.js" data-project="58"></script>'
echo ""

# Limpar
rm -f analytics.zip