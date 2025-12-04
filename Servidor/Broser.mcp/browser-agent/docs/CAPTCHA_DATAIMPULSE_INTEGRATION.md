# Integração CAPTCHA Solver + DataImpulse Proxy

> **Status**: Documentação pronta para implementação
> **Pré-requisitos**: Conta CapMonster Cloud + DataImpulse (já temos)
> **Criado**: 04/12/2025

---

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│            INTEGRAÇÃO: DataImpulse + CapMonster + Patchright                │
└─────────────────────────────────────────────────────────────────────────────┘

                        DataImpulse Proxy
                        (IP: 189.45.67.89)
                        Sticky Session
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
   ┌──────────────────┐           ┌──────────────────┐
   │    Patchright    │           │   CapMonster     │
   │  (navega YouTube)│           │  (resolve CAPTCHA)│
   │  via proxy       │           │  via MESMO proxy │
   │  189.45.67.89    │           │  189.45.67.89    │
   └──────────────────┘           └──────────────────┘
              │                               │
              │         Token gerado          │
              │         no IP 189.45.67.89    │
              │               ↓               │
              └───────────────┬───────────────┘
                              ▼
                    ┌──────────────────┐
                    │     YouTube      │
                    │   ✅ ACEITA!     │
                    │   (mesmo IP)     │
                    └──────────────────┘
```

---

## Por Que Usar DataImpulse no CAPTCHA Solver?

### O Problema (sem proxy próprio)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  PROBLEMA COM GOOGLE/YOUTUBE:                                                │
│                                                                              │
│   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │
│   │  Patchright  │      │  CapMonster  │      │   YouTube    │              │
│   │  IP: 45.1.2.3│      │  IP: 99.8.7.6│      │   verifica   │              │
│   └──────────────┘      └──────────────┘      └──────────────┘              │
│          │                     │                     │                       │
│          │   Token gerado      │                     │                       │
│          │   no IP 99.8.7.6    │                     │                       │
│          │         ↓           │                     │                       │
│          │   Mas browser usa   │                     │                       │
│          │   IP 45.1.2.3       │      ❌ REJEITA!   │                       │
│          └─────────────────────┴─────────────────────┘                       │
│                                                                              │
│   Google detecta que o IP que resolveu o CAPTCHA é diferente                │
│   do IP que está fazendo a requisição → Token inválido                      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### A Solução (com DataImpulse)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SOLUÇÃO: MESMO IP NOS DOIS LUGARES                                          │
│                                                                              │
│   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │
│   │  Patchright  │      │  CapMonster  │      │   YouTube    │              │
│   │  via DataImp │      │  via DataImp │      │   verifica   │              │
│   │  IP: 189.x.x │      │  IP: 189.x.x │      │              │              │
│   └──────────────┘      └──────────────┘      └──────────────┘              │
│          │                     │                     │                       │
│          │   Token gerado      │                     │                       │
│          │   no IP 189.x.x     │                     │                       │
│          │         ↓           │                     │                       │
│          │   Browser usa       │                     │                       │
│          │   IP 189.x.x        │      ✅ ACEITA!    │                       │
│          └─────────────────────┴─────────────────────┘                       │
│                                                                              │
│   Mesmo IP = Token válido                                                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Configuração DataImpulse

### Credenciais (a configurar no .env)

```bash
# .env do browser-agent
DATAIMPULSE_HOST=gw.dataimpulse.com
DATAIMPULSE_PORT=823
DATAIMPULSE_USER=SEU_USUARIO
DATAIMPULSE_PASS=SUA_SENHA
```

### Sticky Session (CRÍTICO!)

DataImpulse rotaciona IP a cada request por padrão. Para manter o mesmo IP:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FORMATO DO USERNAME COM STICKY SESSION                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Username normal:     meu_usuario                                          │
│                                                                             │
│   Username com sticky: meu_usuario__session-abc123__lifetime-30m            │
│                                     ↑              ↑                        │
│                               ID único       duração (30 min)               │
│                                                                             │
│   Opções de lifetime:                                                       │
│   • lifetime-10m  (10 minutos)                                              │
│   • lifetime-30m  (30 minutos) ← Recomendado                                │
│   • lifetime-60m  (1 hora)                                                  │
│                                                                             │
│   O session ID pode ser qualquer string única:                              │
│   • UUID: session-550e8400-e29b-41d4-a716-446655440000                      │
│   • Timestamp: session-1701705600                                           │
│   • Task ID: session-task_youtube_123                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Configuração CapMonster Cloud

### Criar Conta
1. Acesse: https://capmonster.cloud/
2. Registre-se
3. Adicione crédito (~$5-10 para começar)
4. Copie a API Key

### Adicionar ao .env

```bash
# .env do browser-agent
CAPMONSTER_API_KEY=sua_api_key_aqui
```

---

## API CapMonster - Referência

### Task SEM Proxy (NÃO usar para YouTube/Google)

```json
{
  "clientKey": "CAPMONSTER_API_KEY",
  "task": {
    "type": "RecaptchaV2TaskProxyless",
    "websiteURL": "https://example.com",
    "websiteKey": "6Le..."
  }
}
```

⚠️ **NÃO USE** `Proxyless` para Google/YouTube - o IP será diferente!

### Task COM Proxy DataImpulse (USAR ESTE)

```json
{
  "clientKey": "CAPMONSTER_API_KEY",
  "task": {
    "type": "RecaptchaV2Task",
    "websiteURL": "https://accounts.google.com/...",
    "websiteKey": "6LcA...",
    "proxyType": "http",
    "proxyAddress": "gw.dataimpulse.com",
    "proxyPort": 823,
    "proxyLogin": "usuario__session-abc123__lifetime-30m",
    "proxyPassword": "senha"
  }
}
```

✅ **USE ESTE** - mesmo IP no browser e no solver!

---

## Fluxo Completo de Implementação

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FLUXO COMPLETO NA PRÁTICA                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. GERAR SESSION ID ÚNICO                                                 │
│      └─► const sessionId = `session-${Date.now()}-${Math.random()}`;        │
│                                                                             │
│   2. CONFIGURAR PROXY COM STICKY SESSION                                    │
│      └─► const proxyUser = `${user}__${sessionId}__lifetime-30m`;           │
│                                                                             │
│   3. PATCHRIGHT INICIA COM PROXY                                            │
│      └─► browser.launch({                                                   │
│            proxy: {                                                         │
│              server: 'http://gw.dataimpulse.com:823',                       │
│              username: proxyUser,                                           │
│              password: proxyPass                                            │
│            }                                                                │
│          });                                                                │
│                                                                             │
│   4. NAVEGA, FAZ LOGIN, ETC                                                 │
│                                                                             │
│   5. DETECTA CAPTCHA                                                        │
│      └─► const captcha = await detectCaptcha(page);                         │
│      └─► if (captcha) { ... }                                               │
│                                                                             │
│   6. EXTRAI SITEKEY DO HTML                                                 │
│      └─► const siteKey = await page.$eval(                                  │
│            '.g-recaptcha',                                                  │
│            el => el.dataset.sitekey                                         │
│          );                                                                 │
│                                                                             │
│   7. CHAMA CAPMONSTER COM MESMO PROXY                                       │
│      ┌─────────────────────────────────────────────────────────────────┐    │
│      │  POST https://api.capmonster.cloud/createTask                   │    │
│      │  {                                                              │    │
│      │    "clientKey": "CAPMONSTER_KEY",                               │    │
│      │    "task": {                                                    │    │
│      │      "type": "RecaptchaV2Task",                                 │    │
│      │      "websiteURL": page.url(),                                  │    │
│      │      "websiteKey": siteKey,                                     │    │
│      │      "proxyType": "http",                                       │    │
│      │      "proxyAddress": "gw.dataimpulse.com",                      │    │
│      │      "proxyPort": 823,                                          │    │
│      │      "proxyLogin": proxyUser,   ← MESMO user com session!       │    │
│      │      "proxyPassword": proxyPass                                 │    │
│      │    }                                                            │    │
│      │  }                                                              │    │
│      └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│   8. POLLING ATÉ TER RESULTADO (~10-30s com proxy)                          │
│      └─► while (status !== 'ready') { poll(); sleep(3000); }                │
│                                                                             │
│   9. RECEBE TOKEN, INJETA NO BROWSER                                        │
│      └─► await page.evaluate(token => {                                     │
│            document.getElementById('g-recaptcha-response').value = token;   │
│            // Dispara callback                                              │
│            window.___grecaptcha_cfg?.clients?.[0]?.U?.U?.callback?.(token); │
│          }, token);                                                         │
│                                                                             │
│   10. SUBMETE FORM, CONTINUA AUTOMAÇÃO                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Código de Implementação

### Estrutura de Arquivos

```
browser-agent/src/
├── captcha/
│   ├── index.ts           # Exports
│   ├── detector.ts        # Detecta CAPTCHAs na página
│   ├── solver.ts          # Interface com CapMonster
│   ├── injector.ts        # Injeta token na página
│   └── proxy-session.ts   # Gerencia sticky sessions
└── ...
```

### proxy-session.ts

```typescript
/**
 * Gerencia sticky sessions do DataImpulse
 * Garante mesmo IP para browser e CAPTCHA solver
 */

interface ProxyConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

interface StickySession {
  sessionId: string;
  proxyUser: string;
  createdAt: number;
  expiresAt: number;
}

export class ProxySessionManager {
  private sessions: Map<string, StickySession> = new Map();

  private baseConfig: ProxyConfig = {
    host: process.env.DATAIMPULSE_HOST || 'gw.dataimpulse.com',
    port: parseInt(process.env.DATAIMPULSE_PORT || '823'),
    username: process.env.DATAIMPULSE_USER || '',
    password: process.env.DATAIMPULSE_PASS || ''
  };

  /**
   * Cria uma nova sticky session
   * @param taskId - ID único da tarefa (para identificar a sessão)
   * @param lifetimeMinutes - Duração da sessão em minutos (padrão: 30)
   */
  createSession(taskId: string, lifetimeMinutes: number = 30): StickySession {
    const sessionId = `session-${taskId}-${Date.now()}`;
    const proxyUser = `${this.baseConfig.username}__${sessionId}__lifetime-${lifetimeMinutes}m`;

    const session: StickySession = {
      sessionId,
      proxyUser,
      createdAt: Date.now(),
      expiresAt: Date.now() + (lifetimeMinutes * 60 * 1000)
    };

    this.sessions.set(taskId, session);
    console.log(`[PROXY] Created sticky session: ${sessionId}`);

    return session;
  }

  /**
   * Obtém a sessão ativa para uma tarefa
   */
  getSession(taskId: string): StickySession | null {
    const session = this.sessions.get(taskId);

    if (!session) return null;

    // Verifica se expirou
    if (Date.now() > session.expiresAt) {
      console.log(`[PROXY] Session expired: ${session.sessionId}`);
      this.sessions.delete(taskId);
      return null;
    }

    return session;
  }

  /**
   * Retorna configuração do proxy para Playwright/Patchright
   */
  getPlaywrightProxy(taskId: string): { server: string; username: string; password: string } {
    let session = this.getSession(taskId);

    if (!session) {
      session = this.createSession(taskId);
    }

    return {
      server: `http://${this.baseConfig.host}:${this.baseConfig.port}`,
      username: session.proxyUser,
      password: this.baseConfig.password
    };
  }

  /**
   * Retorna configuração do proxy para CapMonster API
   */
  getCapMonsterProxy(taskId: string): {
    proxyType: string;
    proxyAddress: string;
    proxyPort: number;
    proxyLogin: string;
    proxyPassword: string;
  } {
    let session = this.getSession(taskId);

    if (!session) {
      session = this.createSession(taskId);
    }

    return {
      proxyType: 'http',
      proxyAddress: this.baseConfig.host,
      proxyPort: this.baseConfig.port,
      proxyLogin: session.proxyUser,
      proxyPassword: this.baseConfig.password
    };
  }

  /**
   * Remove sessão quando tarefa termina
   */
  destroySession(taskId: string): void {
    const session = this.sessions.get(taskId);
    if (session) {
      console.log(`[PROXY] Destroyed session: ${session.sessionId}`);
      this.sessions.delete(taskId);
    }
  }
}

// Singleton
export const proxySessionManager = new ProxySessionManager();
```

### solver.ts (com proxy)

```typescript
/**
 * Resolve CAPTCHAs via CapMonster Cloud
 * Usa proxy DataImpulse para garantir mesmo IP
 */

import { proxySessionManager } from './proxy-session';

interface CaptchaInfo {
  type: 'recaptcha_v2' | 'recaptcha_v3' | 'hcaptcha' | 'turnstile';
  siteKey: string;
  pageUrl: string;
}

interface SolveResult {
  success: boolean;
  token?: string;
  error?: string;
  timeMs: number;
}

const CAPMONSTER_API = 'https://api.capmonster.cloud';

export async function solveCaptchaWithProxy(
  info: CaptchaInfo,
  taskId: string
): Promise<SolveResult> {
  const startTime = Date.now();
  const apiKey = process.env.CAPMONSTER_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'CAPMONSTER_API_KEY not configured',
      timeMs: Date.now() - startTime
    };
  }

  try {
    // 1. Obtém proxy com sticky session (MESMO IP do browser)
    const proxyConfig = proxySessionManager.getCapMonsterProxy(taskId);

    console.log(`[CAPTCHA] Solving ${info.type} with proxy session...`);

    // 2. Mapeia tipo de CAPTCHA para tipo CapMonster
    const taskType = {
      'recaptcha_v2': 'RecaptchaV2Task',      // COM proxy
      'recaptcha_v3': 'RecaptchaV3Task',      // COM proxy
      'hcaptcha': 'HCaptchaTask',             // COM proxy
      'turnstile': 'TurnstileTask'            // COM proxy
    }[info.type];

    // 3. Cria task no CapMonster
    const createResponse = await fetch(`${CAPMONSTER_API}/createTask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientKey: apiKey,
        task: {
          type: taskType,
          websiteURL: info.pageUrl,
          websiteKey: info.siteKey,
          // Proxy DataImpulse (mesmo IP do browser!)
          ...proxyConfig
        }
      })
    });

    const createData = await createResponse.json();

    if (createData.errorId !== 0) {
      return {
        success: false,
        error: `CapMonster error: ${createData.errorDescription}`,
        timeMs: Date.now() - startTime
      };
    }

    const taskIdCapmonster = createData.taskId;
    console.log(`[CAPTCHA] Task created: ${taskIdCapmonster}`);

    // 4. Poll até resolver (com proxy pode demorar mais: 10-30s)
    const maxAttempts = 60; // 60 * 3s = 3 minutos máximo
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await sleep(3000); // 3 segundos entre polls

      const resultResponse = await fetch(`${CAPMONSTER_API}/getTaskResult`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientKey: apiKey,
          taskId: taskIdCapmonster
        })
      });

      const resultData = await resultResponse.json();

      if (resultData.status === 'ready') {
        const token = resultData.solution.gRecaptchaResponse ||
                      resultData.solution.token;

        console.log(`[CAPTCHA] Solved in ${attempt * 3}s`);

        return {
          success: true,
          token,
          timeMs: Date.now() - startTime
        };
      }

      if (resultData.errorId !== 0) {
        return {
          success: false,
          error: `CapMonster error: ${resultData.errorDescription}`,
          timeMs: Date.now() - startTime
        };
      }

      // Ainda processando...
      if (attempt % 5 === 0) {
        console.log(`[CAPTCHA] Still solving... (${attempt * 3}s)`);
      }
    }

    return {
      success: false,
      error: 'Timeout waiting for CAPTCHA solution',
      timeMs: Date.now() - startTime
    };

  } catch (error: any) {
    return {
      success: false,
      error: `Exception: ${error.message}`,
      timeMs: Date.now() - startTime
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### detector.ts

```typescript
/**
 * Detecta CAPTCHAs na página
 */

import { Page } from 'playwright';

export interface DetectedCaptcha {
  type: 'recaptcha_v2' | 'recaptcha_v3' | 'hcaptcha' | 'turnstile';
  siteKey: string;
  visible: boolean;
}

export async function detectCaptcha(page: Page): Promise<DetectedCaptcha | null> {
  try {
    // reCAPTCHA v2 (checkbox)
    const recaptchaV2 = await page.$('iframe[src*="recaptcha/api2"]');
    if (recaptchaV2) {
      const siteKey = await page.$eval(
        '.g-recaptcha, [data-sitekey]',
        el => (el as HTMLElement).dataset.sitekey || ''
      ).catch(() => '');

      if (siteKey) {
        console.log('[DETECTOR] Found reCAPTCHA v2');
        return { type: 'recaptcha_v2', siteKey, visible: true };
      }
    }

    // reCAPTCHA v3 (invisible)
    const recaptchaV3Script = await page.$('script[src*="recaptcha"][src*="render="]');
    if (recaptchaV3Script) {
      const src = await recaptchaV3Script.getAttribute('src');
      const match = src?.match(/render=([^&]+)/);
      if (match) {
        console.log('[DETECTOR] Found reCAPTCHA v3');
        return { type: 'recaptcha_v3', siteKey: match[1], visible: false };
      }
    }

    // hCaptcha
    const hcaptcha = await page.$('iframe[src*="hcaptcha"]');
    if (hcaptcha) {
      const siteKey = await page.$eval(
        '.h-captcha, [data-sitekey]',
        el => (el as HTMLElement).dataset.sitekey || ''
      ).catch(() => '');

      if (siteKey) {
        console.log('[DETECTOR] Found hCaptcha');
        return { type: 'hcaptcha', siteKey, visible: true };
      }
    }

    // Cloudflare Turnstile
    const turnstile = await page.$('iframe[src*="challenges.cloudflare.com"]');
    if (turnstile) {
      const siteKey = await page.$eval(
        '.cf-turnstile, [data-sitekey]',
        el => (el as HTMLElement).dataset.sitekey || ''
      ).catch(() => '');

      if (siteKey) {
        console.log('[DETECTOR] Found Cloudflare Turnstile');
        return { type: 'turnstile', siteKey, visible: true };
      }
    }

    return null; // Nenhum CAPTCHA detectado

  } catch (error) {
    console.log('[DETECTOR] Error detecting CAPTCHA:', error);
    return null;
  }
}
```

### injector.ts

```typescript
/**
 * Injeta token do CAPTCHA resolvido na página
 */

import { Page } from 'playwright';

export async function injectCaptchaToken(
  page: Page,
  token: string,
  type: 'recaptcha_v2' | 'recaptcha_v3' | 'hcaptcha' | 'turnstile'
): Promise<boolean> {
  try {
    const success = await page.evaluate(({ token, type }) => {
      // reCAPTCHA v2/v3
      if (type.startsWith('recaptcha')) {
        // Preenche campo hidden
        const responseFields = document.querySelectorAll('[id*="g-recaptcha-response"]');
        responseFields.forEach(field => {
          (field as HTMLTextAreaElement).value = token;
        });

        // Tenta disparar callback
        try {
          // Método 1: Callback global
          if ((window as any).___grecaptcha_cfg?.clients) {
            const clients = (window as any).___grecaptcha_cfg.clients;
            for (const client of Object.values(clients)) {
              const callback = (client as any)?.U?.U?.callback ||
                              (client as any)?.O?.O?.callback;
              if (typeof callback === 'function') {
                callback(token);
                return true;
              }
            }
          }

          // Método 2: grecaptcha.execute callback
          if ((window as any).grecaptcha?.execute) {
            // Para v3, o callback pode estar em outro lugar
            const forms = document.querySelectorAll('form');
            forms.forEach(form => form.submit());
          }
        } catch (e) {
          console.log('Callback error:', e);
        }

        return true;
      }

      // hCaptcha
      if (type === 'hcaptcha') {
        const responseField = document.querySelector('[name="h-captcha-response"]');
        if (responseField) {
          (responseField as HTMLTextAreaElement).value = token;
        }

        // Callback hCaptcha
        if ((window as any).hcaptcha) {
          try {
            // Dispara evento de verificação
            const event = new CustomEvent('hcaptcha-verified', { detail: token });
            document.dispatchEvent(event);
          } catch (e) {}
        }

        return true;
      }

      // Cloudflare Turnstile
      if (type === 'turnstile') {
        const responseField = document.querySelector('[name="cf-turnstile-response"]');
        if (responseField) {
          (responseField as HTMLTextAreaElement).value = token;
        }
        return true;
      }

      return false;
    }, { token, type });

    if (success) {
      console.log(`[INJECTOR] Token injected for ${type}`);
      // Aguarda um pouco para o site processar
      await page.waitForTimeout(1000);
    }

    return success;

  } catch (error) {
    console.log('[INJECTOR] Error injecting token:', error);
    return false;
  }
}
```

### index.ts (exports)

```typescript
/**
 * CAPTCHA Solver Module
 * Integra detecção, resolução e injeção
 */

export { detectCaptcha, DetectedCaptcha } from './detector';
export { solveCaptchaWithProxy } from './solver';
export { injectCaptchaToken } from './injector';
export { proxySessionManager, ProxySessionManager } from './proxy-session';

import { Page } from 'playwright';
import { detectCaptcha } from './detector';
import { solveCaptchaWithProxy } from './solver';
import { injectCaptchaToken } from './injector';

/**
 * Função de alto nível: detecta, resolve e injeta CAPTCHA
 *
 * @param page - Página do Playwright
 * @param taskId - ID da tarefa (para sticky session)
 * @returns true se resolveu CAPTCHA, false se não tinha ou falhou
 */
export async function handleCaptchaIfPresent(
  page: Page,
  taskId: string
): Promise<{ handled: boolean; error?: string }> {
  // 1. Detecta
  const captcha = await detectCaptcha(page);

  if (!captcha) {
    return { handled: false }; // Sem CAPTCHA
  }

  console.log(`[CAPTCHA] Detected ${captcha.type}, solving...`);

  // 2. Resolve
  const result = await solveCaptchaWithProxy({
    type: captcha.type,
    siteKey: captcha.siteKey,
    pageUrl: page.url()
  }, taskId);

  if (!result.success || !result.token) {
    return { handled: false, error: result.error };
  }

  // 3. Injeta
  const injected = await injectCaptchaToken(page, result.token, captcha.type);

  if (!injected) {
    return { handled: false, error: 'Failed to inject token' };
  }

  console.log(`[CAPTCHA] Successfully solved in ${result.timeMs}ms`);
  return { handled: true };
}
```

---

## Integração no Browser Agent

### Onde integrar (agent.ts)

```typescript
// No método que executa ações...

import { handleCaptchaIfPresent, proxySessionManager } from './captcha';

class BrowserAgent {
  private taskId: string;

  async runTask(task: string): Promise<TaskResult> {
    // Gera ID único para esta tarefa
    this.taskId = `task_${Date.now()}`;

    try {
      // Configura browser com proxy sticky session
      const proxyConfig = proxySessionManager.getPlaywrightProxy(this.taskId);

      // ... inicializa browser com proxy ...

      // Durante execução, se ação falhar...
      const result = await this.executeAction(action);

      if (!result.success) {
        // Verifica se é CAPTCHA
        const captchaResult = await handleCaptchaIfPresent(this.page, this.taskId);

        if (captchaResult.handled) {
          // Retenta ação após resolver CAPTCHA
          return await this.executeAction(action);
        }
      }

      return result;

    } finally {
      // Limpa sessão do proxy
      proxySessionManager.destroySession(this.taskId);
    }
  }
}
```

---

## Custos Estimados

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CUSTO TOTAL ESTIMADO (Liftlio)                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   DataImpulse (você já tem)                                                 │
│   └─► ~$50-100/mês (dependendo do uso de bandwidth)                         │
│                                                                             │
│   CapMonster Cloud                                                          │
│   └─► RecaptchaV2Task (com proxy): ~$1.20/1000 CAPTCHAs                     │
│   └─► RecaptchaV2TaskProxyless: ~$0.60/1000 (mas não funciona p/ Google!)   │
│                                                                             │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│   CENÁRIOS:                                                                 │
│                                                                             │
│   100 CAPTCHAs/mês (uso leve):                                              │
│   └─► 100 × $0.0012 = $0.12/mês                                             │
│                                                                             │
│   1.000 CAPTCHAs/mês (uso moderado):                                        │
│   └─► 1.000 × $0.0012 = $1.20/mês                                           │
│                                                                             │
│   10.000 CAPTCHAs/mês (uso intenso):                                        │
│   └─► 10.000 × $0.0012 = $12.00/mês                                         │
│                                                                             │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│   💡 NOTA: Com conta logada e cookies salvos, CAPTCHAs são RAROS            │
│      Estimativa: ~5-10% das ações pedem CAPTCHA                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Checklist de Implementação

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CHECKLIST COMPLETO                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   PREPARAÇÃO                                                                │
│   ──────────                                                                │
│   [ ] Criar conta no CapMonster Cloud (https://capmonster.cloud/)           │
│   [ ] Adicionar crédito (~$5-10 para começar)                               │
│   [ ] Copiar API Key                                                        │
│   [ ] Verificar credenciais DataImpulse existentes                          │
│                                                                             │
│   CONFIGURAÇÃO (.env)                                                       │
│   ────────────────────                                                      │
│   [ ] Adicionar CAPMONSTER_API_KEY=xxx                                      │
│   [ ] Verificar DATAIMPULSE_HOST=gw.dataimpulse.com                         │
│   [ ] Verificar DATAIMPULSE_PORT=823                                        │
│   [ ] Verificar DATAIMPULSE_USER=seu_usuario                                │
│   [ ] Verificar DATAIMPULSE_PASS=sua_senha                                  │
│                                                                             │
│   DESENVOLVIMENTO                                                           │
│   ──────────────                                                            │
│   [ ] Criar pasta src/captcha/                                              │
│   [ ] Implementar proxy-session.ts                                          │
│   [ ] Implementar detector.ts                                               │
│   [ ] Implementar solver.ts                                                 │
│   [ ] Implementar injector.ts                                               │
│   [ ] Criar index.ts (exports)                                              │
│   [ ] Integrar no agent.ts                                                  │
│   [ ] Integrar no browser-manager.ts (proxy config)                         │
│                                                                             │
│   TESTES                                                                    │
│   ──────                                                                    │
│   [ ] Testar sticky session do proxy                                        │
│   [ ] Testar detecção de reCAPTCHA v2                                       │
│   [ ] Testar resolução via CapMonster API                                   │
│   [ ] Testar injeção de token                                               │
│   [ ] Testar fluxo completo (detecta → resolve → injeta → continua)         │
│                                                                             │
│   DEPLOY                                                                    │
│   ──────                                                                    │
│   [ ] Adicionar env vars no docker-compose.yml                              │
│   [ ] Rebuild container                                                     │
│   [ ] Testar em produção com tarefa real                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### CAPTCHA resolvido mas não funciona

```
PROBLEMA: Token válido mas Google rejeita
CAUSA: IP diferente entre browser e solver
SOLUÇÃO: Verificar se sticky session está funcionando
         - Logs devem mostrar mesmo session ID
         - IP deve ser o mesmo (testar com whatismyip.com)
```

### Timeout na resolução

```
PROBLEMA: CapMonster demora muito (>60s)
CAUSA: Proxy lento ou instável
SOLUÇÃO:
  - Verificar status do DataImpulse
  - Testar outro region/gateway
  - Aumentar timeout no código
```

### Session expira no meio da tarefa

```
PROBLEMA: IP muda durante execução
CAUSA: lifetime muito curto
SOLUÇÃO: Aumentar lifetime para 60m em tarefas longas
         proxySessionManager.createSession(taskId, 60)
```

---

## Links Úteis

- **CapMonster Cloud**: https://capmonster.cloud/
- **CapMonster Docs**: https://docs.capmonster.cloud/
- **DataImpulse Docs**: https://dataimpulse.com/documentation/
- **Pricing CapMonster**: https://capmonster.cloud/pricing
