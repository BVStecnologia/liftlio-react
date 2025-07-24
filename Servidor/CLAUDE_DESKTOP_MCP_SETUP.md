# Como Configurar MCP Trello no Claude Desktop

## 📋 Passos para Adicionar

### 1. Abra as configurações do Claude Desktop
- No Mac: Claude Desktop > Settings > Developer > Edit Config
- No Windows: Settings > Developer > Edit Config

### 2. Adicione esta configuração:

```json
{
  "mcpServers": {
    "trello-test": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch"
      ],
      "env": {
        "ALLOWED_URLS": "http://173.249.22.2:5173/*"
      }
    }
  }
}
```

### 3. Reinicie o Claude Desktop

### 4. Teste no Claude:
- Digite: "Use the fetch tool to get http://173.249.22.2:5173/health"
- Deve retornar o status do servidor

## 🔧 Configuração Alternativa (Local)

Se quiser rodar o MCP localmente:

1. Salve o arquivo `mcp-client-trello.js` em algum lugar
2. Use esta configuração:

```json
{
  "mcpServers": {
    "trello-liftlio": {
      "command": "node",
      "args": [
        "/caminho/para/mcp-client-trello.js"
      ]
    }
  }
}
```

## 🧪 Comandos de Teste

Após configurar, teste no Claude Desktop:

1. "List my Trello boards"
2. "Show lists in the Liftlio board"
3. "Create a test card in Valdair list"

## ⚠️ Notas Importantes

- O servidor está rodando em: http://173.249.22.2:5173
- Por enquanto é um mock (não conecta no Trello real ainda)
- Use para testar a integração MCP

## 📁 Arquivos Criados

- `/Servidor/claude-mcp-config.json` - Config completa
- `/Servidor/mcp-client-trello.js` - Cliente MCP local
- `/Servidor/claude-desktop-config.json` - Config básica

## 🚀 Status Atual

✅ Servidor MCP rodando no Contabo
✅ Endpoints funcionando:
  - GET /health
  - POST /mcp (para comandos)
✅ Arquivos de config prontos

⚠️ Ainda é um mock - não executa comandos Trello reais
⚠️ Precisa adicionar credenciais reais do Trello