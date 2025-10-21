#!/bin/bash

# =============================================
# GPT-Image-1 Wrapper with Auto-Load Environment
# Loads credentials internally - no exports needed!
# =============================================

# Load environment internally
ENV_FILE="/Users/valdair/Documents/Projetos/Liftlio/liftlio-react/.env"

if [ -f "$ENV_FILE" ]; then
    export OPENAI_API_KEY=$(grep "^OPENAI_API_KEY=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
else
    echo "❌ Error: .env file not found at $ENV_FILE" >&2
    exit 1
fi

# Call the actual script with all arguments
/Users/valdair/Documents/Projetos/Liftlio/.claude/scripts/gpt-image-1.sh "$@"
