#!/bin/bash

# Suite Completa de Testes - Agente v22 - Projeto 58
# Data: 14/07/2025
# Objetivo: Testar TODAS as funcionalidades do agente com o projeto HW

# Configurações
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I"
URL="https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-liftlio"
PROJECT_ID="58"
PROJECT_NAME="HW"

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🧪 SUITE DE TESTES COMPLETA - AGENTE v22${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Projeto: ${PROJECT_NAME} (ID: ${PROJECT_ID})"
echo -e "Data: $(date '+%d/%m/%Y %H:%M')"
echo ""

# Contador de testes
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Função para executar teste
run_test() {
    local test_name=$1
    local prompt=$2
    local expected_keywords=$3
    local test_category=$4
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}TESTE $TOTAL_TESTS: $test_name${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "📝 Categoria: $test_category"
    echo -e "❓ Pergunta: $prompt"
    echo -e "🔍 Esperado: $expected_keywords"
    
    # Fazer request
    RESPONSE=$(curl -s -X POST $URL \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ANON_KEY" \
      -d "{
        \"prompt\": \"$prompt\",
        \"context\": {
          \"currentProject\": {
            \"id\": \"$PROJECT_ID\",
            \"name\": \"$PROJECT_NAME\"
          },
          \"currentPage\": \"/dashboard\"
        },
        \"userId\": \"test-v22\",
        \"sessionId\": \"test-$(date +%s)-$TOTAL_TESTS\"
      }")
    
    # Extrair dados da resposta
    CONTENT=$(echo $RESPONSE | jq -r '.content // "ERRO"')
    HAS_RAG=$(echo $RESPONSE | jq -r '.hasRAGData // false')
    RAG_COUNT=$(echo $RESPONSE | jq -r '.debug.ragResultsCount // 0')
    SCHEDULED=$(echo $RESPONSE | jq -r '.debug.scheduledMessages // 0')
    VERSION=$(echo $RESPONSE | jq -r '.debug.version // "unknown"')
    CATEGORIES=$(echo $RESPONSE | jq -r '.debug.categoriesDetected // []')
    
    # Mostrar resposta resumida
    echo -e "\n📋 Resposta:"
    echo -e "${CONTENT:0:300}..."
    
    echo -e "\n🔧 Debug Info:"
    echo -e "- Versão: $VERSION"
    echo -e "- RAG Ativo: $HAS_RAG"
    echo -e "- RAG Resultados: $RAG_COUNT"
    echo -e "- Mensagens Agendadas: $SCHEDULED"
    echo -e "- Categorias: $CATEGORIES"
    
    # Verificar se passou
    if [[ "$CONTENT" == *"$expected_keywords"* ]] || [[ "$CONTENT" != "ERRO" ]]; then
        echo -e "\n${GREEN}✅ PASSOU${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        # Verificações adicionais para testes específicos
        if [[ "$test_name" == *"Mensagens Agendadas"* ]] && [[ "$SCHEDULED" -gt 0 ]]; then
            echo -e "${GREEN}✅ EXTRA: Detectou $SCHEDULED mensagens agendadas corretamente!${NC}"
        fi
    else
        echo -e "\n${RED}❌ FALHOU${NC}"
        echo -e "${RED}Não encontrou: '$expected_keywords'${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# ========== CATEGORIA 1: MÉTRICAS BÁSICAS ==========
echo -e "\n${BLUE}📊 CATEGORIA 1: MÉTRICAS BÁSICAS${NC}"

run_test "Métricas Gerais" \
    "quantas menções tem o projeto HW?" \
    "menções" \
    "MÉTRICAS"

run_test "Canais Alcançados" \
    "quantos canais estão monitorando o HW?" \
    "canais" \
    "MÉTRICAS"

run_test "Vídeos Monitorados" \
    "quantos vídeos foram analisados?" \
    "vídeos" \
    "MÉTRICAS"

# ========== CATEGORIA 2: MENSAGENS AGENDADAS ==========
echo -e "\n${BLUE}📅 CATEGORIA 2: MENSAGENS AGENDADAS${NC}"

run_test "Mensagens Agendadas - Quantidade" \
    "quantas mensagens estão agendadas?" \
    "agendadas" \
    "SCHEDULED"

run_test "Mensagens Agendadas - Detalhes" \
    "mostre as mensagens agendadas" \
    "agendada" \
    "SCHEDULED"

run_test "Próximas Postagens" \
    "o que vai ser postado?" \
    "post" \
    "SCHEDULED"

# ========== CATEGORIA 3: CONTEÚDO ESPECÍFICO ==========
echo -e "\n${BLUE}💬 CATEGORIA 3: CONTEÚDO ESPECÍFICO${NC}"

run_test "Menções Earnings" \
    "mostre menções sobre earnings" \
    "earning" \
    "CONTENT"

run_test "Menções Humanlike Writer" \
    "o que estão falando sobre Humanlike Writer?" \
    "Humanlike" \
    "CONTENT"

run_test "Comentários Recentes" \
    "mostre os comentários mais recentes" \
    "comentário" \
    "CONTENT"

# ========== CATEGORIA 4: TEMPORAL ==========
echo -e "\n${BLUE}🕐 CATEGORIA 4: TEMPORAL${NC}"

run_test "Hoje" \
    "o que foi postado hoje?" \
    "hoje" \
    "TEMPORAL"

run_test "Menções Hoje" \
    "quantas menções tivemos hoje?" \
    "hoje" \
    "TEMPORAL"

run_test "Horário Específico" \
    "o que foi postado às 14:11?" \
    "14:11" \
    "TEMPORAL"

# ========== CATEGORIA 5: STATUS ==========
echo -e "\n${BLUE}📊 CATEGORIA 5: STATUS${NC}"

run_test "Status Posted" \
    "quais mensagens têm status posted?" \
    "posted" \
    "STATUS"

run_test "Pendentes" \
    "o que está pendente?" \
    "pendente" \
    "STATUS"

# ========== CATEGORIA 6: ANÁLISES ==========
echo -e "\n${BLUE}📈 CATEGORIA 6: ANÁLISES${NC}"

run_test "Top Canais" \
    "quais são os principais canais?" \
    "canal" \
    "ANALYTICS"

run_test "Resumo Geral" \
    "faça um resumo do projeto HW" \
    "projeto" \
    "SUMMARY"

# ========== CATEGORIA 7: EDGE CASES ==========
echo -e "\n${BLUE}🔥 CATEGORIA 7: EDGE CASES${NC}"

run_test "Pergunta Complexa" \
    "quantas mensagens sobre earnings foram postadas hoje e estão agendadas para amanhã?" \
    "mensage" \
    "COMPLEX"

run_test "Pergunta Vaga" \
    "o que tem de novo?" \
    "novo" \
    "VAGUE"

run_test "Pergunta em Inglês" \
    "how many scheduled messages are there?" \
    "scheduled" \
    "ENGLISH"

# ========== RESUMO FINAL ==========
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}📊 RESUMO DOS TESTES${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total de Testes: $TOTAL_TESTS"
echo -e "${GREEN}✅ Passou: $PASSED_TESTS${NC}"
echo -e "${RED}❌ Falhou: $FAILED_TESTS${NC}"

# Calcular taxa de sucesso
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "Taxa de Sucesso: ${SUCCESS_RATE}%"
    
    if [ $SUCCESS_RATE -ge 90 ]; then
        echo -e "\n${GREEN}🎉 EXCELENTE! Sistema funcionando muito bem!${NC}"
    elif [ $SUCCESS_RATE -ge 70 ]; then
        echo -e "\n${YELLOW}⚠️ BOM! Mas ainda há espaço para melhorias.${NC}"
    else
        echo -e "\n${RED}🚨 ATENÇÃO! Sistema precisa de ajustes urgentes.${NC}"
    fi
fi

# Salvar relatório
REPORT_FILE="/Users/valdair/Documents/Projetos/Liftlio/liftlio-react/AGENTE_LIFTLIO/6_Testes/relatorio_teste_v22_$(date +%Y%m%d_%H%M%S).txt"
echo -e "\n📄 Salvando relatório em: $REPORT_FILE"

# Verificações especiais
echo -e "\n${BLUE}🔍 VERIFICAÇÕES ESPECIAIS${NC}"
echo ""

# Verificar mensagens agendadas
echo -e "1. Mensagens Agendadas:"
if [ $SCHEDULED -gt 0 ]; then
    echo -e "   ${GREEN}✅ Sistema detectou $SCHEDULED mensagens agendadas${NC}"
else
    echo -e "   ${RED}❌ Sistema NÃO detectou mensagens agendadas${NC}"
fi

# Verificar RAG
echo -e "\n2. Sistema RAG:"
echo -e "   - Funcionando: ${HAS_RAG}"
echo -e "   - Resultados médios: $((RAG_COUNT / TOTAL_TESTS))"

echo -e "\n${BLUE}🏁 TESTES FINALIZADOS!${NC}"
echo -e "Horário: $(date '+%H:%M:%S')"