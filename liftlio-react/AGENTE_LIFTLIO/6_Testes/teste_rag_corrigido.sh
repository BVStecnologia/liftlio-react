#!/bin/bash

# Teste do agente após correção do RAG
# Data: 14/01/2025

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I"
URL="https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-liftlio"

echo "🧪 TESTE DO AGENTE APÓS CORREÇÃO DO RAG"
echo "========================================"
echo ""

# Teste 1: Pergunta simples sobre mensagens agendadas
echo "📝 Teste 1: Quantas mensagens agendadas?"
echo "----------------------------------------"
curl -s -X POST $URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "prompt": "quantas mensagens estão agendadas?",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      }
    },
    "userId": "test-rag-fixed",
    "sessionId": "session-fixed-1"
  }' | jq -r '.content' 2>/dev/null || echo "Erro na resposta"

echo ""
echo ""

# Teste 2: Detalhes das mensagens agendadas
echo "📝 Teste 2: Detalhes das mensagens agendadas"
echo "-------------------------------------------"
curl -s -X POST $URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "prompt": "mostre os detalhes das mensagens agendadas para hoje",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      }
    },
    "userId": "test-rag-fixed",
    "sessionId": "session-fixed-2"
  }' | jq -r '.content' 2>/dev/null || echo "Erro na resposta"

echo ""
echo ""

# Teste 3: Busca por conteúdo específico
echo "📝 Teste 3: Busca por Humanlike Writer"
echo "--------------------------------------"
curl -s -X POST $URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "prompt": "existe alguma mensagem agendada sobre Humanlike Writer?",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      }
    },
    "userId": "test-rag-fixed",
    "sessionId": "session-fixed-3"
  }' | jq -r '.content' 2>/dev/null || echo "Erro na resposta"

echo ""
echo "✅ Testes concluídos!"