#!/bin/bash

# Teste com Múltiplos Projetos - Agente v22
# Data: 14/01/2025
# Objetivo: Testar se o agente respeita o contexto de diferentes projetos

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I"
URL="https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-liftlio"

echo "🔍 TESTE DE MÚLTIPLOS PROJETOS - AGENTE v22"
echo "==========================================="
echo ""

# Função para testar projeto
test_project() {
    local project_id="$1"
    local project_name="$2"
    local test_name="$3"
    
    echo "🏢 TESTANDO PROJETO: $project_name (ID: $project_id)"
    echo "-------------------------------------------"
    
    # Pergunta sobre métricas do projeto
    response=$(curl -s -X POST $URL \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ANON_KEY" \
      -d "{
        \"prompt\": \"Me dê um resumo das métricas e mensagens agendadas\",
        \"context\": {
          \"currentProject\": {
            \"id\": \"$project_id\",
            \"name\": \"$project_name\"
          }
        },
        \"userId\": \"test-user-123\",
        \"sessionId\": \"test-project-$project_id\"
      }")
    
    # Extrair métricas
    echo "📊 Resposta do Agente:"
    echo "$response" | jq -r '.content' 2>/dev/null | head -n 10
    echo ""
    
    echo "📈 Métricas Detectadas:"
    echo "$response" | jq '{
        projeto_mencionado: (.content | contains("'"$project_name"'")),
        mensagens_agendadas: .debug.scheduledMessages,
        rag_resultados: .debug.ragResultsCount,
        tem_dados_rag: .hasRAGData
    }' 2>/dev/null
    
    echo ""
    echo "==========================================="
    echo ""
}

# Teste 1: Projeto 58 (HW)
test_project "58" "HW" "Projeto com dados"

# Teste 2: Projeto 71 (se existir)
test_project "71" "Projeto 71" "Outro projeto"

# Teste 3: Projeto inexistente
test_project "999" "Projeto Teste" "Projeto sem dados"

# Teste 4: Sem projeto no contexto
echo "🚫 TESTE SEM PROJETO NO CONTEXTO"
echo "-------------------------------------------"

response_no_project=$(curl -s -X POST $URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "prompt": "Quantas mensagens estão agendadas?",
    "context": {
      "currentPage": "/dashboard"
    },
    "userId": "test-user-123",
    "sessionId": "test-no-project"
  }')

echo "📊 Resposta sem projeto:"
echo "$response_no_project" | jq -r '.content' 2>/dev/null
echo ""

# Teste 5: Mudança de contexto de projeto na mesma sessão
echo "🔄 TESTE DE MUDANÇA DE CONTEXTO"
echo "-------------------------------------------"

# Primeira pergunta - Projeto 58
echo "1️⃣ Pergunta sobre Projeto 58:"
response_ctx1=$(curl -s -X POST $URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "prompt": "Quantas menções temos?",
    "context": {
      "currentProject": {
        "id": "58",
        "name": "HW"
      }
    },
    "userId": "test-user-456",
    "sessionId": "test-context-change"
  }')

echo "$response_ctx1" | jq -r '.content' 2>/dev/null | head -n 5
echo ""

# Segunda pergunta - Mesmo usuário, mesma sessão, projeto diferente
echo "2️⃣ Mesma sessão, mas agora Projeto 71:"
response_ctx2=$(curl -s -X POST $URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "prompt": "E quantas menções temos agora?",
    "context": {
      "currentProject": {
        "id": "71",
        "name": "Outro Projeto"
      }
    },
    "userId": "test-user-456",
    "sessionId": "test-context-change"
  }')

echo "$response_ctx2" | jq -r '.content' 2>/dev/null | head -n 5
echo ""

echo "✅ TESTES CONCLUÍDOS!"
echo ""
echo "📌 Verificações Importantes:"
echo "1. O agente deve respeitar o ID do projeto no contexto"
echo "2. Métricas devem ser diferentes para cada projeto"
echo "3. Sem projeto, deve avisar que precisa selecionar um"
echo "4. Mudança de contexto deve refletir dados do novo projeto"
echo ""
echo "⚠️  ATENÇÃO: Se todos os projetos mostrarem os mesmos dados,"
echo "    há um problema no isolamento por projeto!"