#!/bin/bash
# Script de instalação segura do MCP Inspector
# Criado em: 23/01/2025
# Objetivo: Instalar MCP Inspector sem afetar outros containers

echo "🔍 MCP Inspector - Instalação Segura"
echo "===================================="

# Verificar se docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando!"
    exit 1
fi

# Listar containers existentes
echo -e "\n📦 Containers atuais (NÃO serão afetados):"
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"

# Verificar portas em uso
echo -e "\n🔌 Verificando portas em uso..."
PORTS_IN_USE=$(docker ps --format "{{.Ports}}" | grep -oE '[0-9]+->|:[0-9]+' | grep -oE '[0-9]+' | sort -u)
echo "Portas ocupadas: $PORTS_IN_USE"

# Encontrar porta livre (padrão 5173)
MCP_PORT=5173
while echo "$PORTS_IN_USE" | grep -q "^$MCP_PORT$"; do
    MCP_PORT=$((MCP_PORT + 1))
done
echo "✅ Porta livre encontrada: $MCP_PORT"

# Diretório do MCP Inspector
MCP_DIR="/opt/containers/mcp-inspector"
echo -e "\n📁 Diretório de instalação: $MCP_DIR"

# Criar rede isolada se não existir
NETWORK_NAME="mcp-isolated"
if ! docker network ls | grep -q "$NETWORK_NAME"; then
    echo "🌐 Criando rede isolada: $NETWORK_NAME"
    docker network create "$NETWORK_NAME"
else
    echo "🌐 Rede $NETWORK_NAME já existe"
fi

# Confirmar antes de prosseguir
echo -e "\n⚠️  IMPORTANTE: Esta instalação:"
echo "   ✅ NÃO afetará containers existentes"
echo "   ✅ Usará porta $MCP_PORT"
echo "   ✅ Criará rede isolada $NETWORK_NAME"
echo "   ✅ Instalará em $MCP_DIR"

read -p "Continuar com a instalação? (s/n) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Instalação cancelada"
    exit 1
fi

# Criar diretório e copiar arquivos
echo -e "\n📋 Copiando arquivos de configuração..."
mkdir -p "$MCP_DIR"

# Copiar arquivos do projeto
cp -r /Users/valdair/Documents/Projetos/Liftlio/Servidor/mcp-inspector/* "$MCP_DIR/" 2>/dev/null || echo "Arquivos serão criados..."

# Atualizar porta no docker-compose
cd "$MCP_DIR"
if [ -f docker-compose.yml ]; then
    sed -i "s/5173:5173/${MCP_PORT}:5173/g" docker-compose.yml
fi

# Build e iniciar
echo -e "\n🔨 Construindo imagem Docker..."
docker-compose build

echo -e "\n🚀 Iniciando container..."
docker-compose up -d

# Verificar status
echo -e "\n⏳ Aguardando container iniciar..."
sleep 5

if docker ps | grep -q "mcp-inspector-isolated"; then
    echo -e "\n✅ MCP Inspector instalado com sucesso!"
    echo "🌐 Interface Web: http://173.249.22.2:$MCP_PORT"
    echo "📊 Ver logs: docker logs -f mcp-inspector-isolated"
    echo "🛑 Parar: docker-compose -f $MCP_DIR/docker-compose.yml down"
else
    echo -e "\n❌ Erro ao iniciar container!"
    echo "📊 Verificar logs:"
    docker-compose logs
    exit 1
fi

echo -e "\n📝 Documentação: /Users/valdair/Documents/Projetos/Liftlio/Servidor/MCP_INSPECTOR.md"