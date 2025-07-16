#!/bin/bash

# Script de teste completo para Edge Function agente-liftlio v17
# Objetivo: Diagnosticar por que o RAG não está retornando dados
# Data: 13/07/2025

# Configurações
SUPABASE_URL="https://suqjifkhmekcdflwowiw.supabase.co"
echo "Digite a ANON KEY do Supabase:"
read -s ANON_KEY
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== INICIANDO TESTES RAG v17 ===${NC}\n"

# Função para fazer request e analisar resposta
test_rag() {
    local test_name=$1
    local prompt=$2
    local expected_keyword=$3
    
    echo -e "${YELLOW}TESTE: $test_name${NC}"
    echo "Prompt: \"$prompt\""
    echo "Esperado encontrar: $expected_keyword"
    echo ""
    
    response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/agente-liftlio" \
      -H "apikey: $ANON_KEY" \
      -H "Authorization: Bearer $ANON_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"prompt\": \"$prompt\",
        \"context\": {
          \"currentProject\": {
            \"id\": \"58\",
            \"name\": \"HW\",
            \"status\": \"active\"
          },
          \"currentPage\": \"/dashboard\"
        },
        \"userId\": \"test-user-123\",
        \"sessionId\": \"test-session-$(date +%s)\"
      }")
    
    # Extrair campos importantes
    content=$(echo "$response" | jq -r '.content // "ERRO: Sem content"')
    has_rag=$(echo "$response" | jq -r '.hasRAGData // false')
    rag_count=$(echo "$response" | jq -r '.debug.ragResultsCount // 0')
    version=$(echo "$response" | jq -r '.debug.version // "unknown"')
    categories=$(echo "$response" | jq -r '.debug.categoriesDetected // []')
    optimized=$(echo "$response" | jq -r '.debug.promptOptimized // false')
    error=$(echo "$response" | jq -r '.error // null')
    
    # Verificar se há erro
    if [ "$error" != "null" ]; then
        echo -e "${RED}❌ ERRO NA RESPOSTA:${NC} $error"
        echo "Response completo:"
        echo "$response" | jq .
        echo ""
        return
    fi
    
    # Analisar resultados
    echo "📊 RESULTADOS:"
    echo "- Versão: $version"
    echo "- RAG ativo: $has_rag"
    echo "- Resultados RAG: $rag_count"
    echo "- Categorias detectadas: $categories"
    echo "- Prompt otimizado: $optimized"
    echo ""
    
    # Verificar se encontrou o esperado
    if [[ "$content" == *"$expected_keyword"* ]]; then
        echo -e "${GREEN}✅ SUCESSO: Encontrou '$expected_keyword' na resposta${NC}"
    else
        echo -e "${RED}❌ FALHA: Não encontrou '$expected_keyword' na resposta${NC}"
    fi
    
    # Mostrar preview da resposta
    echo ""
    echo "Preview da resposta (primeiros 300 chars):"
    echo "$content" | cut -c1-300
    echo "..."
    
    # Debug completo se não teve RAG
    if [ "$has_rag" = "false" ] || [ "$rag_count" = "0" ]; then
        echo ""
        echo -e "${RED}⚠️  ATENÇÃO: RAG não retornou dados!${NC}"
        echo "Response debug completo:"
        echo "$response" | jq '.debug'
    fi
    
    echo ""
    echo "----------------------------------------"
    echo ""
}

# TESTE 1: Pergunta genérica sobre menções
test_rag \
    "Menções postadas hoje" \
    "como estão as menções postadas hoje?" \
    "14:11"

# TESTE 2: Pergunta específica sobre horário
test_rag \
    "Postagem específica por horário" \
    "o que foi postado às 14:11?" \
    "earnings breakdown"

# TESTE 3: Busca por texto exato do conteúdo
test_rag \
    "Busca por texto exato" \
    "POSTAGEM REALIZADA" \
    "Humanlike Writer"

# TESTE 4: Pergunta sobre postagens de julho
test_rag \
    "Postagens de julho" \
    "listar postagens de 13 de julho de 2025" \
    "13/07/2025"

# TESTE 5: Pergunta sobre Humanlike Writer
test_rag \
    "Menções sobre Humanlike Writer" \
    "quais menções falam sobre Humanlike Writer?" \
    "affiliate content"

# TESTE 6: Pergunta muito específica
test_rag \
    "Conteúdo específico" \
    "postagem sobre earnings breakdown at 15:30" \
    "comprehensive"

# Resumo final
echo -e "${GREEN}=== TESTES CONCLUÍDOS ===${NC}"
echo ""
echo "Para analisar os logs do servidor, execute:"
echo "mcp__supabase__get_logs({ project_id: 'suqjifkhmekcdflwowiw', service: 'edge-function' })"
echo ""
echo "Para ver os embeddings processados, execute:"
echo "SELECT * FROM rag_embeddings WHERE project_id = 58 ORDER BY created_at DESC LIMIT 10;"