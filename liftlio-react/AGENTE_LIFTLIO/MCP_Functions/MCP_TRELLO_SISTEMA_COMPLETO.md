# 🎯 Sistema MCP Trello - FUNCIONANDO COM API REAL!

**Data**: 23/01/2025  
**Status**: ✅ 100% OPERACIONAL COM DADOS REAIS  
**Autor**: Claude & Valdair

## 📋 Resumo Executivo

Sistema completo de integração Trello via MCP (Model Context Protocol) funcionando com:
- ✅ MCP Trello local no Claude Code
- ✅ Servidor Python remoto com API real do Trello
- ✅ Edge Functions no Supabase
- ✅ Criação, listagem e gerenciamento de cards REAIS

## 🏗️ Arquitetura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Claude Code    │────▶│  Edge Function   │────▶│  MCP Server     │
│  (MCP Local)    │     │  (Supabase)      │     │  (Python)       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                         │
         │                       │                         ▼
         │                       │                  ┌─────────────┐
         │                       │                  │ Trello API  │
         │                       │                  │   (REAL)    │
         └───────────────────────┴─────────────────▶└─────────────┘
```

## 🔑 Credenciais (Funcionando)

```bash
TRELLO_API_KEY=3436c02dafd3cedc7015fd5e881a850c
TRELLO_TOKEN=ATTA082e00f4ffc4f35a4b753c8c955d106a21a01c91c2213bc5c9fb3c128a0a8a9f0551C6F6
TRELLO_BOARD_ID=686b43ced8d30f8eb12b9d12
```

## 🖥️ Servidor MCP Python (173.249.22.2:5173)

### Localização
- **Servidor**: Contabo VPS
- **IP**: 173.249.22.2
- **Porta**: 5173
- **Diretório**: `/opt/containers/mcp-inspector/`

### Arquivo: `server_trello_real.py`
```python
#!/usr/bin/env python3
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import requests
from urllib.parse import urlparse

# Carregar credenciais do .env
TRELLO_API_KEY = os.getenv('TRELLO_API_KEY', '3436c02dafd3cedc7015fd5e881a850c')
TRELLO_TOKEN = os.getenv('TRELLO_TOKEN', 'ATTA082e00f4ffc4f35a4b753c8c955d106a21a01c91c2213bc5c9fb3c128a0a8a9f0551C6F6')
TRELLO_BOARD_ID = os.getenv('TRELLO_BOARD_ID', '686b43ced8d30f8eb12b9d12')

class MCPHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'status': 'healthy',
                'server': 'MCP Trello Real API',
                'version': '3.0',
                'board_id': TRELLO_BOARD_ID
            }).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        if self.path == '/mcp':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            method = data.get('method', '')
            params = data.get('params', {})
            
            try:
                # API do Trello
                base_url = 'https://api.trello.com/1'
                auth = {'key': TRELLO_API_KEY, 'token': TRELLO_TOKEN}
                
                if method == 'get_lists':
                    # Buscar listas do board
                    url = f'{base_url}/boards/{TRELLO_BOARD_ID}/lists'
                    response = requests.get(url, params=auth)
                    lists = response.json()
                    
                    result = {
                        'success': True,
                        'lists': lists,
                        'count': len(lists)
                    }
                
                elif method == 'get_cards_by_list':
                    # Buscar cards de uma lista
                    list_id = params.get('listId', '686b4422d297ee28b3d92163')
                    url = f'{base_url}/lists/{list_id}/cards'
                    response = requests.get(url, params=auth)
                    cards = response.json()
                    
                    result = {
                        'success': True,
                        'cards': cards,
                        'count': len(cards),
                        'list_id': list_id
                    }
                
                elif method == 'add_card_to_list':
                    # Criar card
                    list_id = params.get('listId', '686b4422d297ee28b3d92163')
                    name = params.get('name', 'New Card from MCP Server')
                    desc = params.get('description', '')
                    
                    url = f'{base_url}/cards'
                    card_data = {
                        'idList': list_id,
                        'name': name,
                        'desc': desc,
                        **auth
                    }
                    response = requests.post(url, data=card_data)
                    card = response.json()
                    
                    result = {
                        'success': True,
                        'card': card,
                        'message': 'Card created successfully!'
                    }
                
                else:
                    # Método não implementado
                    result = {
                        'success': False,
                        'error': f'Method {method} not implemented',
                        'available_methods': ['get_lists', 'get_cards_by_list', 'add_card_to_list']
                    }
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': str(e),
                    'method': method
                }).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    print(f'MCP Trello Real API Server starting on port 5173...')
    print(f'Board ID: {TRELLO_BOARD_ID}')
    print(f'API Key: {TRELLO_API_KEY[:10]}...')
    server = HTTPServer(('0.0.0.0', 5173), MCPHandler)
    server.serve_forever()
```

## 🚀 Edge Functions Supabase

### 1. `agente-teste-mcp` (v3)
- **URL**: https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-teste-mcp
- **Função**: Agente AI que detecta menções ao Trello e busca dados do MCP

### 2. `agente-mcp-trello-real` (v2)
- **URL**: https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-mcp-trello-real
- **Função**: Versão otimizada com ênfase em dados REAIS

## 📱 Como Usar

### 1. No Claude Code (MCP Local)
```typescript
// Listar listas
await mcp__trello__get_lists()

// Ver cards
await mcp__trello__get_cards_by_list({ 
  listId: "686b4422d297ee28b3d92163" 
})

// Criar card
await mcp__trello__add_card_to_list({
  listId: "686b4422d297ee28b3d92163",
  name: "Nova tarefa",
  description: "Descrição detalhada"
})
```

### 2. Via cURL para Servidor MCP
```bash
# Health check
curl http://173.249.22.2:5173/health

# Listar listas
curl -X POST http://173.249.22.2:5173/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "get_lists", "params": {}}'

# Criar card
curl -X POST http://173.249.22.2:5173/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "add_card_to_list",
    "params": {
      "listId": "686b4422d297ee28b3d92163",
      "name": "Test Card",
      "description": "Created via MCP"
    }
  }'
```

### 3. Via Edge Function
```javascript
// No frontend React/JS
const response = await fetch('https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-mcp-trello-real', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  },
  body: JSON.stringify({
    messages: [
      {
        role: 'user',
        content: 'Liste as tarefas do Trello'
      }
    ]
  })
})
```

## 📊 IDs das Listas (Board Liftlio)

| Lista | ID |
|-------|-----|
| Steve To Do Items | `686b440c1850daf5c7b67d47` |
| Steve is Working On it | `686b4abbc2844bbd01e4770a` |
| **Valdair** | `686b4422d297ee28b3d92163` |
| **Valdair Is Working On it** | `686b4ad61da133ac3b998284` |
| **Completed** | `686b442bd7c4de1dbcb52ba8` |
| Research laboratory items | `686ba6823ff02e290d3652e1` |

## 🧪 Testes Realizados

1. ✅ MCP Local listando boards e criando cards
2. ✅ Servidor Python com health check funcionando
3. ✅ Listagem de listas reais do Trello
4. ✅ Listagem de cards reais
5. ✅ Criação de cards reais
6. ✅ Edge Functions processando com Claude AI
7. ✅ Integração completa funcionando

## 🔧 Manutenção

### Reiniciar servidor MCP
```bash
ssh root@173.249.22.2
cd /opt/containers/mcp-inspector
pkill -f server_trello_real.py
nohup python3 server_trello_real.py > trello.log 2>&1 &
```

### Ver logs
```bash
ssh root@173.249.22.2
tail -f /opt/containers/mcp-inspector/trello.log
```

### Atualizar credenciais
Editar `/opt/containers/mcp-inspector/.env`

## 🎯 Próximos Passos

1. Adicionar mais métodos (update_card, move_card, etc)
2. Implementar cache para reduzir chamadas à API
3. Adicionar autenticação própria no servidor MCP
4. Criar dashboard de monitoramento
5. Integrar com outros serviços (GitHub, Notion, etc)

## 🏆 Conquistas

- Sistema MCP completo funcionando
- Integração REAL com Trello API
- Edge Functions com AI integrada
- Arquitetura escalável e modular
- Documentação completa

---

**Sistema testado e funcionando em 23/01/2025 às 21:50 BRT** 🚀