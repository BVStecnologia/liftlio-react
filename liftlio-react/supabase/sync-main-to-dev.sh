#!/bin/bash

# =============================================
# SCRIPT: Sincronização MAIN → DEV
# Data: 14/10/2025
# Descrição: Exporta schema completo do MAIN e aplica na DEV
# =============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SUPABASE_DIR="/Users/valdair/Documents/Projetos/Liftlio/liftlio-react/Supabase"
MAIN_PROJECT_ID="suqjifkhmekcdflwowiw"
DEV_PROJECT_ID="cdnzajygbcujwcaoswpi"

# =============================================
# FUNCTIONS
# =============================================

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# =============================================
# STEP 1: BACKUP DO MAIN (SEGURANÇA)
# =============================================

backup_main() {
    log_info "PASSO 1/5: Criando backup completo do MAIN..."

    BACKUP_FILE="${SUPABASE_DIR}/backups/MAIN_FULL_BACKUP_$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p "${SUPABASE_DIR}/backups"

    log_info "Conectando ao MAIN e gerando dump..."

    cd "$SUPABASE_DIR"

    # Prompt para senha (por segurança)
    echo ""
    log_warning "Digite a senha do banco MAIN quando solicitado"

    supabase db dump \
        --db-url "postgresql://postgres@db.${MAIN_PROJECT_ID}.supabase.co:5432/postgres" \
        > "$BACKUP_FILE" || {
            log_error "Falha ao criar backup do MAIN!"
            exit 1
        }

    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_success "Backup criado: $BACKUP_FILE ($BACKUP_SIZE)"
    echo ""
}

# =============================================
# STEP 2: LINK PARA MAIN E PULL SCHEMA
# =============================================

pull_main_schema() {
    log_info "PASSO 2/5: Exportando schema completo do MAIN..."

    cd "$SUPABASE_DIR"

    # Link para MAIN
    log_info "Linking para projeto MAIN ($MAIN_PROJECT_ID)..."
    supabase link --project-ref "$MAIN_PROJECT_ID" || {
        log_error "Falha ao linkar com MAIN!"
        exit 1
    }

    log_success "Linked para MAIN"
    echo ""

    # Pull schema (cria migration)
    log_info "Pulling schema do MAIN (isso pode demorar alguns minutos)..."
    supabase db pull || {
        log_error "Falha ao fazer pull do schema!"
        exit 1
    }

    log_success "Schema exportado como migration"
    echo ""
}

# =============================================
# STEP 3: VERIFICAR MIGRATION GERADA
# =============================================

verify_migration() {
    log_info "PASSO 3/5: Verificando migration gerada..."

    LATEST_MIGRATION=$(ls -t ${SUPABASE_DIR}/supabase/migrations/*.sql | head -1)

    if [ ! -f "$LATEST_MIGRATION" ]; then
        log_error "Nenhuma migration encontrada!"
        exit 1
    fi

    MIGRATION_LINES=$(wc -l < "$LATEST_MIGRATION")
    MIGRATION_SIZE=$(du -h "$LATEST_MIGRATION" | cut -f1)
    MIGRATION_NAME=$(basename "$LATEST_MIGRATION")

    log_success "Migration encontrada: $MIGRATION_NAME"
    log_info "  • Linhas: $MIGRATION_LINES"
    log_info "  • Tamanho: $MIGRATION_SIZE"
    echo ""

    # Contar funções na migration
    FUNCTION_COUNT=$(grep -c "CREATE OR REPLACE FUNCTION\|CREATE FUNCTION" "$LATEST_MIGRATION" || true)
    log_info "  • Funções detectadas: $FUNCTION_COUNT"
    echo ""

    # Confirmar antes de aplicar
    read -p "$(echo -e ${YELLOW}⚠${NC} Deseja aplicar esta migration na DEV? [y/N]: )" -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Operação cancelada pelo usuário"
        exit 0
    fi
    echo ""
}

# =============================================
# STEP 4: APLICAR NA DEV
# =============================================

apply_to_dev() {
    log_info "PASSO 4/5: Aplicando migration na DEV..."

    cd "$SUPABASE_DIR"

    # Link para DEV
    log_info "Linking para projeto DEV ($DEV_PROJECT_ID)..."
    supabase link --project-ref "$DEV_PROJECT_ID" || {
        log_error "Falha ao linkar com DEV!"
        exit 1
    }

    log_success "Linked para DEV"
    echo ""

    # Push migrations
    log_info "Pushing migrations para DEV (isso pode demorar)..."
    supabase db push || {
        log_error "Falha ao aplicar migrations na DEV!"
        log_warning "Verifique os logs acima para detalhes do erro"
        exit 1
    }

    log_success "Migrations aplicadas na DEV"
    echo ""
}

# =============================================
# STEP 5: VALIDAÇÃO
# =============================================

validate_dev() {
    log_info "PASSO 5/5: Validando DEV..."

    cd "$SUPABASE_DIR"

    # Executar query para contar funções na DEV
    log_info "Contando funções na DEV..."

    # Usar SQL para contar funções
    FUNCTION_COUNT=$(supabase db dump --data-only=false | grep -c "CREATE OR REPLACE FUNCTION\|CREATE FUNCTION" || true)

    echo ""
    log_success "Sincronização concluída!"
    log_info "Funções na DEV: ~$FUNCTION_COUNT"
    echo ""

    log_info "Próximos passos:"
    echo "  1. Acesse Dashboard da DEV: https://supabase.com/dashboard/project/$DEV_PROJECT_ID"
    echo "  2. Vá em Database > Functions"
    echo "  3. Verifique se todas as funções estão presentes"
    echo ""
}

# =============================================
# MAIN EXECUTION
# =============================================

main() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   SUPABASE SYNC: MAIN → DEV                       ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""

    log_info "Este script irá:"
    echo "  1. Criar backup completo do MAIN"
    echo "  2. Exportar schema completo do MAIN como migration"
    echo "  3. Aplicar migration na DEV"
    echo "  4. Validar resultado"
    echo ""

    log_warning "IMPORTANTE: Este processo pode demorar 10-15 minutos"
    echo ""

    read -p "$(echo -e ${YELLOW}⚠${NC} Deseja continuar? [y/N]: )" -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Operação cancelada"
        exit 0
    fi
    echo ""

    # Execute steps
    backup_main
    pull_main_schema
    verify_migration
    apply_to_dev
    validate_dev

    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✓ SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!         ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Execute main function
main
