# Guia de Integração: Playwright MCP Híbrido

> **Objetivo**: Integrar Playwright MCP oficial no Docker MANTENDO todas as features custom
> **Data Início**: 2025-01-29
> **Status**: EM PROGRESSO

---

## Arquitetura Alvo

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Container                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              EXPRESS SERVER (porta 3000)                  │  │
│  │                                                           │  │
│  │  Mantém TODAS as features custom:                        │  │
│  │  ├── VNC on-demand control                               │  │
│  │  ├── Session save/restore (Supabase)                     │  │
│  │  ├── Humanization wrapper                                │  │
│  │  ├── Real-time clickAt/typeText                          │  │
│  │  ├── SSE broadcasting                                    │  │
│  │  └── Auto consent handlers                               │  │
│  │                                                           │  │
│  │  NOVO: Proxy para Playwright MCP                         │  │
│  │  ├── /mcp/* → localhost:8931 (Playwright MCP)            │  │
│  │  └── Intercepta e adiciona humanization                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         PLAYWRIGHT MCP SERVER (porta 8931 interno)        │  │
│  │                                                           │  │
│  │  ├── browser_navigate                                    │  │
│  │  ├── browser_click (locators nativos!)                   │  │
│  │  ├── browser_snapshot (accessibility tree!)              │  │
│  │  ├── browser_type                                        │  │
│  │  └── ... todos os 21 tools                               │  │
│  │                                                           │  │
│  │  Configurado com:                                        │  │
│  │  ├── --proxy-server (DataImpulse)                        │  │
│  │  ├── --init-script (stealth mode)                        │  │
│  │  └── --headless=false (para VNC)                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    CHROMIUM (display :99)                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              x11vnc + noVNC (porta 6080)                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Checklist de Implementação

### Fase 1: Preparacao
- [x] **1.1** Criar este guia de implementacao
- [x] **1.2** Criar backup: `Broser.mcp.backup/`
  - Comando: `cp -r "C:/Users/User/Desktop/Liftlio/Servidor/Broser.mcp" "C:/Users/User/Desktop/Liftlio/Servidor/Broser.mcp.backup"`
  - Status: COMPLETO (29/11/2025)

### Fase 2: Pesquisa do Pacote
- [x] **2.1** Identificar pacote npm correto do Playwright MCP
  - Pacote Microsoft oficial: `@playwright/mcp@0.0.48`
  - Mantido por: Microsoft/Playwright team
  - Binario: `mcp-server-playwright`
  - Status: COMPLETO (29/11/2025)

### Fase 3: Modificar package.json
- [x] **3.1** Adicionar dependencia Playwright MCP
  - Arquivo: `browser-agent/package.json`
  - Adicionado: `"@playwright/mcp": "^0.0.48"`
  - Adicionado: `"http-proxy-middleware": "^3.0.0"`
  - Status: COMPLETO (29/11/2025)

### Fase 4: Configurar Supervisor
- [x] **4.1** Adicionar programa playwright-mcp no supervisord.conf
  - Arquivo: `browser-agent/supervisord.conf`
  - Adicionado seção [program:playwright-mcp] com priority 450
  - Status: COMPLETO (29/11/2025)

### Fase 5: Criar Proxy Layer
- [x] **5.1** Criar arquivo `mcp-proxy.ts`
  - Arquivo: `browser-agent/src/mcp-proxy.ts`
  - Funcionalidades implementadas:
    - Proxy todas chamadas `/mcp/*` para `localhost:8931`
    - Humanization com delays aleatorios
    - Broadcast SSE events
    - Health check do Playwright MCP
  - Status: COMPLETO (29/11/2025)

### Fase 6: Integrar no Index
- [x] **6.1** Modificar `index.ts` para usar o proxy
  - Arquivo: `browser-agent/src/index.ts`
  - Adicionado import: `createMCPProxy, checkPlaywrightMCPHealth`
  - Adicionado router: `app.use('/mcp', mcpProxy)`
  - Status: COMPLETO (29/11/2025)

### Fase 7: Anti-Detection
- [x] **7.1** Criar arquivo `stealth.js`
  - Arquivo: `browser-agent/stealth.js`
  - Implementado: webdriver hide, fake plugins, chrome runtime mock,
    WebGL override, canvas fingerprint noise
  - Status: COMPLETO (29/11/2025)

### Fase 8: Modificar Dockerfile
- [x] **8.1** Atualizar Dockerfile.vnc
  - Arquivo: `browser-agent/Dockerfile.vnc`
  - Adicionado: `COPY stealth.js ./stealth.js`
  - Status: COMPLETO (29/11/2025)

### Fase 9: Build e Teste
- [x] **9.1** Build do container
  - Comando: `docker-compose build browser-agent-117`
  - Status: COMPLETO (29/11/2025)
- [x] **9.2** Start do container
  - Comando: `docker-compose up -d browser-agent-117`
  - Status: COMPLETO (29/11/2025)
  - Logs: Todos os 4 servicos RUNNING (xvfb, fluxbox, playwright-mcp, mcp-server)
- [x] **9.3** Health check
  - URL: http://localhost:10100/health
  - Resultado: `{"status":"healthy","projectId":"117","browserRunning":false}`
  - Status: COMPLETO (29/11/2025)
- [ ] **9.4** Testar VNC funciona
  - URL: http://localhost:16080
  - Status: PENDENTE
- [ ] **9.5** Testar tarefa Gmail
  - Tarefa: "navegue ate minha caixa de email do gmail abra o primeiro email"
  - Status: PENDENTE
- [ ] **9.6** Testar sessions persistem
  - Verificar Supabase
  - Status: PENDENTE

---

## Features Custom a Preservar

| Feature | Arquivo | Linhas | Status |
|---------|---------|--------|--------|
| VNC Streaming | index.ts | 43-902 | PRESERVAR |
| Session Persistence | browser-manager.ts | 950-1109 | PRESERVAR |
| Humanization | humanization.ts | todo | PRESERVAR |
| DataImpulse Proxy | proxy-config.ts | todo | PRESERVAR |
| Auto GDPR Consent | browser-manager.ts | 201-290 | PRESERVAR |
| Resource Blocking | browser-manager.ts | 293-361 | PRESERVAR |
| Stealth Mode | browser-manager.ts | 165-199 | PRESERVAR |
| Real-time clickAt | browser-manager.ts | 884-930 | PRESERVAR |
| SSE Events | index.ts | 206-226 | PRESERVAR |

---

## Configuração Final

**Portas:**
- 3000: Express server (seu código custom)
- 8931: Playwright MCP (interno, não exposto)
- 6080: noVNC (streaming)

**Modelo AI:** Haiku (mantém custo baixo)

---

## Rollback (Se Falhar)

```bash
# Se algo der errado, restaurar backup:
rm -rf "C:/Users/User/Desktop/Liftlio/Servidor/Broser.mcp"
mv "C:/Users/User/Desktop/Liftlio/Servidor/Broser.mcp.backup" \
   "C:/Users/User/Desktop/Liftlio/Servidor/Broser.mcp"
cd "C:/Users/User/Desktop/Liftlio/Servidor/Broser.mcp"
docker-compose build browser-agent-117
docker-compose up -d browser-agent-117
```

---

## Log de Progresso

### 2025-11-29
- [x] Sessao iniciada
- [x] Guia criado
- [x] Backup criado em `Broser.mcp.backup/`
- [x] Pacote identificado: `@playwright/mcp@0.0.48`
- [x] package.json atualizado
- [x] supervisord.conf atualizado com playwright-mcp (priority 450)
- [x] mcp-proxy.ts criado com humanization + SSE
- [x] index.ts integrado com proxy `/mcp/*`
- [x] stealth.js criado para anti-detection
- [x] Dockerfile.vnc atualizado
- [x] TypeScript compilado com sucesso
- [x] Docker build completo
- [x] Container iniciado - todos os 4 servicos RUNNING
- [x] Health check OK: `{"status":"healthy"}`
- [x] VNC iniciado com sucesso
- [x] Playwright MCP rodando na porta 8931 interna
- [ ] PENDENTE: Testar tarefa Gmail
- [ ] PENDENTE: Testar sessions persistem

---

## Notas Importantes

1. **Pacote Playwright MCP**: O pacote oficial é `@playwright/mcp` (Microsoft)
   - Docs: https://github.com/microsoft/playwright-mcp
   - npm: https://www.npmjs.com/package/@playwright/mcp

2. **Display compartilhado**: Tanto o Express server quanto o Playwright MCP precisam usar `DISPLAY=:99`

3. **Ordem de inicialização**:
   1. Xvfb (display virtual)
   2. Fluxbox (window manager)
   3. Playwright MCP (porta 8931)
   4. Express server (porta 3000)
   5. x11vnc + noVNC (porta 6080)

4. **Proxy intercept**: O proxy layer DEVE interceptar chamadas de click para adicionar delays de humanization
