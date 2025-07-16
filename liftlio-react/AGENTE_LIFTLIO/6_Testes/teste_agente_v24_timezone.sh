#!/bin/bash

# Teste do Agente v24 com correção de timezone
# Data: 14/01/2025

echo "=== Teste do Agente Liftlio v24 - Timezone Corrigido ==="
echo ""

# URL da Edge Function
EDGE_FUNCTION_URL="https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-liftlio"

# Headers
HEADERS=(
  -H "Content-Type: application/json"
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I"
)

echo "1. Testando busca por mensagens agendadas (verificar timezone)..."
echo "-------------------------------------------------------------"

# Teste 1: Busca por mensagens agendadas
curl -X POST "$EDGE_FUNCTION_URL" \
  "${HEADERS[@]}" \
  -d '{
    "prompt": "quais são minhas próximas mensagens agendadas?",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      },
      "currentPage": "/settings"
    },
    "userId": "5cf0af49-a15e-4ff6-80a8-e0db74cf2078",
    "sessionId": "test_session_v24_timezone"
  }' \
  -w "\n\nTempo de resposta: %{time_total}s\n" | jq '.response'

echo ""
echo "=== Verificando se as datas aparecem com (Horário de Brasília) ==="