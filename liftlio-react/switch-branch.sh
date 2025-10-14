#!/bin/bash

# Liftlio Branch Switcher 🚀
# Sincroniza Git branch com Supabase branch automaticamente

BRANCH=$1

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

case $BRANCH in
  dev)
    echo -e "${GREEN}🔄 Switching to DEV environment...${NC}"

    # 1. Switch Git branch
    git checkout dev

    # 2. Update .env.development link
    rm -f .env.development
    ln -s .env.development.dev .env.development

    # 3. Link Supabase to DEV
    cd supabase/supabase 2>/dev/null && supabase link --project-ref cdnzajygbcujwcaoswpi 2>/dev/null
    cd ../..

    echo -e "${GREEN}✅ Switched to DEV${NC}"
    echo -e "${GREEN}📍 Git Branch: dev${NC}"
    echo -e "${GREEN}🌿 Supabase: cdnzajygbcujwcaoswpi (DEV)${NC}"
    echo -e "${GREEN}🟢 Environment: DEV${NC}"
    echo ""
    echo "Run: npm start"
    ;;

  main)
    echo -e "${BLUE}🔄 Switching to MAIN environment...${NC}"

    # 1. Switch Git branch
    git checkout main

    # 2. Update .env.development link
    rm -f .env.development
    ln -s .env.development.main .env.development

    # 3. Link Supabase to MAIN
    cd supabase/supabase 2>/dev/null && supabase link --project-ref suqjifkhmekcdflwowiw 2>/dev/null
    cd ../..

    echo -e "${BLUE}✅ Switched to MAIN${NC}"
    echo -e "${BLUE}📍 Git Branch: main${NC}"
    echo -e "${BLUE}🌿 Supabase: suqjifkhmekcdflwowiw (MAIN/LIVE)${NC}"
    echo -e "${BLUE}🔵 Environment: MAIN${NC}"
    echo ""
    echo "Run: npm start"
    ;;

  status)
    CURRENT_BRANCH=$(git branch --show-current)
    if [ -L ".env.development" ]; then
      ENV_LINK=$(readlink .env.development)
    else
      ENV_LINK="Not a symlink"
    fi

    echo "📊 Current Status:"
    echo "Git Branch: $CURRENT_BRANCH"
    echo "Env Link: $ENV_LINK"

    if [ -f ".env.development" ]; then
      SUPABASE_URL=$(grep REACT_APP_SUPABASE_URL .env.development | cut -d '=' -f2)
      if [[ $SUPABASE_URL == *"cdnzajygbcujwcaoswpi"* ]]; then
        echo -e "${GREEN}Environment: DEV 🟢${NC}"
      elif [[ $SUPABASE_URL == *"suqjifkhmekcdflwowiw"* ]]; then
        echo -e "${BLUE}Environment: MAIN 🔵${NC}"
      else
        echo -e "${RED}Environment: UNKNOWN ⚠️${NC}"
      fi
    fi
    ;;

  *)
    echo -e "${RED}❌ Usage: ./switch-branch.sh [dev|main|status]${NC}"
    echo ""
    echo "Commands:"
    echo "  dev    - Switch to DEV branch (cdnzajygbcujwcaoswpi)"
    echo "  main   - Switch to MAIN branch (suqjifkhmekcdflwowiw)"
    echo "  status - Show current configuration"
    exit 1
    ;;
esac