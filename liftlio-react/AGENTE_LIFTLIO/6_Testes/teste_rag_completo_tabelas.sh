#!/bin/bash

# Script de Teste Completo do RAG - Todas as Tabelas
# Testa se o agente consegue acessar dados de todas as 14 tabelas com RAG

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I"
URL="https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-liftlio"

echo "🧪 TESTE COMPLETO RAG - TODAS AS TABELAS"
echo "========================================"
echo ""

# Função para testar
test_question() {
    local table_name=$1
    local question=$2
    local expected_keywords=$3
    
    echo "📊 Tabela: $table_name"
    echo "❓ Pergunta: $question"
    echo "🔍 Esperado encontrar: $expected_keywords"
    
    RESPONSE=$(curl -X POST $URL \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ANON_KEY" \
      -d "{
        \"prompt\": \"$question\",
        \"context\": {
          \"currentProject\": {
            \"id\": \"58\",
            \"name\": \"HW\",
            \"status\": \"active\"
          },
          \"currentPage\": \"/dashboard\"
        },
        \"userId\": \"test-rag\",
        \"sessionId\": \"test-$(date +%s)\"
      }" \
      --silent)
    
    # Extrair conteúdo e verificar RAG
    CONTENT=$(echo $RESPONSE | jq -r '.content // "ERRO"')
    HAS_RAG=$(echo $RESPONSE | jq -r '.hasRAGData // false')
    
    echo "📝 Resposta: ${CONTENT:0:200}..."
    echo "🔧 RAG Ativo: $HAS_RAG"
    
    # Verificar se encontrou palavras esperadas
    if [[ "$CONTENT" == *"$expected_keywords"* ]]; then
        echo "✅ SUCESSO: Encontrou informação esperada!"
    else
        echo "❌ FALHA: Não encontrou '$expected_keywords'"
    fi
    
    echo "----------------------------------------"
    echo ""
    sleep 2
}

# TESTE 1: Mensagens
test_question "Mensagens" \
    "quais foram as últimas mensagens postadas?" \
    "postada"

# TESTE 2: Comentários Principais
test_question "Comentarios_Principais" \
    "mostre os comentários mais recentes" \
    "comentário"

# TESTE 3: Vídeos
test_question "Videos" \
    "quais vídeos estão sendo monitorados?" \
    "vídeo"

# TESTE 4: Canais
test_question "Canais" \
    "liste os principais canais do projeto" \
    "canal"

# TESTE 5: Video Analysis
test_question "Video_Analysis" \
    "qual a análise de sentimento dos vídeos?" \
    "análise"

# TESTE 6: Channel Analysis
test_question "Channel_Analysis" \
    "como estão os canais em termos de engajamento?" \
    "canal"

# TESTE 7: Keywords
test_question "Keywords" \
    "quais são as palavras-chave do projeto?" \
    "keyword"

# TESTE 8: Settings Messages Posts
test_question "Settings_messages_posts" \
    "quais são as configurações de postagem?" \
    "configuração"

# TESTE 9: Schedules
test_question "schedules" \
    "o que está agendado para postar?" \
    "agendado"

# TESTE 10: Temporal (Hoje)
test_question "Temporal" \
    "o que aconteceu hoje no projeto?" \
    "hoje"

# TESTE 11: Menções Específicas
test_question "Menções HW" \
    "mostre menções sobre Humanlike Writer" \
    "Humanlike"

# TESTE 12: Horário Específico
test_question "Horário" \
    "o que foi postado às 14:11?" \
    "14:11"

# TESTE 13: Status
test_question "Status" \
    "quais postagens tem status posted?" \
    "posted"

# TESTE 14: Conteúdo Específico
test_question "Conteúdo" \
    "procure por earnings breakdown" \
    "earnings"

echo "🏁 TESTE COMPLETO FINALIZADO!"
echo ""
echo "📊 RESUMO:"
echo "- Total de testes: 14"
echo "- Tabelas testadas: Todas com RAG habilitado"
echo "- Verificar quantos retornaram hasRAGData: true"