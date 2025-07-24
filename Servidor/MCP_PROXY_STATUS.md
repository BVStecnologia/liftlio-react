# MCP Proxy - Status de Instalação

**Data**: 23/01/2025  
**Status**: ✅ INSTALADO E FUNCIONANDO  
**Localização**: `/opt/containers/mcp-inspector`  
**Porta**: 5173  

## 🚀 O que foi instalado

Um servidor proxy HTTP customizado que:
- Recebe requisições HTTP/JSON
- Processa comandos MCP
- Retorna respostas padronizadas
- Roda em container Docker isolado

## 📋 Detalhes da Instalação

### Container
- **Nome**: mcp-inspector-isolated
- **Rede**: mcp-isolated (isolada)
- **Porta**: 5173
- **Restart**: always

### Arquivos criados no servidor
```
/opt/containers/mcp-inspector/
├── Dockerfile
├── docker-compose.yml
├── server.js          # Servidor Express
├── package.json       # Dependências
├── config.json        # Config MCP (não usado ainda)
└── .env              # Credenciais (placeholder)
```

## 🌐 URLs de Acesso

- **Health Check**: http://173.249.22.2:5173/health
- **API Base**: http://173.249.22.2:5173/mcp/{service}/{method}

## 🧪 Como Testar

### 1. Health Check
```bash
curl http://173.249.22.2:5173/health
# Resposta: {"status":"ok","service":"mcp-proxy"}
```

### 2. Teste de API
```bash
curl -X POST http://173.249.22.2:5173/mcp/trello/test \
  -H "Content-Type: application/json" \
  -d '{"params": {"test": true}}'
```

### 3. Em Edge Function
```typescript
const response = await fetch('http://173.249.22.2:5173/mcp/trello/add_card_to_list', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    params: {
      listId: '686b4422d297ee28b3d92163',
      name: 'Task from Edge Function'
    }
  })
});
```

## ⚠️ Status Atual

O servidor está **funcionando como proxy**, mas ainda **não executa comandos MCP reais**. 

### Próximos passos necessários:
1. Instalar MCPs reais no container
2. Implementar lógica de execução no server.js
3. Configurar credenciais no .env
4. Adicionar autenticação

## 🛠️ Comandos Úteis

```bash
# Ver logs
ssh root@173.249.22.2
docker logs -f mcp-inspector-isolated

# Reiniciar
cd /opt/containers/mcp-inspector
docker-compose restart

# Parar
docker-compose down

# Editar servidor
nano server.js
docker-compose build && docker-compose up -d
```

## 🔒 Segurança

- ✅ Container isolado
- ✅ Rede própria
- ✅ Não afeta outros serviços
- ⚠️ Sem autenticação (adicionar JWT)
- ⚠️ Credenciais placeholder

## 📝 Notas

- Docker Compose foi instalado em `/usr/local/bin/docker-compose`
- O MCP Inspector original teve problemas, então criamos um proxy customizado
- Este é um MVP funcional que pode ser expandido conforme necessário