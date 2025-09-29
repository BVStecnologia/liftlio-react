#!/bin/bash

# 🔧 Script de Restauração dos MCPs
# Autor: Claude Code
# Data: 2025-01-29
# Descrição: Restaura todas as configurações de MCP para o Claude Code

set -e

echo "═══════════════════════════════════════════"
echo "   🔧 RESTAURAÇÃO DE MCPs CLAUDE CODE"
echo "═══════════════════════════════════════════"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se um comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar se claude CLI está instalado
if ! command_exists claude; then
    echo -e "${RED}❌ Claude CLI não encontrado!${NC}"
    echo "Por favor, instale o Claude CLI primeiro."
    exit 1
fi

# Função para verificar se MCP está conectado
check_mcp_status() {
    local mcp_name=$1
    if claude mcp list 2>/dev/null | grep -q "$mcp_name.*✓ Connected"; then
        return 0
    else
        return 1
    fi
}

# Backup da configuração atual
echo "📦 Fazendo backup da configuração atual..."
if [ -f ~/.claude.json ]; then
    cp ~/.claude.json ~/.claude.json.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✅ Backup criado${NC}"
else
    echo -e "${YELLOW}⚠️  Arquivo ~/.claude.json não existe${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  INSTALANDO MCPs GLOBAIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Instalar Context7 MCP
echo ""
echo "📦 Instalando Context7 MCP..."
if check_mcp_status "context7"; then
    echo -e "${GREEN}✅ Context7 já está instalado e funcionando${NC}"
else
    claude mcp add context7 -s user -- npx -y @upstash/context7-mcp
    if check_mcp_status "context7"; then
        echo -e "${GREEN}✅ Context7 instalado com sucesso${NC}"
    else
        echo -e "${YELLOW}⚠️  Context7 instalado mas não conectou. Pode precisar reiniciar o Claude Code${NC}"
    fi
fi

# Instalar Playwright MCP
echo ""
echo "📦 Instalando Playwright MCP..."
if check_mcp_status "playwright"; then
    echo -e "${GREEN}✅ Playwright já está instalado e funcionando${NC}"
else
    claude mcp add playwright -s user -- npx -y @playwright/mcp@latest
    if check_mcp_status "playwright"; then
        echo -e "${GREEN}✅ Playwright instalado com sucesso${NC}"
    else
        echo -e "${YELLOW}⚠️  Playwright instalado mas não conectou. Pode precisar reiniciar o Claude Code${NC}"
    fi
fi

# Instalar Trello MCP
echo ""
echo "📦 Instalando Trello MCP..."
if check_mcp_status "trello"; then
    echo -e "${GREEN}✅ Trello já está instalado e funcionando${NC}"
else
    claude mcp add trello -s user -- npx -y @welt-studio/trello-mcp-server

    # Configurar credenciais do Trello
    TRELLO_API_KEY="${TRELLO_API_KEY:-3436c02dafd3cedc7015fd5e881a850c}"
    TRELLO_TOKEN="${TRELLO_TOKEN:-ATTA082e00f4ffc4f35a4b753c8c955d106a21a01c91c2213bc5c9fb3c128a0a8a9f0551C6F6}"

    jq --arg key "$TRELLO_API_KEY" --arg token "$TRELLO_TOKEN" \
       '.mcpServers.trello.env = {"TRELLO_API_KEY":$key,"TRELLO_TOKEN":$token}' \
       ~/.claude.json > /tmp/claude.json && mv /tmp/claude.json ~/.claude.json

    if check_mcp_status "trello"; then
        echo -e "${GREEN}✅ Trello instalado com sucesso${NC}"
    else
        echo -e "${YELLOW}⚠️  Trello instalado mas não conectou. Verifique as credenciais${NC}"
    fi
fi


echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CONFIGURANDO MCP LOCAL (SUPABASE)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar se estamos em um projeto
if [ -f .mcp.json ] || [ -f package.json ]; then
    echo ""
    echo "📦 Configurando Supabase MCP para o projeto..."

    # Verificar variáveis de ambiente
    if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  SUPABASE_ACCESS_TOKEN não encontrado no ambiente${NC}"
        echo "Usando token padrão do Liftlio..."
        SUPABASE_ACCESS_TOKEN="sbp_0b8789827f3a2ed426f7b4298923aa00e818c16b"
    fi

    if [ -z "$SUPABASE_PROJECT_REF" ]; then
        echo -e "${YELLOW}⚠️  SUPABASE_PROJECT_REF não encontrado no ambiente${NC}"
        echo "Usando projeto padrão do Liftlio..."
        SUPABASE_PROJECT_REF="suqjifkhmekcdflwowiw"
    fi

    # Instalar Supabase MCP
    claude mcp add supabase -s local -- npx -y @supabase/mcp-server-supabase@latest \
        --project-ref="$SUPABASE_PROJECT_REF" \
        --access-token="$SUPABASE_ACCESS_TOKEN"

    if check_mcp_status "supabase"; then
        echo -e "${GREEN}✅ Supabase configurado com sucesso${NC}"
    else
        echo -e "${YELLOW}⚠️  Supabase configurado mas não conectou. Verifique as credenciais${NC}"
    fi
else
    echo -e "${YELLOW}ℹ️  Não estamos em um diretório de projeto. Pulando configuração do Supabase${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  VERIFICAÇÃO FINAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Mostrar status final
echo "Status dos MCPs:"
claude mcp list

echo ""
echo "═══════════════════════════════════════════"
echo -e "${GREEN}   ✅ RESTAURAÇÃO COMPLETA!${NC}"
echo "═══════════════════════════════════════════"
echo ""
echo "📝 Notas importantes:"
echo "   • Se algum MCP não conectou, reinicie o Claude Code"
echo "   • Para projetos específicos, execute este script na raiz do projeto"
echo "   • Credenciais sensíveis devem estar no .env (nunca commitar!)"
echo ""
echo "💡 Dica: Use 'claude mcp list' para verificar o status a qualquer momento"