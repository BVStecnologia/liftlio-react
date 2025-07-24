# MCP Trello Service

## Status: ✅ Funcionando

### Informações de Conexão
- **URL**: http://173.249.22.2:5173
- **Container**: mcp-trello
- **API**: Trello API Real

### Credenciais (Configuradas)
- **API Key**: 3436c02dafd3cedc7015fd5e881a850c
- **Board ID**: 686b43ced8d30f8eb12b9d12

### Endpoints Disponíveis
- `GET /health` - Status do servidor
- `POST /mcp` - Operações MCP
  - `get_lists` - Listar todas as listas
  - `get_cards_by_list` - Buscar cards de uma lista
  - `add_card_to_list` - Criar novo card

### Exemplo de Uso
```bash
# Health check
curl http://173.249.22.2:5173/health

# Buscar listas
curl -X POST http://173.249.22.2:5173/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "get_lists", "params": {}}'
```

### Edge Functions Integradas
- `agente-mcp-trello-real` (v5) - Operações single
- `agente-mcp-trello-batch` (v1) - Operações em batch

### Docker
```bash
# Ver logs
docker logs mcp-trello -f

# Reiniciar
docker restart mcp-trello
```