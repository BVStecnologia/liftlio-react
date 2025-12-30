# Token OAuth do Claude Code - Guia Completo

**DOCUMENTO AUTO-EXPLICATIVO - LEIA ANTES DE QUALQUER ACAO**
**Ultima atualizacao: 2025-12-30**

---

## RESUMO EXECUTIVO (LEIA PRIMEIRO!)

O sistema de Browser Agents do Liftlio usa **token OAuth do Claude Max**.
Este token dura **1 ANO** porque foi criado com `claude setup-token`.

```
STATUS ATUAL DO TOKEN:
=======================
Criado em:     29/12/2025
Expira em:     29/12/2026 (1 ano)
Localizacao:   VPS 173.249.22.2
Arquivo:       /var/lib/docker/volumes/claude-credentials/_data/.credentials.json
Tipo:          setup-token (1 ano de duracao)

PROXIMA ACAO: Renovar em Dezembro de 2026
```

---

## POR QUE O TOKEN DURA 1 ANO?

### Existem 2 formas de autenticar no Claude Code:

| Comando | Duracao | Uso |
|---------|---------|-----|
| `claude /login` | **8-12 HORAS** | Uso interativo no terminal |
| `claude setup-token` | **1 ANO** | Automacao, Docker, CI/CD |

### Nosso script usa setup-token:

```javascript
// oauth-direct.js - linha 18
ptyProc = pty.spawn("claude", ["setup-token"], {...})
//                            ^^^^^^^^^^^^^^^
//                            ESTE COMANDO GERA TOKEN DE 1 ANO!
```

**Por isso o token atual dura 1 ano, nao horas.**

---

## COMO VERIFICAR SE O TOKEN ESTA VALIDO

### Comando rapido no VPS:
```bash
ssh root@173.249.22.2

# Depois no VPS:
node -e "const c=require('/var/lib/docker/volumes/claude-credentials/_data/.credentials.json');const d=Math.floor((c.claudeAiOauth.expiresAt-Date.now())/(1000*60*60*24));console.log('Dias restantes:',d)"
```

---

## COMO RENOVAR O TOKEN

### Passo 1: Conectar no VPS
```bash
ssh root@173.249.22.2
```

### Passo 2: Executar o script
```bash
docker exec -it token-ferramenta node /app/oauth-direct.js
```

### Passo 3: Sincronizar volumes (OBRIGATORIO!)
```bash
cp /var/lib/docker/volumes/claude-credentials-v3/_data/.credentials.json    /var/lib/docker/volumes/claude-credentials/_data/.credentials.json
```

### Passo 4: Testar
```bash
curl -s -X POST "http://localhost:10117/agent/task"   -H "Content-Type: application/json"   -d '{"task": "Go to google.com"}' | jq .success
```

---

## ARQUITETURA

```
VPS 173.249.22.2
================

CONTAINER: token-ferramenta
  - Gera tokens OAuth de 1 ano
  - Chromium + Claude CLI + oauth-direct.js
  - Volume: claude-credentials-v3
  - Portas: 5901 (VNC), 6080 (noVNC)

CONTAINER: liftlio-browser-117
  - Executa tarefas de navegacao
  - Le token de volume: claude-credentials (sem -v3)
  - Porta: 10117

VOLUMES:
  - claude-credentials-v3  <-- Ferramenta ESCREVE
  - claude-credentials     <-- Agents LEEM
  - MANTER SINCRONIZADOS!
```

---

## PROBLEMA COMUM: "OAuth token has expired"

### Causa: Volumes dessincronizados

### Solucao:
```bash
ssh root@173.249.22.2 "cp /var/lib/docker/volumes/claude-credentials-v3/_data/.credentials.json /var/lib/docker/volumes/claude-credentials/_data/.credentials.json"
```

---

## COMO oauth-direct.js FUNCIONA

### Dependencias:
- **node-pty**: Terminal PTY real (resolve "Raw mode not supported")
- **puppeteer-core**: Controla Chromium via CDP

### Fluxo:
1. node-pty.spawn("claude", ["setup-token"]) - PTY real
2. Captura URL OAuth do output
3. Puppeteer navega para URL
4. Clica "Autorizar" via CDP dispatchMouseEvent
5. Captura codigo da pagina callback
6. Digita codigo no PTY
7. Token salvo em /opt/claude-credentials/

---

## RECRIAR CONTAINER (se necessario)

```bash
cd /root/token-refresher-v3
docker-compose up -d ferramenta
```

Depois fazer login manual via VNC:
1. Acessar: http://173.249.22.2:6080
2. Abrir Chromium
3. Login em claude.ai com:
   - Email: liftliome@gmail.com
   - Senha: Y3jA3yW@0

---

## CREDENCIAIS

| Item | Valor |
|------|-------|
| VPS | 173.249.22.2 |
| SSH Key | ~/.ssh/contabo_key_new |
| Gmail | liftliome@gmail.com |
| Gmail Senha | Y3jA3yW@0 |
| VNC URL | http://173.249.22.2:6080 |
| VNC Senha | vncpass |

---

## CALENDARIO

| Data | Acao |
|------|------|
| 29/12/2025 | Token criado |
| Nov/2026 | Lembrete |
| 29/12/2026 | RENOVAR! |

---

## HISTORICO

| Data | Evento |
|------|--------|
| 2025-12-29 | oauth-direct.js criado |
| 2025-12-30 | Descoberto: setup-token = 1 ANO |
| 2025-12-30 | Documentacao criada |

---

**Quando precisar renovar, siga COMO RENOVAR O TOKEN acima.**
