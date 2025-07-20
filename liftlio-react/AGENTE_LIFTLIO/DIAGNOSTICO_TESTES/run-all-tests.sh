#!/bin/bash

# 🚀 SCRIPT DE EXECUÇÃO COMPLETA DE TESTES
# Roda todos os testes do agente v26 em sequência
# Projeto 58 (HW) - Validação completa

echo "════════════════════════════════════════════════════════════════"
echo "🚀 BATERIA COMPLETA DE TESTES - AGENTE LIFTLIO v26"
echo "   Projeto: 58 (HW)"
echo "   Data: $(date '+%d/%m/%Y %H:%M:%S')"
echo "════════════════════════════════════════════════════════════════"

# Diretório base
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Criar diretório de resultados com timestamp
RESULTS_DIR="results_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

# Log file
LOG_FILE="$RESULTS_DIR/test_execution.log"

# Função para executar teste e salvar resultado
run_test() {
    local test_name=$1
    local test_file=$2
    local output_file="$RESULTS_DIR/${test_name}_result.txt"
    
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "🧪 Executando: $test_name"
    echo "   Arquivo: $test_file"
    echo "   Início: $(date '+%H:%M:%S')"
    echo "════════════════════════════════════════════════════════════════"
    
    # Executar teste e capturar saída
    node "$test_file" 2>&1 | tee "$output_file"
    local exit_code=${PIPESTATUS[0]}
    
    # Registrar no log principal
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $test_name - Exit code: $exit_code" >> "$LOG_FILE"
    
    if [ $exit_code -eq 0 ]; then
        echo "✅ $test_name PASSOU" | tee -a "$LOG_FILE"
    else
        echo "❌ $test_name FALHOU (código: $exit_code)" | tee -a "$LOG_FILE"
    fi
    
    return $exit_code
}

# Contador de resultados
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "📁 Salvando resultados em: $RESULTS_DIR" | tee "$LOG_FILE"
echo "════════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"

# 1. TESTE DE ESTADO ATUAL
echo -e "\n1️⃣  VERIFICANDO ESTADO ATUAL DO AGENTE..."
if [ -f "test-agent-current-state.js" ]; then
    run_test "estado_atual" "test-agent-current-state.js"
    ((TOTAL_TESTS++))
    [ $? -eq 0 ] && ((PASSED_TESTS++)) || ((FAILED_TESTS++))
else
    echo "⚠️  Arquivo test-agent-current-state.js não encontrado"
fi

# Pequena pausa entre testes
sleep 2

# 2. TESTE DE MEMÓRIA
echo -e "\n2️⃣  TESTANDO SISTEMA DE MEMÓRIA..."
if [ -f "test-memory-v25.js" ]; then
    run_test "memoria_v25" "test-memory-v25.js"
    ((TOTAL_TESTS++))
    [ $? -eq 0 ] && ((PASSED_TESTS++)) || ((FAILED_TESTS++))
else
    echo "⚠️  Arquivo test-memory-v25.js não encontrado"
fi

sleep 2

# 3. TESTE COMPLETO PROJETO 58
echo -e "\n3️⃣  TESTANDO PROJETO 58 COMPLETO..."
if [ -f "test-agent-project-58.js" ]; then
    run_test "projeto_58_completo" "test-agent-project-58.js"
    ((TOTAL_TESTS++))
    [ $? -eq 0 ] && ((PASSED_TESTS++)) || ((FAILED_TESTS++))
else
    echo "⚠️  Arquivo test-agent-project-58.js não encontrado"
fi

sleep 2

# 4. TESTE DO SISTEMA RAG
echo -e "\n4️⃣  TESTANDO SISTEMA RAG - TODAS AS TABELAS..."
if [ -f "test-rag-all-tables.js" ]; then
    run_test "rag_todas_tabelas" "test-rag-all-tables.js"
    ((TOTAL_TESTS++))
    [ $? -eq 0 ] && ((PASSED_TESTS++)) || ((FAILED_TESTS++))
else
    echo "⚠️  Arquivo test-rag-all-tables.js não encontrado"
fi

sleep 2

# 5. TESTE COMPLETO (se existir)
echo -e "\n5️⃣  TESTANDO SUITE COMPLETA..."
if [ -f "test-agent-complete.js" ]; then
    run_test "suite_completa" "test-agent-complete.js"
    ((TOTAL_TESTS++))
    [ $? -eq 0 ] && ((PASSED_TESTS++)) || ((FAILED_TESTS++))
else
    echo "⚠️  Arquivo test-agent-complete.js não encontrado"
fi

# RELATÓRIO FINAL
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📊 RELATÓRIO FINAL DE TESTES"
echo "════════════════════════════════════════════════════════════════"
echo "   Total de testes: $TOTAL_TESTS"
echo "   ✅ Passaram: $PASSED_TESTS"
echo "   ❌ Falharam: $FAILED_TESTS"

# Calcular porcentagem
if [ $TOTAL_TESTS -gt 0 ]; then
    PERCENTAGE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
    echo "   📈 Taxa de sucesso: $PERCENTAGE%"
    
    if [ $PERCENTAGE -eq 100 ]; then
        echo ""
        echo "🎉 PERFEITO! Todos os testes passaram!"
        echo "   O sistema está funcionando perfeitamente."
    elif [ $PERCENTAGE -ge 80 ]; then
        echo ""
        echo "✅ MUITO BOM! Sistema funcionando bem."
        echo "   Pequenos ajustes podem ser necessários."
    elif [ $PERCENTAGE -ge 60 ]; then
        echo ""
        echo "⚠️  ATENÇÃO! Sistema com alguns problemas."
        echo "   Revisar os testes que falharam."
    else
        echo ""
        echo "❌ CRÍTICO! Sistema com problemas graves."
        echo "   Intervenção urgente necessária!"
    fi
else
    echo "   ⚠️  Nenhum teste foi executado!"
fi

echo "════════════════════════════════════════════════════════════════"

# Gerar relatório consolidado
REPORT_FILE="$RESULTS_DIR/RELATORIO_CONSOLIDADO.md"
echo "# 📋 RELATÓRIO CONSOLIDADO DE TESTES" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Data:** $(date '+%d/%m/%Y %H:%M:%S')" >> "$REPORT_FILE"
echo "**Versão do Agente:** v26 (UUID Fix)" >> "$REPORT_FILE"
echo "**Projeto Testado:** 58 (HW)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## 📊 Resumo Executivo" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "- **Total de testes:** $TOTAL_TESTS" >> "$REPORT_FILE"
echo "- **Passaram:** $PASSED_TESTS ✅" >> "$REPORT_FILE"
echo "- **Falharam:** $FAILED_TESTS ❌" >> "$REPORT_FILE"
echo "- **Taxa de sucesso:** $PERCENTAGE%" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## 🔍 Detalhes dos Testes" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Adicionar logs ao relatório
if [ -f "$LOG_FILE" ]; then
    echo '```' >> "$REPORT_FILE"
    cat "$LOG_FILE" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "## 📁 Arquivos de Resultado" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Todos os resultados detalhados estão disponíveis em: \`$RESULTS_DIR/\`" >> "$REPORT_FILE"

echo ""
echo "📄 Relatório consolidado salvo em: $REPORT_FILE"
echo "📁 Todos os resultados em: $RESULTS_DIR/"
echo ""

# Retornar código de saída baseado no sucesso
if [ $FAILED_TESTS -eq 0 ] && [ $TOTAL_TESTS -gt 0 ]; then
    exit 0
else
    exit 1
fi