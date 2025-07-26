#!/bin/bash

echo "🔧 Configurando Gmail MCP no Claude Code"
echo "======================================="
echo ""
echo "Removendo configuração antiga..."
claude mcp remove gmail 2>/dev/null || true

echo ""
echo "Adicionando novo servidor Gmail MCP..."
claude mcp add gmail -s user --transport sse "http://173.249.22.2:3000/sse"

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "Para testar:"
echo "1. Digite: exit"
echo "2. Digite: claude"
echo "3. O Gmail MCP estará disponível"