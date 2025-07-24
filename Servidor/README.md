# Servidor Contabo - Liftlio

**IP**: 173.249.22.2  
**Specs**: 6 CPU, 12GB RAM, 300GB SSD  
**Sistema**: Ubuntu/Debian  

## 📁 Estrutura de Pastas

```
Servidor/
├── README.md                    # Este arquivo
├── MCP_INSPECTOR.md            # Documentação do MCP Inspector
├── docs/                       # Documentações gerais
├── scripts/                    # Scripts de instalação e manutenção
│   └── install-mcp-safe.sh    # Instalador do MCP Inspector
├── mcp-inspector/             # Arquivos do container MCP
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .env.template
│   └── add-mcp.sh
├── backups_vps/               # Backups dos serviços
│   ├── langflow_backup/
│   ├── n8n_backup/
│   └── portainer_backup/
└── flows_para_upload/         # Flows do Langflow

## 🐳 Containers em Produção

| Serviço | Porta | Status | Descrição |
|---------|-------|--------|-----------|
| Portainer | 9000 | ✅ Ativo | Gerenciador de containers |
| n8n | 5678 | ✅ Ativo | Automação com MCP nodes |
| Langflow | 7860 | ✅ Ativo | Flow builder para LLMs |
| MCP Inspector | 5173 | 🟡 Pronto | Hub para MCPs |

## 🚀 Instalação MCP Inspector

```bash
cd /Users/valdair/Documents/Projetos/Liftlio/Servidor/scripts
./install-mcp-safe.sh
```

## 📝 Notas Importantes

1. **Não mexer** nos containers existentes (n8n, Langflow, Portainer)
2. **MCP Inspector** roda em rede isolada `mcp-isolated`
3. **Credenciais** devem ser configuradas no `.env` antes de iniciar
4. **Backups** estão organizados em `backups_vps/`

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

---

**Última atualização**: 23/01/2025