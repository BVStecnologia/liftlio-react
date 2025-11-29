# Plano: Otimizacao Browser Agent - Sessao, Mouse, Tokens

## ✅ PROGRESSO DE IMPLEMENTAÇÃO

| Etapa | Descrição | Status |
|-------|-----------|--------|
| 1 | Supabase - ADD COLUMN browser_session_data | ✅ COMPLETO |
| 2 | humanization.ts - Mouse coordinates 30 tasks | ✅ COMPLETO |
| 3 | browser-manager.ts - saveSession/restoreSession | ✅ COMPLETO |
| 4 | browser-manager.ts - getAccessibilitySnapshot | ✅ COMPLETO |
| 5 | agent.ts - Integrar Accessibility | ✅ COMPLETO |
| 6 | agent.ts - Click por Ref | ✅ COMPLETO |
| 7 | agent.ts - History Truncation | ✅ COMPLETO |

**Data de Conclusão:** 2025-01-29

---

## Objetivo
Implementar 3 melhorias no Browser Agent:
1. Persistencia de sessao na tabela Projeto
2. Coordenadas de mouse das ultimas 30 tasks
3. Reducao de consumo de tokens (usar Accessibility Tree)

---

## PARTE 1: Sessao de Login no Projeto

### Mudanca no Banco (Supabase)

```sql
ALTER TABLE public."Projeto"
ADD COLUMN browser_session_data jsonb null;

COMMENT ON COLUMN public."Projeto".browser_session_data IS
'Cookies e localStorage do navegador para manter sessoes de login';
```

### Estrutura do JSONB

```json
{
  "cookies": [
    {"name": "session_id", "value": "...", "domain": ".youtube.com", "path": "/", "expires": 1234567890}
  ],
  "localStorage": {
    "key1": "value1"
  },
  "lastUrl": "https://www.youtube.com",
  "savedAt": "2025-01-28T10:00:00Z"
}
```

### Mudancas em browser-manager.ts

**Adicionar metodo saveSession():**
```typescript
async saveSession(projectId: number): Promise<void> {
  const cookies = await this.context?.cookies() || [];
  const localStorage = await this.page?.evaluate(() =>
    JSON.stringify(localStorage)
  );

  // Salvar no Supabase via fetch
  await fetch(`${SUPABASE_URL}/rest/v1/Projeto?id=eq.${projectId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      browser_session_data: {
        cookies,
        localStorage: JSON.parse(localStorage || '{}'),
        lastUrl: this.page?.url(),
        savedAt: new Date().toISOString()
      }
    })
  });
}
```

**Adicionar metodo restoreSession():**
```typescript
async restoreSession(projectId: number): Promise<boolean> {
  // Buscar do Supabase
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/Projeto?id=eq.${projectId}&select=browser_session_data`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );

  const [projeto] = await response.json();
  if (!projeto?.browser_session_data?.cookies) return false;

  const session = projeto.browser_session_data;

  // Restaurar cookies
  await this.context?.addCookies(session.cookies);

  // Restaurar localStorage
  if (session.localStorage) {
    await this.page?.evaluate((ls) => {
      Object.entries(ls).forEach(([k, v]) => localStorage.setItem(k, v as string));
    }, session.localStorage);
  }

  return true;
}
```

### Onde Chamar

- `restoreSession()`: Em `initialize()` apos criar o browser
- `saveSession()`: Em `close()` antes de fechar o browser

---

## PARTE 2: Coordenadas de Mouse (Ultimas 30 Tasks)

### Mudanca em humanization.ts

**Expandir BehaviorProfile:**
```typescript
export interface BehaviorProfile {
  mouse: MousePattern;
  typing: TypingPattern;
  scroll: ScrollPattern;
  delay: DelayPattern;
  click_offset: { x: number; y: number };
  typing_speed_ms: number;
  // NOVOS CAMPOS:
  start_position: { x: number; y: number };
  click_positions: Array<{ x: number; y: number }>;
}
```

**Modificar getRecentBehaviors para pegar 30:**
```typescript
export async function getRecentBehaviors(projectId: number, limit: number = 30): Promise<BehaviorProfile[]> {
  // ... mesmo codigo, mas limit = 30
}
```

**Modificar generateBehaviorProfile:**
```typescript
export function generateBehaviorProfile(recentBehaviors: BehaviorProfile[]): BehaviorProfile {
  // ... codigo existente ...

  // NOVO: Gerar posicao inicial diferente das ultimas 30
  const recentStartPositions = recentBehaviors
    .map(b => b.start_position)
    .filter(Boolean);

  let start_position: Point;
  let attempts = 0;
  do {
    start_position = {
      x: randomBetween(50, 300),
      y: randomBetween(50, 300)
    };
    attempts++;
  } while (
    recentStartPositions.some(p =>
      p && Math.abs(p.x - start_position.x) < 30 && Math.abs(p.y - start_position.y) < 30
    ) && attempts < 20
  );

  return {
    mouse,
    typing,
    scroll,
    delay,
    click_offset,
    typing_speed_ms,
    start_position,
    click_positions: [] // Sera preenchido durante a task
  };
}
```

**Modificar humanMouseMove para usar start_position:**
```typescript
export async function humanMouseMove(
  page: Page,
  targetX: number,
  targetY: number,
  pattern: MousePattern,
  offset: { x: number; y: number },
  currentPos?: { x: number; y: number }  // NOVO parametro
): Promise<{ x: number; y: number }> {
  const startPos = currentPos || { x: 100, y: 100 };
  // ... resto do codigo usando startPos ...

  // Retornar posicao final para tracking
  return { x: finalX, y: finalY };
}
```

### Custo de Tokens

```
30 coordenadas x 2 (start + clicks) x ~15 chars = ~900 chars
900 / 4 = ~225 tokens = $0.00018 (INSIGNIFICANTE)
```

---

## PARTE 3: Reducao de Tokens (Accessibility Tree)

### PROBLEMA ATUAL

O agente usa `browser_get_content` que retorna 6000 chars de texto desestruturado:
- ~1500 tokens por chamada
- Sem informacao de layout/posicao
- Ineficiente para navegacao

### SOLUCAO: Accessibility Snapshot

**Novo metodo em browser-manager.ts:**
```typescript
interface AccessibilityNode {
  tag: string;
  role?: string;
  text?: string;
  ref: string;  // Seletor unico para clicar
  rect?: { x: number; y: number; w: number; h: number };
  children?: AccessibilityNode[];
}

async getAccessibilitySnapshot(): Promise<AccessibilityNode> {
  return await this.page!.evaluate(() => {
    let refCounter = 0;

    function isVisible(el: Element): boolean {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 &&
             style.display !== 'none' &&
             style.visibility !== 'hidden';
    }

    function buildTree(el: Element, depth: number = 0): AccessibilityNode | null {
      if (depth > 5 || !isVisible(el)) return null;

      const tag = el.tagName.toLowerCase();
      const isInteractive = /^(a|button|input|select|textarea)$/i.test(tag);

      // Gerar ref unico
      const ref = `e${refCounter++}`;
      (el as any).__ref = ref;

      const rect = el.getBoundingClientRect();
      const node: AccessibilityNode = {
        tag,
        ref,
        role: el.getAttribute('role') || undefined,
        text: isInteractive ? (el.textContent || '').slice(0, 50).trim() : undefined,
        rect: isInteractive ? {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          w: Math.round(rect.width),
          h: Math.round(rect.height)
        } : undefined
      };

      // Processar filhos (max 10 por nivel)
      const children = Array.from(el.children)
        .map(c => buildTree(c, depth + 1))
        .filter(Boolean)
        .slice(0, 10) as AccessibilityNode[];

      if (children.length > 0) {
        node.children = children;
      }

      return node;
    }

    return buildTree(document.body) || { tag: 'body', ref: 'e0' };
  });
}
```

**Modificar browser_get_content em agent.ts:**
```typescript
case 'browser_get_content': {
  // NOVO: Usar accessibility snapshot (mais leve)
  const tree = await this.browserManager.getAccessibilitySnapshot();
  const url = this.browserManager.getCurrentUrl();
  const title = await this.browserManager.getPage()?.title();

  // Formato compacto
  function formatTree(node: AccessibilityNode, indent: string = ''): string {
    let result = '';
    if (node.text || node.tag === 'a' || node.tag === 'button' || node.tag === 'input') {
      result = `${indent}[${node.ref}] ${node.tag}`;
      if (node.text) result += `: "${node.text}"`;
      if (node.rect) result += ` @(${node.rect.x},${node.rect.y})`;
      result += '\n';
    }
    if (node.children) {
      for (const child of node.children) {
        result += formatTree(child, indent + '  ');
      }
    }
    return result;
  }

  const content = formatTree(tree).slice(0, 3000);  // 3000 vs 6000 antes
  return `URL: ${url}\nTitle: ${title}\n\nElements:\n${content}`;
}
```

**Modificar browser_click para usar ref:**
```typescript
case 'browser_click': {
  const page = this.browserManager.getPage();
  if (!page) throw new Error('Browser not initialized');

  const target = input.target;

  // NOVO: Suporte a ref (e.g., "e42")
  if (target.startsWith('e') && /^e\d+$/.test(target)) {
    // Clicar por ref
    await page.evaluate((ref) => {
      const el = Array.from(document.querySelectorAll('*'))
        .find(e => (e as any).__ref === ref) as HTMLElement;
      if (el) el.click();
    }, target);
    await page.waitForLoadState('domcontentloaded');
    return `Clicked element [${target}]`;
  }

  // Fallback para texto/selector
  // ... codigo existente ...
}
```

### ECONOMIA DE TOKENS

```
ANTES:
- browser_get_content: ~1500 tokens (6000 chars)
- Sem estrutura, dificil navegar

DEPOIS:
- getAccessibilitySnapshot: ~750 tokens (3000 chars)
- Com refs para clicar diretamente
- ~50% reducao de tokens
```

---

## PARTE 4: Message History Truncation (BONUS)

### Problema

Apos 30 iteracoes, o historico tem ~30 mensagens = ~15000 tokens extras.

### Solucao

**Em agent.ts, antes de chamar Claude:**
```typescript
// Truncar historico se muito grande
private truncateHistory(messages: Message[]): Message[] {
  if (messages.length <= 10) return messages;

  // Manter primeira (task) + ultimas 8
  const first = messages[0];
  const recent = messages.slice(-8);

  // Resumir iteracoes antigas
  const summary: Message = {
    role: 'user',
    content: `[Summary of ${messages.length - 9} previous iterations: navigation and interactions completed]`
  };

  return [first, summary, ...recent];
}

// Usar no loop:
const optimizedMessages = this.truncateHistory(messages);
const response = await this.client.messages.create({
  // ...
  messages: optimizedMessages as any
});
```

---

## Arquivos a Modificar

| Arquivo | Mudancas |
|---------|----------|
| `Supabase` | ADD COLUMN browser_session_data jsonb |
| `browser-manager.ts` | +saveSession(), +restoreSession(), +getAccessibilitySnapshot() |
| `humanization.ts` | +start_position, +click_positions, limit=30 |
| `agent.ts` | Modificar browser_get_content, browser_click, +truncateHistory() |

---

## Ordem de Implementacao

1. **Supabase Migration** - Adicionar campo browser_session_data (1 min)
2. **humanization.ts** - Mouse coordinates 30 tasks (15 min)
3. **browser-manager.ts** - saveSession/restoreSession (20 min)
4. **browser-manager.ts** - getAccessibilitySnapshot (30 min)
5. **agent.ts** - Modificar tools + truncateHistory (30 min)
6. **Testes** - Verificar economia de tokens (15 min)

**Tempo Total Estimado: ~2 horas**

---

## Economia Esperada

| Metrica | Antes | Depois | Reducao |
|---------|-------|--------|---------|
| Tokens/browser_get_content | 1500 | 750 | 50% |
| Tokens/historico (30 iter) | 15000 | 3000 | 80% |
| Custo/task complexa | ~$0.15 | ~$0.04 | 73% |

---

## Riscos

| Risco | Mitigacao |
|-------|-----------|
| Accessibility tree incompleta | Fallback para texto se tree vazia |
| Sessao expirada | Verificar validade antes de restaurar |
| Ref invalido | Fallback para busca por texto |

---

---

## O QUE VAMOS ALCANCAR

### PARTE 1 - Sessao Persistente
| Beneficio | Impacto |
|-----------|---------|
| Login permanente no YouTube | Nao precisa logar toda vez |
| Sessoes sobrevivem restart | Container pode reiniciar sem perder login |
| Menos CAPTCHAs | YouTube reconhece sessao confiavel |
| Tarefas mais rapidas | Pula etapa de login |

### PARTE 2 - Mouse Coordinates Anti-Deteccao
| Beneficio | Impacto |
|-----------|---------|
| Posicoes nunca repetem | Evita fingerprint de mouse |
| Historico de 30 tasks | Variacao estatistica alta |
| Custo zero | ~225 tokens = $0.00018 |
| Comportamento mais humano | Cada sessao e unica |

### PARTE 3 - Accessibility Tree
| Beneficio | Impacto |
|-----------|---------|
| 50% menos tokens | De 1500 para 750 por snapshot |
| Estrutura hierarquica | Claude entende melhor a pagina |
| Refs para clique direto | Menos tentativas de encontrar elemento |
| Coordenadas incluidas | Pode clicar por posicao se necessario |

### PARTE 4 - History Truncation
| Beneficio | Impacto |
|-----------|---------|
| 80% menos tokens em tasks longas | De 15000 para 3000 |
| Tasks podem rodar mais iteracoes | Sem estourar contexto |
| Custo reduzido drasticamente | ~$0.04 vs ~$0.15 por task |

### ECONOMIA TOTAL ESPERADA
```
Task simples (10 iteracoes):  $0.03 -> $0.01 (66% economia)
Task media (30 iteracoes):    $0.15 -> $0.04 (73% economia)
Task longa (100 iteracoes):   $0.50 -> $0.10 (80% economia)
```

---

## CHECKLIST DE IMPLEMENTACAO POR ETAPA

### ETAPA 1: Supabase Migration (ISOLADA - SEM RISCO) ✅ COMPLETA
- [x] 1.1 Executar ALTER TABLE no Supabase (migration: add_browser_session_data_to_projeto)
- [x] 1.2 Verificar coluna criada: browser_session_data jsonb nullable
- [x] 1.3 Testar INSERT/SELECT manual: OK

**Teste**: Query no Supabase Dashboard
```sql
UPDATE "Projeto" SET browser_session_data = '{"test": true}' WHERE id = 117;
SELECT browser_session_data FROM "Projeto" WHERE id = 117;
```

**Rollback**: `ALTER TABLE "Projeto" DROP COLUMN browser_session_data;`

---

### ETAPA 2: humanization.ts - Mouse Coordinates (ISOLADA) ✅ COMPLETA
- [x] 2.1 Expandir interface BehaviorProfile
- [x] 2.2 Modificar getRecentBehaviors (limit=30)
- [x] 2.3 Modificar generateBehaviorProfile (start_position)
- [x] 2.4 Modificar humanMouseMove (retornar posicao)

**Teste**: Rodar 3 tasks e verificar logs
```
🎭 Anti-detection: Using behavior profile different from last 30 tasks
   Start position: (142, 87) - different from recent
```

**Rollback**: Git revert do arquivo

---

### ETAPA 3: browser-manager.ts - Session (ISOLADA) ✅ COMPLETA
- [x] 3.1 Adicionar saveSession()
- [x] 3.2 Adicionar restoreSession()
- [x] 3.3 Chamar em initialize() e close()

**Teste**:
1. Iniciar browser, fazer login manual no YouTube
2. Chamar close() (deve salvar sessao)
3. Verificar no Supabase que browser_session_data tem cookies
4. Iniciar browser novamente
5. Verificar que YouTube ainda esta logado

**Rollback**: Remover chamadas de save/restore

---

### ETAPA 4: browser-manager.ts - Accessibility Tree (ISOLADA) ✅ COMPLETA
- [x] 4.1 Criar interface AccessibilityNode
- [x] 4.2 Implementar getAccessibilitySnapshot()
- [x] 4.3 NAO MODIFICAR agent.ts ainda (apenas adicionar metodo)

**Teste**: Endpoint manual para testar
```bash
curl http://localhost:10100/mcp/snapshot-test
# Deve retornar tree estruturada
```

**Rollback**: Remover metodo (nao afeta nada)

---

### ETAPA 5: agent.ts - Integrar Accessibility (CUIDADO) ✅ COMPLETA
- [x] 5.1 Modificar browser_get_content para usar novo metodo
- [x] 5.2 MANTER codigo antigo comentado como fallback
- [x] 5.3 Adicionar log de tokens usados

**Teste**: Task simples "navegue ate google.com"
- Verificar output tem formato [e0] tag: "text"
- Verificar tokens no log

**Rollback**: Descomentar codigo antigo

---

### ETAPA 6: agent.ts - Click por Ref (CUIDADO) ✅ COMPLETA
- [x] 6.1 Adicionar suporte a ref em browser_click
- [x] 6.2 Manter fallback para texto/selector

**Teste**: Task "clique no botao de pesquisa"
- Verificar que usa ref se disponivel
- Verificar fallback funciona se ref falhar

**Rollback**: Remover if de ref

---

### ETAPA 7: agent.ts - History Truncation (CUIDADO) ✅ COMPLETA
- [x] 7.1 Adicionar metodo truncateHistory()
- [x] 7.2 Usar no loop principal
- [x] 7.3 Adicionar log de mensagens truncadas

**Teste**: Task longa (30+ iteracoes)
- Verificar log: "Truncated history from 25 to 10 messages"
- Verificar task ainda completa com sucesso

**Rollback**: Remover chamada truncateHistory

---

## ESTRATEGIA DE MITIGACAO DE RISCOS

### Principio: Uma funcao por vez

```
Etapa 1 (Supabase) ─────────────> TESTAR ─> OK? ─> Etapa 2
                                            │
                                            └─> FALHOU? ─> ROLLBACK

Etapa 2 (Mouse) ────────────────> TESTAR ─> OK? ─> Etapa 3
                                            │
                                            └─> FALHOU? ─> ROLLBACK

... e assim por diante
```

### Regras de Seguranca

1. **NUNCA modificar 2 arquivos ao mesmo tempo**
2. **SEMPRE testar antes de ir para proxima etapa**
3. **SEMPRE manter codigo antigo comentado**
4. **SEMPRE ter rollback pronto**
5. **Etapas 1-4 sao ISOLADAS** (podem falhar sem afetar sistema)
6. **Etapas 5-7 modificam agent.ts** (mais cuidado)

### Ordem de Risco

```
BAIXO RISCO (fazer primeiro):
├── Etapa 1: Supabase (isolado, nao afeta nada)
├── Etapa 2: humanization.ts (isolado)
├── Etapa 3: browser-manager.ts session (isolado)
└── Etapa 4: browser-manager.ts accessibility (isolado)

MEDIO RISCO (fazer depois):
├── Etapa 5: agent.ts accessibility (manter fallback)
├── Etapa 6: agent.ts click ref (manter fallback)
└── Etapa 7: agent.ts truncation (manter fallback)
```

### Se Algo Der Errado

| Problema | Solucao Imediata |
|----------|------------------|
| Sessao nao restaura | Ignorar e continuar sem sessao |
| Accessibility vazia | Usar getSnapshot() antigo |
| Click por ref falha | Usar texto/selector |
| Truncation quebra | Enviar historico completo |
| Task falha apos mudanca | Git revert arquivo modificado |

---

## VALIDACAO FINAL

Apos todas as etapas:

1. [x] Rodar task simples, verificar tokens no console ✅ (29/01/2025 - "Navegue até Google" completou em 3 iterações/3 ações)
2. [ ] Rodar task com login, fechar browser, reabrir, verificar sessao mantida
3. [ ] Rodar 5 tasks, verificar que mouse positions variam
4. [ ] Rodar task longa (30+ iter), verificar truncation
5. [ ] Comparar custo antes/depois

### Metricas de Sucesso

| Metrica | Antes | Esperado | Como Medir |
|---------|-------|----------|------------|
| Tokens/snapshot | 1500 | 750 | Log no agent |
| Custo/task media | $0.15 | $0.04 | Calcular tokens |
| Sessao persiste | Nao | Sim | Teste manual |
| Mouse positions | Repete | Varia | Log humanization |
