#!/bin/bash

# Teste Final v22 Corrigida - Foco em RAG e Mensagens Agendadas
# Data: 14/07/2025

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I"
URL="https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-liftlio"

echo "🧪 TESTE FINAL V22 - CORREÇÕES APLICADAS"
echo "========================================"
echo ""

# Teste 1: Mensagens Agendadas
echo "📅 TESTE 1: Mensagens Agendadas"
echo "--------------------------------"
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
    "userId": "test-final",
    "sessionId": "final-1"
  }' | jq '{
    resposta: .content,
    rag_ativo: .hasRAGData,
    rag_resultados: .debug.ragResultsCount,
    mensagens_agendadas: .debug.scheduledMessages,
    versao: .debug.version
  }'

echo ""
echo "📝 TESTE 2: RAG - Busca por Earnings"
echo "------------------------------------"
curl -s -X POST $URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "prompt": "mostre menções sobre earnings",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      }
    },
    "userId": "test-final",
    "sessionId": "final-2"
  }' | jq '{
    tem_rag: .hasRAGData,
    resultados_rag: .debug.ragResultsCount,
    tempo_busca: .debug.ragSearchTime,
    resposta_resumo: (.content | .[0:200] + "...")
  }'

echo ""
echo "🔍 TESTE 3: RAG - Detalhes Mensagens Agendadas"
echo "----------------------------------------------"
curl -s -X POST $URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "prompt": "mostre detalhes das mensagens agendadas",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      }
    },
    "userId": "test-final",
    "sessionId": "final-3"
  }' | jq '{
    rag_funcionando: .hasRAGData,
    total_resultados: .debug.ragResultsCount,
    categorias: .debug.categoriesDetected,
    agendadas_detectadas: .debug.scheduledMessages
  }'

echo ""
echo "⏰ TESTE 4: RAG - Busca Temporal"
echo "---------------------------------"
curl -s -X POST $URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "prompt": "o que foi postado às 14:11?",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      }
    },
    "userId": "test-final",
    "sessionId": "final-4"
  }' | jq '{
    rag_ativo: .hasRAGData,
    resultados: .debug.ragResultsCount,
    resposta_inicio: (.content | .[0:150] + "...")
  }'

echo ""
echo "✅ TESTE 5: Métricas Gerais"
echo "----------------------------"
curl -s -X POST $URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "prompt": "faça um resumo completo do projeto HW",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      }
    },
    "userId": "test-final",
    "sessionId": "final-5"
  }' | jq '{
    tem_dados: (.content | contains("231")),
    agendadas_mencionadas: (.content | contains("agendadas")),
    rag_usado: .hasRAGData
  }'

echo ""
echo "🏁 TESTES FINALIZADOS!"
echo "======================"