# 🚀 Servidor Liftlio - Hub de Serviços MCP

**IP**: 173.249.22.2  
**Specs**: 6 CPU, 12GB RAM, 300GB SSD  
**Sistema**: Ubuntu/Debian  

## 📁 Estrutura Organizada

```
Servidor/
├── 📄 README.md                    # Este arquivo
├── 📁 mcp-services/                # Serviços MCP ativos
│   ├── 📁 trello/                  # MCP Trello (✅ Funcionando)
│   │   └── README.md               # Documentação e configuração
│   └── 📁 gmail/                   # MCP Gmail (🔄 Config pendente)
│       ├── install.sh              # Script de instalação
│       ├── setup-oauth-headless.sh # Setup OAuth2
│       └── README.md               # Documentação
├── 📁 config/                      # Configurações centralizadas
│   ├── claude-desktop-config.json  # Config do Claude Desktop
│   ├── claude-mcp-config.json      # Config geral MCP
│   └── oauth-credentials.json      # Credenciais (gitignore)
├── 📁 docs/                        # Documentação completa
│   └── MCP_SERVICES_GUIDE.md       # Guia completo dos serviços
├── 📁 examples/                    # Exemplos de implementação
│   ├── edge-function-example.ts    # Exemplo Edge Function
│   ├── teste-agente-mcp.html       # Teste web do agente
│   └── mcp-client-trello.js        # Cliente JS para Trello
├── 📁 scripts/                     # Scripts utilitários
│   └── install-mcp-safe.sh         # Instalador seguro
└── 📁 archive/                     # Documentações antigas

## 🐳 Containers em Produção

| Serviço | Porta | Status | Descrição |
|---------|-------|--------|-----------|
| Portainer | 9000 | ✅ Ativo | Gerenciador de containers |
| n8n | 5678 | ✅ Ativo | Automação com MCP nodes |
| Langflow | 7860 | ✅ Ativo | Flow builder para LLMs |
| MCP Trello | 5173 | ✅ Ativo | Integração com Trello API |
| MCP Gmail | 3000 | 🔄 Config | Aguardando OAuth2 |

## 🚀 Quick Start - Serviços MCP

### 1. Testar MCP Trello (Funcionando)
```bash
curl http://173.249.22.2:5173/health
```

### 2. Configurar MCP Gmail
```bash
# 1. Gerar URL OAuth2
# 2. Autorizar no navegador
# 3. Configurar token no servidor
# Ver: mcp-services/gmail/README.md
```

## 📝 Edge Functions Disponíveis

| Nome | Endpoint | Capacidades |
|------|----------|-------------|
| agente-mcp-trello-real | /functions/v1/agente-mcp-trello-real | Single ops, tempo real |
| agente-mcp-trello-batch | /functions/v1/agente-mcp-trello-batch | Batch ops, até 25 simultâneas |

## 🔧 Comandos Úteis

```bash
# Ver todos os containers
docker ps -a

# Ver logs de um serviço
docker logs -f <container-name>

# Acessar Portainer
http://173.249.22.2:9000

# Acessar n8n
http://173.249.22.2:5678

# Acessar MCP Inspector (após instalação)
http://173.249.22.2:5173
```

## 📊 Recursos do Servidor

- CPU: 6 cores disponíveis
- RAM: 12GB total (~8GB livre)
- Disco: 300GB SSD (~250GB livre)
- Rede: 1Gbps
- OS: Linux

## 🔐 Segurança

- Firewall configurado
- Apenas portas necessárias abertas
- Containers em redes isoladas
- Credenciais em arquivos .env (não commitados)

## 🔗 Links Importantes

- **Documentação Completa**: [docs/MCP_SERVICES_GUIDE.md](./docs/MCP_SERVICES_GUIDE.md)
- **MCP Trello**: [mcp-services/trello/README.md](./mcp-services/trello/README.md)
- **MCP Gmail**: [mcp-services/gmail/README.md](./mcp-services/gmail/README.md)
- **Exemplos**: [examples/](./examples/)

---

**Última atualização**: 24/01/2025