#!/bin/bash
# =============================================
# Import Functions from LIVE to LOCAL in Batches
# This script uses MCP agent to export functions
# and applies them directly to local PostgreSQL
# =============================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

CONTAINER="supabase_db_Supabase"
TOTAL_FUNCTIONS=287
CURRENT_FUNCTIONS=17
REMAINING=$((TOTAL_FUNCTIONS - CURRENT_FUNCTIONS))

echo -e "${YELLOW}📦 Batch Function Import${NC}"
echo "========================================"
echo "Total functions needed: $TOTAL_FUNCTIONS"
echo "Already in local DB: $CURRENT_FUNCTIONS"
echo "To import: $REMAINING"
echo ""

# Function to import a specific range
import_batch() {
    local BATCH_NAME=$1
    local PATTERN=$2

    echo -e "${YELLOW}Processing batch: $BATCH_NAME${NC}"

    # Count functions in this batch
    COUNT=$(docker exec $CONTAINER psql -U postgres -d postgres -t -c "
        SELECT COUNT(*)
        FROM pg_proc p
        LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname $PATTERN
          AND p.proname NOT LIKE 'vector%'
          AND p.proname NOT LIKE 'hstore%'
          AND p.proname NOT LIKE 'dblink%'
          AND p.proname NOT LIKE 'http%'
          AND p.prolang IN (SELECT oid FROM pg_language WHERE lanname IN ('plpgsql', 'sql'));
    " | tr -d ' ')

    echo "Functions in batch: $COUNT"

    if [ "$COUNT" -eq "0" ]; then
        echo -e "${YELLOW}⚠️  Batch is empty, skipping${NC}"
        return
    fi

    echo -e "${GREEN}✓ Batch ready${NC}"
    echo ""
}

# Alphabetical batches
import_batch "A-D" "~ '^[a-dA-D]'"
import_batch "E-I" "~ '^[e-iE-I]'"
import_batch "J-M" "~ '^[j-mJ-M]'"
import_batch "N-R" "~ '^[n-rN-R]'"
import_batch "S-V" "~ '^[s-vS-V]'"
import_batch "W-Z" "~ '^[w-zW-Z]'"

echo ""
echo -e "${GREEN}✅ Batch analysis complete${NC}"
echo ""
echo "Next step: Use Claude MCP agent to export each batch"
