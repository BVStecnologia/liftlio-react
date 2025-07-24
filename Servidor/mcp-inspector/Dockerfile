FROM node:20-alpine

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache wget

# Instalar MCP Inspector
RUN npm install -g @modelcontextprotocol/inspector@latest

# Instalar MCP servers específicos
RUN npm install -g \
    @delorenj/mcp-server-trello \
    instawp-mcp-server \
    @modelcontextprotocol/server-supabase

# Porta padrão do MCP Inspector
EXPOSE 5173

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:5173 || exit 1

# Comando para iniciar o inspector com os servers
CMD ["npx", "@modelcontextprotocol/inspector", \
     "--server", "@delorenj/mcp-server-trello", \
     "--server", "instawp-mcp-server", \
     "--server", "@modelcontextprotocol/server-supabase", \
     "--host", "0.0.0.0"]