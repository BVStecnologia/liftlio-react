#!/bin/bash

# =============================================
# Script: Check Deploy Status
# Descrição: Verifica diferenças entre LOCAL e LIVE
# Uso: ./check-deploy-status.sh
# =============================================

echo "================================================"
echo "🔍 VERIFICANDO DIFERENÇAS LOCAL vs LIVE"
echo "================================================"
echo ""

# Diretório base
BASE_DIR="/Users/valdair/Documents/Projetos/Liftlio/liftlio-react/supabase/functions_backup"
SQL_DIR="$BASE_DIR/SQL_Functions"

# Arquivo de log temporário
TEMP_LOG="/tmp/deploy_status_$(date +%Y%m%d_%H%M%S).log"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================
# 1. LISTAR TODAS AS FUNÇÕES LOCAIS
# =============================================
echo "📂 Funções SQL Locais:"
echo "------------------------"

# Container Docker local
CONTAINER="supabase_db_Supabase"

# Listar funções no banco LOCAL
docker exec -i $CONTAINER psql -U postgres -d postgres -t -c "
SELECT
    proname || '(' || pg_get_function_identity_arguments(oid) || ')' as funcao,
    to_char(prodate, 'YYYY-MM-DD HH24:MI') as modificado
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prokind = 'f'
ORDER BY proname;
" > "$TEMP_LOG"

LOCAL_FUNCTIONS=$(cat "$TEMP_LOG" | grep -v "^$" | wc -l)
echo -e "${GREEN}✓ Total de funções locais: $LOCAL_FUNCTIONS${NC}"
echo ""

# =============================================
# 2. VERIFICAR ARQUIVOS MODIFICADOS RECENTEMENTE
# =============================================
echo "🕐 Arquivos .sql modificados nas últimas 24h:"
echo "----------------------------------------------"

MODIFIED_FILES=$(find "$SQL_DIR" -name "*.sql" -type f -mtime -1 2>/dev/null)

if [ -z "$MODIFIED_FILES" ]; then
    echo -e "${BLUE}Nenhum arquivo modificado nas últimas 24h${NC}"
else
    echo "$MODIFIED_FILES" | while read file; do
        filename=$(basename "$file")
        modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$file" 2>/dev/null || stat -c "%y" "$file" 2>/dev/null | cut -d' ' -f1,2)
        echo -e "${YELLOW}⚠️  $filename - Modificado: $modified${NC}"
    done
fi
echo ""

# =============================================
# 3. VERIFICAR FUNÇÕES COM TESTES PENDENTES
# =============================================
echo "🧪 Status dos Testes:"
echo "---------------------"

for sql_file in "$SQL_DIR"/**/*.sql; do
    if [[ "$sql_file" == *".test.sql" ]]; then
        continue
    fi

    base_name="${sql_file%.sql}"
    test_file="${base_name}.test.sql"

    if [ ! -f "$test_file" ]; then
        filename=$(basename "$sql_file")
        echo -e "${RED}❌ $filename - SEM arquivo de teste!${NC}"
    fi
done
echo ""

# =============================================
# 4. GERAR RESUMO PARA DEPLOY_LOG
# =============================================
echo "================================================"
echo "📋 RESUMO PARA DEPLOY_LOG.md:"
echo "================================================"
echo ""

echo "Copie as linhas abaixo para DEPLOY_LOG.md:"
echo ""

# Para cada arquivo modificado, gerar linha para o DEPLOY_LOG
find "$SQL_DIR" -name "*.sql" -type f -mtime -7 2>/dev/null | while read file; do
    if [[ "$file" == *".test.sql" ]]; then
        continue
    fi

    filename=$(basename "$file")
    funcname="${filename%.sql}"
    relpath="${file#$BASE_DIR/}"
    modified=$(stat -f "%Sm" -t "%Y-%m-%d" "$file" 2>/dev/null || date "+%Y-%m-%d")

    echo "| $modified | $funcname | SQL | ⏳ | $relpath | <!-- notas aqui --> |"
done

echo ""
echo "================================================"
echo -e "${GREEN}✅ Verificação concluída!${NC}"
echo "================================================"

# =============================================
# 5. SUGESTÃO DE PRÓXIMOS PASSOS
# =============================================
echo ""
echo "🎯 Próximos passos:"
echo "1. Revisar funções modificadas"
echo "2. Executar testes locais (.test.sql)"
echo "3. Atualizar DEPLOY_LOG.md"
echo "4. Deploy via: Task → supabase-mcp-expert"
echo ""

# Limpar arquivo temporário
rm -f "$TEMP_LOG"