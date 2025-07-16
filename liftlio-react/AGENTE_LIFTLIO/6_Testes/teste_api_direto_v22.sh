#!/bin/bash

# Teste Direto via API - Agente v22
# Data: 14/01/2025
# Objetivo: Testar agente diretamente via API simulando conversas reais

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I"
URL="https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-liftlio"

echo "🤖 TESTE DIRETO DO AGENTE v22 VIA API"
echo "======================================"
echo ""

# Função para exibir resposta formatada
show_response() {
    local response="$1"
    local test_name="$2"
    
    echo "📝 $test_name"
    echo "-----------------------------------"
    
    # Extrair e exibir a resposta do agente
    echo "$response" | jq -r '.content' 2>/dev/null || echo "Erro ao processar resposta"
    
    # Exibir métricas
    echo ""
    echo "📊 Métricas:"
    echo "$response" | jq '{
        rag_ativo: .hasRAGData,
        rag_resultados: .debug.ragResultsCount,
        mensagens_agendadas: .debug.scheduledMessages,
        tempo_busca: .debug.ragSearchTime,
        categorias: .debug.categoriesDetected
    }' 2>/dev/null || echo "Erro ao extrair métricas"
    
    echo ""
    echo "=========================================="
    echo ""
}

# Teste 1: Pergunta básica sobre mensagens agendadas
echo "🚀 Iniciando testes de conversa com o agente..."
echo ""

response1=$(curl -s -X POST $URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "prompt": "Olá! Quantas mensagens estão agendadas para o projeto HW?",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      },
      "currentPage": "/dashboard"
    },
    "userId": "00000000-0000-0000-0000-000000000000",
    "sessionId": "test-api-session-1"
  }')

show_response "$response1" "TESTE 1: Mensagens Agendadas"

# Teste 2: Busca por conteúdo específico
response2=$(curl -s -X POST $URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "prompt": "Existe alguma menção sobre earnings ou resultados financeiros?",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      }
    },
    "userId": "00000000-0000-0000-0000-000000000000",
    "sessionId": "test-api-session-2"
  }')

show_response "$response2" "TESTE 2: Busca por Earnings"

# Teste 3: Pergunta sobre horário específico
response3=$(curl -s -X POST $URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "prompt": "O que está agendado para ser postado às 14:11?",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      }
    },
    "userId": "00000000-0000-0000-0000-000000000000",
    "sessionId": "test-api-session-3"
  }')

show_response "$response3" "TESTE 3: Busca por Horário"

# Teste 4: Resumo geral
response4=$(curl -s -X POST $URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "prompt": "Me dê um resumo completo do projeto HW incluindo métricas e mensagens agendadas",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      }
    },
    "userId": "00000000-0000-0000-0000-000000000000",
    "sessionId": "test-api-session-4"
  }')

show_response "$response4" "TESTE 4: Resumo Completo"

# Teste 5: Conversa continuada (mesma sessão)
response5=$(curl -s -X POST $URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "prompt": "Pode me dar mais detalhes sobre essas mensagens agendadas?",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      }
    },
    "userId": "00000000-0000-0000-0000-000000000000",
    "sessionId": "test-api-session-4"
  }')

show_response "$response5" "TESTE 5: Conversa Continuada"

# Teste 6: Pergunta em inglês
response6=$(curl -s -X POST $URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "prompt": "How many scheduled messages are there for project HW?",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      }
    },
    "userId": "00000000-0000-0000-0000-000000000000",
    "sessionId": "test-api-session-6"
  }')

show_response "$response6" "TESTE 6: Pergunta em Inglês"

echo "✅ TESTES CONCLUÍDOS!"
echo ""
echo "📌 Resumo dos Testes:"
echo "- Teste 1: Mensagens agendadas básico"
echo "- Teste 2: Busca por conteúdo (earnings)"
echo "- Teste 3: Busca temporal (14:11)"
echo "- Teste 4: Resumo completo"
echo "- Teste 5: Conversa continuada"
echo "- Teste 6: Suporte multilíngue"
echo ""
echo "💡 Verifique se:"
echo "1. O agente está retornando o número correto de mensagens agendadas (2)"
echo "2. O RAG está encontrando resultados relevantes"
echo "3. As respostas estão naturais e sem IDs técnicos"
echo "4. O histórico de conversa está funcionando"
echo "5. O suporte a inglês/português está correto"