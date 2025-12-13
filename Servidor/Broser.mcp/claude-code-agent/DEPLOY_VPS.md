# Deploy para VPS - Liftlio Browser System v4

## Pre-requisitos na VPS

- Docker instalado
- Docker Compose instalado
- Git instalado
- Portas liberadas: 8080 (orchestrator), 10100-10150 (MCP), 16000-16050 (VNC)

## Passo 1: Clonar/Atualizar Repositorio

```bash
# Se primeiro deploy:
cd /opt
git clone https://github.com/BVStecnologia/liftlio-react.git browser-agent
cd browser-agent
git checkout Agente.browser

# Se atualizando:
cd /opt/browser-agent
git pull origin Agente.browser
```

## Passo 2: Ir para Pasta do Browser Agent

```bash
cd Servidor/Broser.mcp/claude-code-agent
```

## Passo 3: Configurar Variaveis de Ambiente

```bash
# Criar .env com suas credenciais
cat > .env << 'EOF'
# Orchestrator
API_SECRET_KEY=sua-chave-secreta-aqui
MAX_CONTAINERS=10
HOST_IP=SEU_IP_PUBLICO_OU_localhost
SESSION_TIMEOUT_MINUTES=60

# Servicos externos
CAPMONSTER_API_KEY=sua-key
PROXY_URL=http://user:pass@proxy:port
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=sua-anon-key
EOF
```

## Passo 4: Build das Imagens

```bash
docker compose -f docker-compose-vnc.yml build
```

## Passo 5: Criar Volume de Credenciais

```bash
# Criar volume
docker volume create claude-credentials

# Copiar credenciais (de uma maquina com Claude Code logado)
# Opcao A: Via SCP do seu PC
scp ~/.claude/.credentials.json root@VPS_IP:/tmp/

# Na VPS, copiar para o volume
docker run --rm -v claude-credentials:/dest -v /tmp:/src alpine \
  cp /src/.credentials.json /dest/.credentials.json
```

## Passo 6: Primeiro Login (Uma Vez So)

Se nao tiver credenciais prontas:

```bash
# Iniciar container temporario
docker run -it --rm \
  -v claude-credentials:/home/claude/.claude \
  claude-code-agent-browser-agent:latest \
  /bin/bash

# Dentro do container:
claude  # Fazer login interativo (abre browser)

# Apos login, sair
exit
```

## Passo 7: Iniciar Sistema

```bash
docker compose -f docker-compose-vnc.yml up -d
```

## Passo 8: Verificar

```bash
# Health do orchestrator
curl http://localhost:8080/health

# Ver logs
docker logs liftlio-orchestrator
docker logs claude-token-refresher

# Testar criar container
curl -X POST http://localhost:8080/containers \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-chave-secreta" \
  -d '{"projectId": "117"}'
```

## Comandos Uteis

```bash
# Ver containers rodando
docker ps

# Parar tudo
docker compose -f docker-compose-vnc.yml down

# Rebuild e reiniciar
docker compose -f docker-compose-vnc.yml up -d --build

# Ver logs do orchestrator
docker logs -f liftlio-orchestrator

# Destruir container de projeto
curl -X DELETE http://localhost:8080/containers/117 \
  -H "X-API-Key: sua-chave-secreta"
```

## Troubleshooting

### Erro: Docker socket permission denied
```bash
# Verificar permissoes
ls -la /var/run/docker.sock

# Se necessario, dar permissao
chmod 666 /var/run/docker.sock
```

### Erro: Token expirado
```bash
# Verificar logs do token-refresher
docker logs claude-token-refresher

# Ver conteudo do volume
docker run --rm -v claude-credentials:/creds alpine cat /creds/.credentials.json
```

### Erro: Container nao inicia
```bash
# Ver logs detalhados
docker logs liftlio-browser-{projectId}

# Verificar imagem existe
docker images | grep browser-agent
```

## Portas Usadas

| Servico | Porta | Descricao |
|---------|-------|-----------|
| Orchestrator | 8080 | API de gerenciamento |
| MCP Base | 10100 | API do browser agent |
| VNC Base | 16000 | Visualizacao |
| MCP Project N | 10100+N | Por projeto |
| VNC Project N | 16000+N | Por projeto |

## Seguranca

1. **Sempre use API_SECRET_KEY** em producao
2. **Nao exponha porta 8080** publicamente sem proxy/firewall
3. **Credenciais OAuth** sao sensiveis - proteger o volume
4. **Limitar MAX_CONTAINERS** para evitar exaustao de recursos
