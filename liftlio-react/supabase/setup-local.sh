#!/bin/bash
# =============================================
# Supabase Local Setup Script
# Setup local development environment with LIVE schema
# =============================================

set -e  # Exit on error

echo "🚀 Supabase Local Development Setup"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to supabase directory
cd "$(dirname "$0")"
echo "📁 Working directory: $(pwd)"
echo ""

# Step 1: Login to Supabase
echo "🔑 Step 1/5: Login to Supabase"
echo "----------------------------------------"
echo "This will open your browser for authentication..."
supabase login
echo -e "${GREEN}✓ Login successful${NC}"
echo ""

# Step 2: Link to LIVE project (READ-ONLY)
echo "🔗 Step 2/5: Link to LIVE project (READ-ONLY)"
echo "----------------------------------------"
echo "Project: suqjifkhmekcdflwowiw (LIVE)"
echo -e "${YELLOW}⚠️  This is READ-ONLY - no changes will be made to LIVE${NC}"
supabase link --project-ref suqjifkhmekcdflwowiw
echo -e "${GREEN}✓ Linked to LIVE project${NC}"
echo ""

# Step 3: Pull schema from LIVE
echo "⬇️  Step 3/5: Pull schema from LIVE"
echo "----------------------------------------"
echo "This will download all 287 custom SQL functions..."
supabase db pull
echo -e "${GREEN}✓ Schema pulled successfully${NC}"
echo ""

# Step 4: Update .gitignore
echo "📝 Step 4/5: Update .gitignore"
echo "----------------------------------------"
if ! grep -q "supabase/.branches" .gitignore 2>/dev/null; then
    echo "supabase/.branches" >> .gitignore
    echo "supabase/.temp" >> .gitignore
    echo -e "${GREEN}✓ .gitignore updated${NC}"
else
    echo -e "${YELLOW}⚠️  .gitignore already configured${NC}"
fi
echo ""

# Step 5: Start local environment
echo "🐳 Step 5/5: Start local Supabase"
echo "----------------------------------------"
echo "Starting PostgreSQL + Studio + Edge Runtime..."
echo -e "${YELLOW}This may take 2-3 minutes on first run...${NC}"
supabase start

echo ""
echo "================================================"
echo -e "${GREEN}✅ SETUP COMPLETE!${NC}"
echo "================================================"
echo ""
echo "📊 Local Services:"
echo "   - Studio UI: http://localhost:54323"
echo "   - PostgreSQL: localhost:54322"
echo "   - API: http://localhost:54321"
echo ""
echo "🔧 Useful commands:"
echo "   - Stop:    supabase stop"
echo "   - Restart: supabase restart"
echo "   - Status:  supabase status"
echo "   - Logs:    supabase logs"
echo ""
echo "💾 Database connection string:"
supabase status | grep "DB URL" || echo "   Run 'supabase status' to see connection details"
echo ""
echo "🧠 Memory usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}" | head -10
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Your LIVE database was NOT modified${NC}"
echo -e "${YELLOW}   All functions are now in your local PostgreSQL${NC}"
echo ""
