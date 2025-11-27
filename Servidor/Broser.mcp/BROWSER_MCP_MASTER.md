# BROWSER MCP - DOCUMENTO MESTRE

**Ultima atualizacao:** 2025-11-26
**Status:** EM PROGRESSO

---

## 1. O QUE O USUARIO QUER

O usuario quer um **Browser MCP por projeto** no Liftlio que:

1. **Automacao via AI**: Recebe tarefas em linguagem natural e executa (igual Claude Code local)
2. **Visualizacao em tempo real**: Usuario ve o browser ao vivo no painel (video streaming)
3. **Interacao direta**: Usuario pode clicar, digitar, navegar (como se fosse o computador dele)
4. **Agendamento**: Tarefas podem vir do usuario OU do sistema automaticamente

**Exemplo de uso:**
- Usuario abre o painel Liftlio Browser
- Ve o navegador em tempo real (pode estar no YouTube)
- Digita: "Pesquise videos sobre AI news e colete os 5 primeiros titulos"
- AI controla o browser, executa a tarefa
- Usuario VE o browser sendo controlado em tempo real
- Resultado aparece na interface

---

## 2. PROBLEMA IDENTIFICADO

### O que foi tentado:

| Solucao | Automacao | Video Live | Problema |
|---------|-----------|------------|----------|
| Browser Agent + Screenshots | SIM | NAO (2s delay) | Nao da pra ver video do YouTube |
| Browser Agent + VNC | SIM | SIM (com lag) | Videos do YouTube engasgam |
| Neko (WebRTC) | NAO | SIM (perfeito) | Neko e browser SEPARADO, nao compartilha sessao |

### A raiz do problema:

**Neko e Browser Agent sao DOIS browsers diferentes!**

```
Browser Agent (Playwright/Chromium)     Neko (Firefox/WebRTC)
         |                                      |
    [Automacao]                            [Streaming]
         |                                      |
    Sessao A                                Sessao B
    Cookies A                               Cookies B
         |                                      |
    NAO COMPARTILHAM NADA!
```

Se faz login no Neko, o Browser Agent nao ve.
Se o Browser Agent navega, o Neko nao sabe.

---

## 3. SOLUCAO PROPOSTA

### Arquitetura: Browser Agent com VNC otimizado

```
                    Usuario (Browser)
                           |
                           v
                    LiftlioBrowser.tsx
                           |
           +---------------+---------------+
           |                               |
           v                               v
    [Modo AI]                       [Modo Live]
    Click-to-Action                 noVNC/WebRTC
    Screenshots 2s                  Video stream
           |                               |
           +---------------+---------------+
                           |
                           v
                  Edge Function (browser-proxy)
                           |
                           v
                    VPS (173.249.22.2)
                           |
                           v
                    Orchestrator (:8080)
                           |
                           v
            +-------- Browser Agent --------+
            |      (Playwright + X11)       |
            |                               |
            |   Chromium rodando em X11     |
            |        (display :99)          |
            |              |                |
            |   +----------+----------+     |
            |   |                     |     |
            |   v                     v     |
            | API MCP              VNC/noVNC|
            | (automacao)          (video)  |
            +-------------------------------+
```

### Por que isso funciona:

1. **UM unico browser** (Chromium via Playwright)
2. **Uma unica sessao** (cookies, login, etc)
3. **Automacao** via Playwright API (ja funciona)
4. **Visualizacao** via noVNC (video do Chromium)
5. **Interacao** via VNC (mouse/teclado direto) ou via API

---

## 4. ESTADO ATUAL (2025-11-26)

### Containers rodando:
- `browser-orchestrator` (:8080) - Gerencia containers
- `neko-neko-1` (:8082) - POC do Neko (SERA REMOVIDO)

### Containers NAO rodando:
- `browser-agent-*` - NENHUM container de browser agent existe!

### Imagens disponiveis:
- `liftlio/browser-agent:vnc` (2.69GB) - JA EXISTE, pronta para uso

### O que funciona:
- Orchestrator API (criar/deletar containers)
- Browser Agent image com VNC
- Edge Function browser-proxy
- Frontend LiftlioBrowser.tsx

### O que precisa fazer:
1. Criar container browser-agent para projeto de teste
2. Verificar se VNC funciona
3. Testar integracao com frontend
4. Otimizar video se necessario

---

## 5. PLANO DE EXECUCAO

### FASE 1: RESTAURAR BROWSER AGENT (Prioridade ALTA)

- [ ] 1.1 Criar container browser-agent para projeto 117
- [ ] 1.2 Verificar health do container
- [ ] 1.3 Testar navegacao basica via API
- [ ] 1.4 Tirar screenshot para confirmar

### FASE 2: TESTAR VNC (Prioridade ALTA)

- [ ] 2.1 Verificar porta VNC alocada (ex: 16080)
- [ ] 2.2 Acessar noVNC no navegador
- [ ] 2.3 Confirmar que ve o Chromium rodando
- [ ] 2.4 Testar controle via VNC (mouse/teclado)

### FASE 3: INTEGRAR NO FRONTEND (Prioridade MEDIA)

- [ ] 3.1 Modificar LiftlioBrowser.tsx para modo VNC
- [ ] 3.2 Embedar noVNC via iframe
- [ ] 3.3 Testar toggle AI/Live

### FASE 4: OTIMIZAR VIDEO (Prioridade BAIXA)

- [ ] 4.1 Ajustar compressao JPEG do VNC
- [ ] 4.2 Testar diferentes codecs
- [ ] 4.3 Se necessario, investigar WebRTC para Playwright

---

## 6. COMANDOS UTEIS

### SSH no VPS:
```bash
ssh -i "C:/c/Users/User/.ssh/contabo_key_new" root@173.249.22.2
```

### Ver containers:
```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

### Criar container browser-agent:
```bash
curl -X POST http://localhost:8080/containers \
  -H "Content-Type: application/json" \
  -d '{"projectId":"117","userId":"test"}'
```

### Health do container:
```bash
curl http://localhost:10100/health
```

### Testar navegacao:
```bash
curl -X POST http://localhost:10100/mcp/navigate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://youtube.com"}'
```

### Screenshot:
```bash
curl http://localhost:10100/mcp/screenshot
```

---

## 7. ARQUIVOS IMPORTANTES

```
Servidor/Broser.mcp/
├── BROWSER_MCP_MASTER.md    <- ESTE ARQUIVO (fonte unica da verdade)
├── docker-compose.yml       <- Orquestracao Docker
├── .env                     <- Variaveis de ambiente
├── orchestrator/            <- API de gerenciamento
│   └── src/
│       ├── index.ts         <- Endpoints REST
│       └── container-manager.ts <- Criacao de containers
└── browser-agent/           <- Agente com Playwright
    └── src/
        ├── index.ts         <- Servidor Express
        ├── agent.ts         <- Claude AI Agent
        └── browser-manager.ts <- Gerenciador Playwright
```

---

## 8. DECISOES TECNICAS

### Por que NAO usar Neko sozinho?
- Neko e otimo para streaming, mas nao tem API de automacao
- Para tarefas automatizadas, precisamos de Playwright
- Rodar Playwright DENTRO do Neko adiciona complexidade desnecessaria

### Por que NAO usar so screenshots?
- Funciona para automacao, mas usuario nao ve video
- Delay de 2 segundos nao permite ver YouTube

### Por que VNC/noVNC?
- Browser Agent ja tem suporte a X11 + VNC
- Imagem `liftlio/browser-agent:vnc` ja existe
- Comprovadamente funciona (foi testado antes)

### Sobre o engasgo de video no VNC:
- Isso acontece porque VNC transmite CADA FRAME como imagem
- Para video 30fps, sao 30 imagens por segundo
- Solucoes possiveis:
  1. Reduzir qualidade (JPEG compression)
  2. Reduzir resolucao
  3. Usar WebRTC em vez de VNC (mais complexo)
  4. Usar protocolo SPICE (alternativa ao VNC)

---

## 9. PROXIMOS PASSOS IMEDIATOS

1. **AGORA**: Criar container browser-agent para projeto 117
2. **DEPOIS**: Testar VNC no navegador
3. **DEPOIS**: Integrar no frontend
4. **SE NECESSARIO**: Otimizar streaming

---

## 10. LOG DE PROGRESSO

| Data | Acao | Resultado |
|------|------|-----------|
| 2025-11-26 | Documento consolidado criado | OK |
| 2025-11-26 | MDs antigos removidos (PLANO_NEKO, PLANO_TESTES) | OK |
| 2025-11-26 | docker-compose corrigido para usar :vnc | OK |
| 2025-11-27 | Container browser-agent-117 criado com VNC | OK |
| 2025-11-27 | Navegacao para YouTube testada | OK |
| 2025-11-27 | VNC acessivel em porta 16080 | OK |
| 2025-11-27 | Sistema de URLs dinâmicas implementado (LOCAL/VPS) | OK |
| 2025-11-27 | Desenvolvimento local com Docker configurado | OK |
| 2025-11-27 | LiftlioBrowser.tsx atualizado com env vars | OK |
| 2025-11-27 | Documentação LOCAL → VPS workflow completa | OK |
| | | |

### URLs FUNCIONANDO:
- **MCP API**: http://173.249.22.2:10100
- **VNC**: http://173.249.22.2:16080/vnc.html?autoconnect=true&password=liftlio

---

## 11. WORKFLOW LOCAL → VPS (NOVO - 2025-11-27)

### DESENVOLVIMENTO LOCAL (Recomendado)

O Browser MCP agora suporta desenvolvimento 100% local usando Docker Desktop. Isso é **10x mais rápido** que trabalhar direto no VPS via SSH.

#### Setup LOCAL:

```bash
# 1. Garantir que Docker Desktop está rodando
docker ps

# 2. Iniciar orchestrator (se não estiver rodando)
cd Servidor/Broser.mcp
docker-compose up -d orchestrator

# 3. Criar container de teste localmente
curl -X POST http://localhost:8080/containers \
  -H "Content-Type: application/json" \
  -H "X-API-Key: liftlio-browser-mcp-secret-key-2025" \
  -d '{"projectId":"117"}'

# 4. Verificar se está rodando
curl http://localhost:10100/health
```

#### Configuração do Frontend:

O frontend agora usa **URLs dinâmicas** baseadas em variáveis de ambiente:

**Arquivo: liftlio-react/.env.local** (desenvolvimento local)
```bash
REACT_APP_BROWSER_ORCHESTRATOR_URL=http://localhost:8080
REACT_APP_BROWSER_MCP_API_KEY=liftlio-browser-mcp-secret-key-2025
```

**Produção** (usa Edge Function como proxy):
- URL default: `https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/browser-proxy`
- Edge Function faz proxy seguro para VPS 173.249.22.2

#### Como funciona:

```typescript
// Em LiftlioBrowser.tsx (linhas 12-19):
const BROWSER_ORCHESTRATOR_URL = process.env.REACT_APP_BROWSER_ORCHESTRATOR_URL ||
  'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/browser-proxy';
const BROWSER_MCP_API_KEY = process.env.REACT_APP_BROWSER_MCP_API_KEY || '';

// Modo DIRETO (localhost) ou via Edge Function (VPS)
const USE_DIRECT_MODE = BROWSER_ORCHESTRATOR_URL.startsWith('http://localhost');

console.log('[LiftlioBrowser] ORCHESTRATOR_URL:', BROWSER_ORCHESTRATOR_URL,
  'USE_DIRECT_MODE:', USE_DIRECT_MODE, 'API_KEY:', !!BROWSER_MCP_API_KEY);
```

### QUANDO USAR LOCAL vs VPS:

| Situação | Usar LOCAL | Usar VPS |
|----------|-----------|----------|
| Desenvolvimento/testes | ✅ SIM | ❌ NÃO |
| Debugging de bugs | ✅ SIM | ❌ NÃO |
| Testes de integração | ✅ SIM | ❌ NÃO |
| Produção (usuários reais) | ❌ NÃO | ✅ SIM |
| Containers 24/7 rodando | ❌ NÃO | ✅ SIM |

### WORKFLOW RECOMENDADO:

1. **Desenvolver LOCAL** (muito mais rápido, sem SSH, sem delay)
   - Docker rodando em localhost:8080
   - Frontend em localhost:3000
   - Mudanças instantâneas

2. **Testar LOCAL** (tudo funciona perfeitamente?)
   - Criar containers
   - Executar tarefas
   - Verificar VNC/screenshots
   - Debugging fácil

3. **Deploy VPS** (somente quando aprovado)
   - Fazer commit no Git
   - SSH no VPS
   - `git pull`
   - `docker-compose build && docker-compose up -d`
   - Containers persistentes para produção

### URLs ATUALIZADAS:

#### LOCAL (desenvolvimento):
- **Orchestrator**: http://localhost:8080
- **Browser Agent**: http://localhost:10100 (porta base, +1 para cada container)
- **VNC**: http://localhost:16080/vnc.html?autoconnect=true&password=liftlio
- **Frontend**: http://localhost:3000

#### VPS (produção):
- **Orchestrator**: http://173.249.22.2:8080 (via Edge Function proxy)
- **Browser Agent**: http://173.249.22.2:10100
- **VNC**: http://173.249.22.2:16080/vnc.html?autoconnect=true&password=liftlio
- **Frontend**: https://liftlio.com

---

## 12. ARQUIVOS DEPRECADOS

Os seguintes arquivos foram consolidados neste documento e podem ser removidos:

- `PLANO_NEKO.md` - Consolidado aqui
- `PLANO_TESTES.md` - Consolidado aqui
- `README.md` - Manter como referencia de API

---

**FIM DO DOCUMENTO MESTRE**
