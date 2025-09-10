#!/bin/bash
# Script para instalar MCP Inspector remotamente

echo "🚀 Instalando MCP Inspector no servidor remoto..."

# Executar tudo via SSH com chave
ssh -i ~/.ssh/contabo_key root@173.249.22.2 << 'REMOTE_SCRIPT'

echo "📦 Iniciando instalação no servidor..."

# Verificar Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando!"
    exit 1
fi

# Listar containers existentes
echo -e "\n📋 Containers atuais (não serão afetados):"
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"

# Verificar portas em uso
PORTS_IN_USE=$(docker ps --format "{{.Ports}}" | grep -oE '[0-9]+->|:[0-9]+' | grep -oE '[0-9]+' | sort -u)
MCP_PORT=5173
while echo "$PORTS_IN_USE" | grep -q "^$MCP_PORT$"; do
    MCP_PORT=$((MCP_PORT + 1))
done
echo -e "\n✅ Porta livre encontrada: $MCP_PORT"

# Criar estrutura
MCP_DIR="/opt/containers/mcp-inspector"
mkdir -p "$MCP_DIR"
cd "$MCP_DIR"

# Criar rede isolada
NETWORK_NAME="mcp-isolated"
if ! docker network ls | grep -q "$NETWORK_NAME"; then
    echo "🌐 Criando rede isolada..."
    docker network create "$NETWORK_NAME"
fi

# Criar Dockerfile
echo "📝 Criando Dockerfile..."
cat > Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache wget && \
    npm install -g @modelcontextprotocol/inspector@latest && \
    npm install -g \
        @modelcontextprotocol/server-trello \
        @modelcontextprotocol/server-instawp \
        @modelcontextprotocol/server-supabase

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:5173 || exit 1

CMD ["npx", "@modelcontextprotocol/inspector", \
     "--server", "@modelcontextprotocol/server-trello", \
     "--server", "@modelcontextprotocol/server-instawp", \
     "--server", "@modelcontextprotocol/server-supabase", \
     "--host", "0.0.0.0"]
EOF

# Criar docker-compose.yml
echo "📝 Criando docker-compose.yml..."
cat > docker-compose.yml << EOF
version: '3.8'

services:
  mcp-inspector:
    build: .
    container_name: mcp-inspector-isolated
    ports:
      - "${MCP_PORT}:5173"
    environment:
      - TRELLO_API_KEY=\${TRELLO_API_KEY}
      - TRELLO_TOKEN=\${TRELLO_TOKEN}
      - WORDPRESS_URL=\${WORDPRESS_URL}
      - WORDPRESS_USER=\${WORDPRESS_USER}
      - WORDPRESS_APP_PASSWORD=\${WORDPRESS_APP_PASSWORD}
      - SUPABASE_ACCESS_TOKEN=\${SUPABASE_ACCESS_TOKEN}
      - SUPABASE_PROJECT_ID=\${SUPABASE_PROJECT_ID}
    restart: unless-stopped
    networks:
      - ${NETWORK_NAME}
    labels:
      - "mcp.service=inspector"
      - "mcp.isolated=true"

networks:
  ${NETWORK_NAME}:
    external: true
EOF

# Criar .env com credenciais reais (obtidas do CLAUDE.md)
echo "🔑 Configurando credenciais..."
cat > .env << 'EOF'
# Trello - ADICIONAR CREDENCIAIS REAIS
TRELLO_API_KEY=sua-api-key-aqui
TRELLO_TOKEN=seu-token-aqui

# WordPress  
WORDPRESS_URL=https://wordpress-1319296-5689133.cloudwaysapps.com
WORDPRESS_USER=MCP claude
WORDPRESS_APP_PASSWORD=sua-senha-app-aqui

# Supabase
SUPABASE_ACCESS_TOKEN=seu-access-token-aqui
SUPABASE_PROJECT_ID=suqjifkhmekcdflwowiw
EOF

# Criar script helper
cat > add-mcp.sh << 'EOF'
#!/bin/bash
MCP_NAME=$1
if [ -z "$MCP_NAME" ]; then
    echo "Uso: ./add-mcp.sh <nome-do-mcp>"
    exit 1
fi

sed -i "/npm install -g/a\\    $MCP_NAME \\\\" Dockerfile
sed -i '/"--host", "0.0.0.0"/i\     "--server", "'"$MCP_NAME"'",' Dockerfile

echo "✅ MCP $MCP_NAME adicionado!"
echo "🔨 Reconstrua: docker-compose build && docker-compose up -d"
EOF

chmod +x add-mcp.sh

# Build e iniciar
echo -e "\n🔨 Construindo imagem Docker..."
docker-compose build

echo -e "\n🚀 Iniciando container..."
docker-compose up -d

# Aguardar e verificar
sleep 5
if docker ps | grep -q "mcp-inspector-isolated"; then
    echo -e "\n✅ MCP Inspector instalado com sucesso!"
    echo "🌐 Interface Web: http://173.249.22.2:$MCP_PORT"
    echo "📊 Logs: docker logs -f mcp-inspector-isolated"
    echo "📁 Localização: $MCP_DIR"
    
    # Testar API
    echo -e "\n🧪 Testando API..."
    curl -s http://localhost:$MCP_PORT/api/servers | head -20
else
    echo -e "\n❌ Erro ao iniciar container!"
    docker-compose logs
fi

REMOTE_SCRIPT