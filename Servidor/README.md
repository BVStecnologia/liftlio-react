# 🚀 Servidor Liftlio - Hub de Serviços MCP

## 🚨 REGRAS DE SEGURANÇA - LEIA PRIMEIRO! 🚨

### ⛔ NUNCA COMITAR SENHAS OU CREDENCIAIS NO GIT!

**REGRAS OBRIGATÓRIAS:**
1. **TODAS as senhas devem ficar APENAS no arquivo `.env`**
2. **NUNCA coloque senhas diretamente em scripts**
3. **SEMPRE use variáveis de ambiente: `$SSH_PASSWORD`, `$SSH_USER`, etc**
4. **Antes de fazer commit, SEMPRE verifique se há senhas expostas**
5. **O arquivo `.env` NUNCA deve ser commitado (já está no .gitignore)**

**COMO USAR CREDENCIAIS:**
```bash
# ✅ CORRETO - Usar variáveis do .env
source "$(dirname "$0")/../../.env"
sshpass -p "$SSH_PASSWORD" ssh $SSH_USER@$SSH_HOST

# ❌ ERRADO - Senha hardcoded
sshpass -p 'Bvs20211993***' ssh root@173.249.22.2
```

**SE VOCÊ EXPOR UMA SENHA:**
1. O GitGuardian vai detectar e alertar
2. Você terá que limpar todo o histórico do Git
3. A senha ficará comprometida permanentemente
4. Será necessário trocar todas as senhas do servidor

---

**IP**: 173.249.22.2  
**Specs**: 6 CPU, 12GB RAM, 300GB SSD  
**Sistema**: Ubuntu 24.04.2 LTS  
**Credenciais SSH**: Ver arquivo `/Servidor/.env`  

## 📁 Estrutura Organizada

```
Servidor/
├── 📄 README.md                    # Este arquivo
├── 📁 mcp-services/                # Serviços MCP ativos
│   ├── 📁 trello/                  # MCP Trello (✅ Funcionando)
│   │   └── README.md               # Documentação e configuração
│   └── 📁 gmail/                   # MCP Gmail (✅ Funcionando)
│       ├── README.md               # Documentação completa
│       ├── INSTRUCOES_FINAIS.md    # Quick start
│       ├── configurar-claude.sh    # Script de config
│       └── criar-container.sh      # Criar container Docker
├── 📁 config/                      # Configurações centralizadas
│   ├── claude-desktop-config.json  # Config do Claude Desktop
│   ├── claude-mcp-config.json      # Config geral MCP
│   ├── server-credentials.txt      # Credenciais SSH
│   └── client_secret_*.json        # OAuth credentials
├── 📁 docs/                        # Documentação completa
│   ├── MCP_SERVICES_GUIDE.md       # Guia completo dos serviços
│   ├── ESTADO_MCP_GMAIL_SEM_TOKENS.md
│   ├── MCP_GMAIL_FUNCIONANDO.md
│   └── ORGANIZACAO_COMPLETA.md
├── 📁 examples/                    # Exemplos de implementação
│   ├── edge-function-example.ts    # Exemplo Edge Function
│   ├── teste-agente-mcp.html       # Teste web do agente
│   └── mcp-client-trello.js        # Cliente JS para Trello
├── 📁 scripts/                     # Scripts utilitários
│   ├── install-mcp-safe.sh         # Instalador seguro
│   ├── install-remote.sh           # Instalação remota
│   └── commit-servidor.sh          # Commit automático
└── 📁 archive/                     # Documentações antigas

## 🐳 Containers em Produção

| Serviço | Porta | Status | Descrição |
|---------|-------|--------|-----------|
| Portainer | 9000 | ✅ Ativo | Gerenciador de containers |
| n8n | 5678 | ✅ Ativo | Automação com MCP nodes |
| Langflow | 7860 | ✅ Ativo | Flow builder para LLMs |
| MCP Trello | 5173 | ✅ Ativo | Integração com Trello API |
| MCP Gmail | 3000 | ✅ Ativo | Email via Gmail OAuth2 |
| Glances | 61208 | ✅ Ativo | Monitor de sistema |

## 🚀 Quick Start - Serviços MCP

### 1. Configurar Gmail MCP no Claude Code
```bash
# Remover configuração antiga
claude mcp remove gmail

# Adicionar novo servidor
claude mcp add gmail -s user --transport sse "http://173.249.22.2:3000/sse"

# Reiniciar Claude Code
exit && claude
```

### 2. Testar Serviços
```bash
# Testar MCP Trello
curl http://173.249.22.2:5173/health

# Testar MCP Gmail  
curl http://173.249.22.2:3000/health
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

## 🎯 Status dos Serviços MCP

- **Gmail MCP**: ✅ Funcionando - Testado com sucesso (26/07/2025)
- **Trello MCP**: ✅ Funcionando - Integrado ao Claude Code
- **Servidor**: ✅ Estável - Todos os containers ativos

---

**Última atualização**: 26/07/2025