#!/bin/bash

# Liftlio Branch Switcher 🚀
# Sincroniza Git branch com Supabase branch automaticamente
# Suporta 3 ambientes: dev-supabase-local (Docker), dev (DEV remoto), main (LIVE)

BRANCH=$1

# Colors for output
PURPLE='\033[0;35m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

case $BRANCH in
  local|dev-supabase-local)
    echo -e "${PURPLE}🔄 Switching to LOCAL environment (Docker)...${NC}"

    # 1. Switch Git branch
    git checkout dev-supabase-local

    # 2. Remove symlinks and create .env.local (highest priority)
    rm -f .env.development
    cat > .env.local << 'EOF'
# 🛡️ AMBIENTE LOCAL - Supabase rodando via Docker
# Este arquivo sobrescreve TODOS os outros .env quando existe
# ⚠️ NUNCA fazer commit deste arquivo (está em .gitignore)

# Supabase LOCAL (Docker - 22 SQL Functions + 15 Edge Functions)
REACT_APP_SUPABASE_URL=http://127.0.0.1:54321
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Indicador de ambiente
REACT_APP_ENV_INDICATOR=LOCAL (Docker)

# Google OAuth (usar credenciais de DEV para testes locais)
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
REACT_APP_GOOGLE_CLIENT_SECRET=your-google-client-secret

# Analytics (desabilitado em local)
REACT_APP_ANALYTICS_URL=http://localhost:3001
REACT_APP_ANALYTICS_PROJECT_ID=117
EOF

    # 3. Supabase local (Docker) - não precisa link
    echo -e "${PURPLE}✅ Switched to LOCAL (Docker)${NC}"
    echo -e "${PURPLE}📍 Git Branch: dev-supabase-local${NC}"
    echo -e "${PURPLE}🌿 Supabase: Docker (localhost:54321)${NC}"
    echo -e "${PURPLE}🟣 Environment: LOCAL${NC}"
    echo -e "${PURPLE}📦 PostgreSQL: localhost:54322${NC}"
    echo -e "${PURPLE}🎛️  Studio: http://localhost:54323${NC}"
    echo ""
    echo -e "${PURPLE}⚡ Start services:${NC}"
    echo "  1. cd Supabase/supabase && supabase start"
    echo "  2. cd liftlio-react/supabase && supabase functions serve --env-file .env --no-verify-jwt"
    echo "  3. cd liftlio-react && npm start"
    ;;

  dev)
    echo -e "${GREEN}🔄 Switching to DEV environment (Remote)...${NC}"

    # 1. Switch Git branch
    git checkout dev

    # 2. Delete .env.local (para não sobrescrever) e criar symlink
    rm -f .env.local
    rm -f .env.development
    ln -s .env.development.dev .env.development

    # 3. Link Supabase to DEV
    cd supabase/supabase 2>/dev/null && supabase link --project-ref cdnzajygbcujwcaoswpi 2>/dev/null
    cd ../..

    echo -e "${GREEN}✅ Switched to DEV (Remote)${NC}"
    echo -e "${GREEN}📍 Git Branch: dev${NC}"
    echo -e "${GREEN}🌿 Supabase: cdnzajygbcujwcaoswpi (DEV)${NC}"
    echo -e "${GREEN}🟢 Environment: DEV${NC}"
    echo ""
    echo "Run: npm start"
    ;;

  main)
    echo -e "${BLUE}🔄 Switching to MAIN environment (LIVE)...${NC}"

    # 1. Switch Git branch
    git checkout main

    # 2. Delete .env.local (para não sobrescrever) e criar symlink
    rm -f .env.local
    rm -f .env.development
    ln -s .env.development.main .env.development

    # 3. Link Supabase to MAIN
    cd supabase/supabase 2>/dev/null && supabase link --project-ref suqjifkhmekcdflwowiw 2>/dev/null
    cd ../..

    echo -e "${BLUE}✅ Switched to MAIN (LIVE)${NC}"
    echo -e "${BLUE}📍 Git Branch: main${NC}"
    echo -e "${BLUE}🌿 Supabase: suqjifkhmekcdflwowiw (LIVE)${NC}"
    echo -e "${BLUE}🔵 Environment: PRODUCTION${NC}"
    echo -e "${RED}⚠️  CUIDADO: Mudanças afetam usuários reais!${NC}"
    echo ""
    echo "Run: npm start"
    ;;

  status)
    CURRENT_BRANCH=$(git branch --show-current)

    echo "📊 Current Status:"
    echo "Git Branch: $CURRENT_BRANCH"
    echo ""

    # Verificar qual arquivo .env está ativo
    if [ -f ".env.local" ]; then
      echo -e "${PURPLE}Active Config: .env.local (highest priority)${NC}"
      SUPABASE_URL=$(grep REACT_APP_SUPABASE_URL .env.local | cut -d '=' -f2)

      if [[ $SUPABASE_URL == *"127.0.0.1"* ]]; then
        echo -e "${PURPLE}Environment: LOCAL (Docker) 🟣${NC}"
        echo "Supabase: localhost:54321"
        echo "PostgreSQL: localhost:54322"
        echo "Studio: http://localhost:54323"
      fi
    elif [ -L ".env.development" ]; then
      ENV_LINK=$(readlink .env.development)
      echo "Active Config: $ENV_LINK (via symlink)"

      SUPABASE_URL=$(grep REACT_APP_SUPABASE_URL .env.development | cut -d '=' -f2)
      if [[ $SUPABASE_URL == *"cdnzajygbcujwcaoswpi"* ]]; then
        echo -e "${GREEN}Environment: DEV (Remote) 🟢${NC}"
        echo "Supabase: cdnzajygbcujwcaoswpi"
      elif [[ $SUPABASE_URL == *"suqjifkhmekcdflwowiw"* ]]; then
        echo -e "${BLUE}Environment: MAIN (LIVE) 🔵${NC}"
        echo "Supabase: suqjifkhmekcdflwowiw"
      fi
    else
      echo -e "${RED}Environment: UNKNOWN ⚠️${NC}"
      echo "No .env.local or .env.development found"
    fi
    ;;

  *)
    echo -e "${RED}❌ Usage: ./switch-branch.sh [local|dev|main|status]${NC}"
    echo ""
    echo "Commands:"
    echo -e "  ${PURPLE}local${NC}  - Switch to LOCAL (Docker localhost:54321)"
    echo -e "  ${GREEN}dev${NC}    - Switch to DEV branch (cdnzajygbcujwcaoswpi)"
    echo -e "  ${BLUE}main${NC}   - Switch to MAIN branch (suqjifkhmekcdflwowiw)"
    echo "  status - Show current configuration"
    echo ""
    echo "Aliases:"
    echo "  local = dev-supabase-local"
    exit 1
    ;;
esac
