#!/bin/bash

# Teste direto da Edge Function agente-liftlio v17
# Para verificar se o RAG está funcionando

SUPABASE_URL="https://suqjifkhmekcdflwowiw.supabase.co"
ANON_KEY="YOUR_ANON_KEY_HERE"

# Testar com a pergunta sobre menções
curl -X POST "$SUPABASE_URL/functions/v1/agente-liftlio" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "como estão as menções postadas hoje?",
    "context": {
      "currentPage": "/dashboard",
      "currentProject": {
        "id": "58",
        "name": "HW",
        "status": "active"
      },
      "availablePages": ["/dashboard", "/monitoring", "/mentions", "/settings", "/integrations"]
    },
    "userId": "f53387e1-1c36-4182-8c81-f7ae7677413c",
    "sessionId": "test-session-123"
  }' | jq .

# Testar com prompt mais específico
echo -e "\n\n=== Teste 2 - Prompt específico ==="
curl -X POST "$SUPABASE_URL/functions/v1/agente-liftlio" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "quais postagens foram realizadas em 13/07/2025?",
    "context": {
      "currentPage": "/dashboard",
      "currentProject": {
        "id": "58",
        "name": "HW",
        "status": "active"
      }
    },
    "userId": "f53387e1-1c36-4182-8c81-f7ae7677413c",
    "sessionId": "test-session-456"
  }' | jq .