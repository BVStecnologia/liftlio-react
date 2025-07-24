# MCP Inspector - Documentação Completa

**Criado em**: 23/01/2025  
**Localização**: `/opt/containers/mcp-inspector` (no servidor)  
**Porta**: 5173 (ou próxima disponível)  
**Status**: 🟢 Pronto para instalação

## 📋 Índice
1. [O que é o MCP Inspector](#o-que-é-o-mcp-inspector)
2. [Arquitetura](#arquitetura)
3. [Instalação](#instalação)
4. [Configuração](#configuração)
5. [Uso](#uso)
6. [Adicionar MCPs](#adicionar-mcps)
7. [Integração com Edge Functions](#integração-com-edge-functions)
8. [Manutenção](#manutenção)
9. [Troubleshooting](#troubleshooting)

## O que é o MCP Inspector

MCP Inspector é uma ferramenta oficial da Anthropic que permite:
- 🔌 Rodar múltiplos MCP servers em um único container
- 🌐 Interface web para testar e debugar
- 🚀 API REST automática para todos os MCPs
- 🔒 Isolamento completo dos outros containers

## Arquitetura

```
┌─────────────────────────────────┐
│   Supabase Edge Functions       │
└─────────────┬───────────────────┘
              │ HTTP/JSON
              ▼
┌─────────────────────────────────┐
│   MCP Inspector (porta 5173)    │
│   ┌─────────────────────────┐   │
│   │  - Trello MCP           │   │
│   │  - WordPress MCP        │   │
│   │  - Supabase MCP         │   │
│   │  - (outros MCPs...)     │   │
│   └─────────────────────────┘   │
└─────────────────────────────────┘
              │
              ▼
    Rede isolada: mcp-isolated
```

## Instalação

### 1. Conectar no servidor
```bash
ssh root@173.249.22.2
```

### 2. Executar script de instalação
```bash
cd /Users/valdair/Documents/Projetos/Liftlio/Servidor/scripts
./install-mcp-safe.sh
```

O script irá:
- ✅ Verificar containers existentes (sem afetar)
- ✅ Encontrar porta livre
- ✅ Criar rede isolada
- ✅ Instalar MCP Inspector

### 3. Configurar credenciais
```bash
cd /opt/containers/mcp-inspector
cp .env.template .env
nano .env
```

Preencha com suas credenciais reais:
- Trello API Key e Token
- WordPress credentials
- Supabase Access Token

## Configuração

### Credenciais Necessárias

#### Trello
```env
TRELLO_API_KEY=sua-api-key
TRELLO_TOKEN=seu-token
```
Obter em: https://trello.com/app-key

#### WordPress
```env
WORDPRESS_URL=https://wordpress-1319296-5689133.cloudwaysapps.com
WORDPRESS_USER=MCP claude
WORDPRESS_APP_PASSWORD=senha-de-aplicativo
```

#### Supabase
```env
SUPABASE_ACCESS_TOKEN=seu-token
SUPABASE_PROJECT_ID=suqjifkhmekcdflwowiw
```

## Uso

### Interface Web
Acesse: `http://173.249.22.2:5173`

### API REST

#### Listar MCPs disponíveis
```bash
curl http://173.249.22.2:5173/api/servers
```

#### Executar comando MCP
```bash
curl -X POST http://173.249.22.2:5173/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "server": "trello",
    "method": "add_card_to_list",
    "params": {
      "listId": "686b4422d297ee28b3d92163",
      "name": "Test Card",
      "description": "Created via API"
    }
  }'
```

### Integração com Edge Functions

```typescript
// Edge Function Supabase
const response = await fetch('http://173.249.22.2:5173/api/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    server: 'trello',
    method: 'add_card_to_list',
    params: {
      listId: '686b4422d297ee28b3d92163',
      name: '🚀 Automated Task',
      description: 'Created by Edge Function'
    }
  })
});

const result = await response.json();
```

## Adicionar MCPs

### Método 1: Script Helper
```bash
cd /opt/containers/mcp-inspector
./add-mcp.sh @modelcontextprotocol/server-github
```

### Método 2: Manual
1. Editar Dockerfile
2. Adicionar MCP no `npm install -g`
3. Adicionar `--server` no CMD
4. Rebuild: `docker-compose build`
5. Restart: `docker-compose up -d`

### MCPs Populares

| MCP | Descrição | Comando |
|-----|-----------|---------|
| GitHub | Integração com repos | `./add-mcp.sh @modelcontextprotocol/server-github` |
| Slack | Mensagens e canais | `./add-mcp.sh @modelcontextprotocol/server-slack` |
| SQLite | Banco de dados | `./add-mcp.sh @modelcontextprotocol/server-sqlite` |
| Filesystem | Arquivos locais | `./add-mcp.sh @modelcontextprotocol/server-filesystem` |
| Fetch | HTTP requests | `./add-mcp.sh mcp-server-fetch` |

## Manutenção

### Ver logs
```bash
docker logs -f mcp-inspector-isolated
```

### Reiniciar
```bash
cd /opt/containers/mcp-inspector
docker-compose restart
```

### Parar
```bash
docker-compose down
```

### Atualizar
```bash
docker-compose build --no-cache
docker-compose up -d
```

### Backup
```bash
cd /opt/containers
tar -czf mcp-inspector-backup-$(date +%Y%m%d).tar.gz mcp-inspector/
```

## Troubleshooting

### Container não inicia
```bash
# Ver logs detalhados
docker-compose logs -f

# Verificar porta em uso
netstat -tlnp | grep 5173

# Verificar rede
docker network ls | grep mcp-isolated
```

### MCP não responde
1. Verificar credenciais no .env
2. Testar na interface web primeiro
3. Ver logs específicos do MCP

### Erro de permissão
```bash
# Ajustar permissões
chmod -R 755 /opt/containers/mcp-inspector
chown -R root:root /opt/containers/mcp-inspector
```

## Segurança

- ✅ Container isolado em rede própria
- ✅ Não expõe credenciais
- ✅ Healthcheck automático
- ✅ Restart policy configurada

## Comandos Úteis

```bash
# Status do container
docker ps | grep mcp

# Uso de recursos
docker stats mcp-inspector-isolated

# Inspecionar container
docker inspect mcp-inspector-isolated

# Executar comando dentro do container
docker exec -it mcp-inspector-isolated sh

# Ver MCPs instalados
docker exec mcp-inspector-isolated npm list -g | grep mcp
```

## Próximos Passos

1. **Adicionar autenticação**: JWT ou API Key para produção
2. **HTTPS**: Configurar SSL com Let's Encrypt
3. **Monitoring**: Integrar com Prometheus/Grafana
4. **Rate limiting**: Proteger contra abuso

## Suporte

- Documentação MCP: https://modelcontextprotocol.io
- Issues: https://github.com/anthropics/mcp-inspector
- Este arquivo: `/Users/valdair/Documents/Projetos/Liftlio/Servidor/MCP_INSPECTOR.md`

---

**Nota**: Este container foi configurado para NÃO interferir com outros serviços rodando no servidor (n8n, Langflow, Portainer).