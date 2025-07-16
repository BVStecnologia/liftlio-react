#!/bin/bash

# Script para processar mensagens agendadas via Edge Function
# Data: 14/01/2025

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I"
URL="https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/process-rag-batch"

echo "🔄 Processando mensagens agendadas do projeto 58..."
echo "================================================"
echo ""

# Chamar Edge Function para processar batch
response=$(curl -s -X POST $URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "tables": ["Settings messages posts"],
    "projectId": 58,
    "limit": 20
  }')

echo "📊 Resultado do processamento:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"

echo ""
echo "✅ Processamento concluído!"
echo ""

# Agora testar o agente com perguntas sobre mensagens agendadas
echo "🧪 Testando agente após processamento..."
echo "========================================="
echo ""

# Teste 1: Pergunta sobre mensagens agendadas
echo "📝 Teste 1: Quantas mensagens agendadas?"
curl -s -X POST https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-liftlio \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "prompt": "quantas mensagens estão agendadas para hoje?",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      }
    },
    "userId": "test-rag-fixed",
    "sessionId": "test-after-fix-1"
  }' | jq -r '.content' 2>/dev/null

echo ""
echo "📝 Teste 2: Detalhes das mensagens"
curl -s -X POST https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-liftlio \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "prompt": "me mostre o conteúdo das mensagens agendadas para hoje",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      }
    },
    "userId": "test-rag-fixed",
    "sessionId": "test-after-fix-2"
  }' | jq -r '.content' 2>/dev/null

echo ""
echo "🎉 Testes concluídos!"