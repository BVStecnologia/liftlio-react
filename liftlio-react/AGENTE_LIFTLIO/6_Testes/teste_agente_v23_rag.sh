#!/bin/bash

# Teste do Agente v23 com RAG corrigido
# Data: 14/01/2025

echo "=== Teste do Agente Liftlio v23 - RAG Corrigido ==="
echo ""

# URL da Edge Function
EDGE_FUNCTION_URL="https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-liftlio"

# Headers
HEADERS=(
  -H "Content-Type: application/json"
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I"
)

echo "1. Testando busca por mensagens agendadas..."
echo "----------------------------------------"

# Teste 1: Busca por mensagens agendadas
curl -X POST "$EDGE_FUNCTION_URL" \
  "${HEADERS[@]}" \
  -d '{
    "prompt": "quantas mensagens agendadas tenho?",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      },
      "currentPage": "/overview"
    },
    "userId": "5cf0af49-a15e-4ff6-80a8-e0db74cf2078",
    "sessionId": "test_session_v23"
  }' \
  -w "\n\nTempo de resposta: %{time_total}s\n" | jq '.'

echo ""
echo "2. Testando busca geral sobre o projeto..."
echo "----------------------------------------"

# Teste 2: Busca geral
curl -X POST "$EDGE_FUNCTION_URL" \
  "${HEADERS[@]}" \
  -d '{
    "prompt": "me fale sobre as menções do projeto",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      }
    },
    "userId": "5cf0af49-a15e-4ff6-80a8-e0db74cf2078",
    "sessionId": "test_session_v23_2"
  }' \
  -w "\n\nTempo de resposta: %{time_total}s\n" | jq '.'

echo ""
echo "3. Testando busca sem projeto (deve funcionar mas sem RAG)..."
echo "-------------------------------------------------------------"

# Teste 3: Sem projeto
curl -X POST "$EDGE_FUNCTION_URL" \
  "${HEADERS[@]}" \
  -d '{
    "prompt": "olá, como você pode me ajudar?",
    "userId": "5cf0af49-a15e-4ff6-80a8-e0db74cf2078",
    "sessionId": "test_session_v23_3"
  }' \
  -w "\n\nTempo de resposta: %{time_total}s\n" | jq '.'

echo ""
echo "=== Testes concluídos ==="