#!/bin/bash

# =============================================
# Load Environment Variables Hook
# Runs at SessionStart to auto-load .env
# =============================================

ENV_FILE="/Users/valdair/Documents/Projetos/Liftlio/liftlio-react/.env"

if [ -f "$ENV_FILE" ]; then
    # Export only specific variables (safer than sourcing entire file)
    export OPENAI_API_KEY=$(grep "^OPENAI_API_KEY=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    export SUPABASE_URL=$(grep "^REACT_APP_SUPABASE_URL=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    export SUPABASE_ANON_KEY=$(grep "^REACT_APP_SUPABASE_ANON_KEY=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    export TRELLO_API_KEY=$(grep "^TRELLO_API_KEY=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    export TRELLO_TOKEN=$(grep "^TRELLO_TOKEN=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    export TRELLO_BOARD_ID=$(grep "^TRELLO_BOARD_ID=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")

    echo "✅ Environment variables loaded from .env (OpenAI + Supabase + Trello)" >&2
else
    echo "⚠️  .env file not found at $ENV_FILE" >&2
    exit 1
fi
