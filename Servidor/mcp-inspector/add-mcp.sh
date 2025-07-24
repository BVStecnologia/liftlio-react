#!/bin/bash
# Script para adicionar novos MCPs ao container

MCP_NAME=$1
if [ -z "$MCP_NAME" ]; then
    echo "Uso: ./add-mcp.sh <nome-do-mcp>"
    echo ""
    echo "Exemplos:"
    echo "  ./add-mcp.sh @modelcontextprotocol/server-github"
    echo "  ./add-mcp.sh @modelcontextprotocol/server-slack"
    echo "  ./add-mcp.sh mcp-server-fetch"
    echo ""
    echo "MCPs populares:"
    echo "  - @modelcontextprotocol/server-github    # GitHub"
    echo "  - @modelcontextprotocol/server-slack     # Slack"
    echo "  - @modelcontextprotocol/server-sqlite    # SQLite"
    echo "  - @modelcontextprotocol/server-filesystem # Arquivos"
    echo "  - mcp-server-fetch                       # HTTP requests"
    exit 1
fi

echo "📦 Adicionando MCP: $MCP_NAME"

# Backup do Dockerfile
cp Dockerfile Dockerfile.bak

# Adicionar ao RUN npm install
sed -i "/npm install -g \\\/a\\    $MCP_NAME \\\\" Dockerfile

# Adicionar ao CMD
# Encontrar a linha antes de "--host"
sed -i '/"--host", "0.0.0.0"/i\     "--server", "'"$MCP_NAME"'",' Dockerfile

echo "✅ MCP $MCP_NAME adicionado ao Dockerfile!"
echo ""
echo "Próximos passos:"
echo "1. Adicione as credenciais necessárias no .env"
echo "2. Reconstrua a imagem: docker-compose build"
echo "3. Reinicie o container: docker-compose up -d"
echo ""
echo "📝 Para reverter: mv Dockerfile.bak Dockerfile"