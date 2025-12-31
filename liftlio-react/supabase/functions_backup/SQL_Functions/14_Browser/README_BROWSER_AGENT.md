# 🤖 Browser Agent - Sistema de Postagens Humanizadas

**Atualizado**: 2025-12-31
**Status**: Produção Ativa
**Versão**: v17 (PERMANENT ERROR DETECTION)

---

## 🏗️ Arquitetura de Callbacks (v17)

```
┌─────────────────────────────────────────────────────────────────┐
│ TRIGGER SQL (update_settings_post_on_task_complete v4):        │
│   → Updates Settings messages posts.status (youtube_reply ONLY)│
│   → Updates Mensagens.respondido (youtube_reply ONLY)          │
│   → SINGLE SOURCE OF TRUTH for youtube_reply post status       │
│   → v4: Added task_type conditional for Reddit future-proofing │
│                                                                 │
│ EDGE FUNCTION (browser-dispatch v17):                          │
│   → Updates browser_logins (UNIQUE)                            │
│   → Decrements customers.Mentions (UNIQUE)                     │
│   → youtube_comment: Updates Mensagens.respondido WITH         │
│     hasPermanentError check (VIDEO_NOT_FOUND, etc.)            │
│   → Does NOT touch SMP (trigger handles youtube_reply)         │
└─────────────────────────────────────────────────────────────────┘
```

**IMPORTANT v17**:
- Trigger SQL only processes `youtube_reply` tasks (future-proof for Reddit)
- Edge Function handles `youtube_comment` with permanent error detection
- Prevents false positives where deleted videos were marked as posted

---

## 📊 Visão Geral

O Browser Agent executa postagens no YouTube de forma humanizada, simulando comportamento real de usuário para evitar detecção de automação.

### Dois Sistemas de Postagem

| Sistema | Tipo | Prompt | Identificador |
|---------|------|--------|---------------|
| **Sistema 1** | RESPOSTAS a comentários | `reply_prompt` (3840 chars) | `Comentarios_Principal IS NOT NULL` |
| **Sistema 2** | COMENTÁRIOS iniciais | `comment_prompt` (4613 chars) | `Comentarios_Principal IS NULL` |

---

## 🎯 Sistema 1: DESCOBERTA (Respostas)

**Fluxo**:
```
Scanner → Busca vídeos por keywords
    ↓
Coleta TODOS comentários do vídeo
    ↓
Análise PICS → Identifica LEADS
    ↓
Claude → Cria RESPOSTA personalizada
    ↓
Browser Agent → Executa via reply_prompt
```

**Comportamento humanizado** (`reply_prompt`):
1. Navegar ao vídeo
2. Fechar ads/popups
3. Assistir em 2x por 60-90 segundos
4. Curtir o vídeo
5. Navegar aos comentários (scroll lento)
6. Ler alguns comentários (simular leitura)
7. Encontrar comentário alvo
8. Curtir o comentário
9. Clicar Reply
10. Digitar resposta naturalmente (char por char, delays)
11. Postar e verificar

**Tempo total**: 4-6 minutos

---

## 🎯 Sistema 2: MONITORAMENTO (Comentários Iniciais)

**Fluxo**:
```
Monitor Top 30 Canais → Detecta vídeo NOVO
    ↓
Análise → lead_potential = High?
    ↓
Claude → Cria COMENTÁRIO INICIAL
    ↓
Browser Agent → Executa via comment_prompt
```

**Comportamento humanizado** (`comment_prompt`) - Atualizado 30/12/2025:
1. Navegar ao vídeo alvo
2. **FECHAR ADS/POPUPS** imediatamente
3. **IR AO CANAL** (clicar no nome do canal)
4. **ASSISTIR 1-2 VÍDEOS** diferentes do canal
5. **CURTIR** esses vídeos (mostra interesse genuíno)
6. **VOLTAR ao vídeo alvo**
7. Fechar novos ads se aparecerem
8. **Assistir em 2x por ~2 minutos**
9. **CURTIR o vídeo**
10. **Scroll até comentários**
11. **LER alguns comentários** (hover, scroll lento)
12. **CURTIR 1-2 comentários**
13. Clicar na caixa de comentário
14. **DIGITAR naturalmente** (char por char, delays 50-200ms)
15. Esperar 2-3 segundos (simular revisão)
16. Clicar "Comment"
17. **Verificar** se foi postado

**Tempo total**: 7-10 minutos

---

## 📋 Tabela: browser_platforms

Armazena os prompts globais para cada plataforma:

```sql
SELECT
  platform_name,
  LENGTH(comment_prompt) as comment_len,
  LENGTH(reply_prompt) as reply_len,
  is_active
FROM browser_platforms;
```

**Resultado esperado**:
| platform_name | comment_len | reply_len | is_active |
|--------------|-------------|-----------|-----------|
| youtube | 4613 | 3840 | true |
| google | NULL | NULL | true |
| reddit | NULL | NULL | true |

---

## 📋 Tabela: browser_tasks

Rastreia todas as tasks enviadas ao Browser Agent:

```sql
-- Ver tasks de hoje
SELECT
  id, task_type, status, created_at,
  LEFT(response::text, 100) as result
FROM browser_tasks
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;
```

**Campos importantes**:
- `task_type`: 'youtube_comment' | 'youtube_reply' | 'action'
- `status`: 'pending' | 'running' | 'completed' | 'failed'
- `metadata`: JSON com mensagem_id, video_id, etc.
- `response`: JSON com resultado da execução

---

## 🔄 Funções SQL Relacionadas

### `browser_reply_to_comment()`
Cria task de resposta (Sistema 1):
```sql
SELECT browser_reply_to_comment(
  p_project_id := 117,
  p_video_id := 'abc123',
  p_parent_comment_id := 'xyz789',
  p_reply_text := 'Great point!',
  p_mensagem_id := 12345,
  p_settings_post_id := 67890,
  p_tipo_resposta := 'produto'
);
```

### `processar_postagens_pendentes()`
Processa postagens agendadas via Browser Agent:
- Verifica se já existe task running (evita conflitos)
- Limita a 1 task por vez
- Fire-and-forget: não espera resposta

### `update_settings_post_on_task_complete()` (Trigger v4)
Trigger que atualiza status quando task completa:
- **v4**: Só processa `task_type = 'youtube_reply'`
- Atualiza SMP.status para 'posted' ou 'failed'
- Atualiza Mensagens.respondido para true
- Detecta padrões de falha (ERROR, COMMENT_NOT_FOUND, etc.)
- Detecta padrões de sucesso (REPLY:SUCCESS, successfully posted, etc.)

---

## 📊 Métricas de Hoje (30/12/2025)

### Sistema 2 (Comentários Iniciais)
| Task ID | Mensagem | Status | Resultado |
|---------|----------|--------|-----------|
| 5ee1279d | 29864 | completed | COMMENT_POSTED |
| e8e071ac | 29857 | completed | COMMENT_POSTED |
| ef703d02 | 29856 | completed | COMMENT_POSTED |
| 00bca2be | 29858 | completed | COMMENT_POSTED |
| 4ed360cf | 29855 | completed | COMMENT_POSTED |
| 33f3d88f | 29854 | completed | COMMENT_POSTED |

**Taxa de sucesso**: 100% (6/6)

---

## 🛠️ Edge Functions Relacionadas

### `browser-dispatch` (ATIVO - v17)
CRON job que processa tasks a cada 1 minuto:
1. Busca próxima task pending
2. Marca como 'running'
3. Chama Browser Agent
4. Salva resultado em browser_tasks
5. **youtube_reply**: Trigger SQL atualiza SMP/Mensagens automaticamente
6. **youtube_comment**: Edge Function atualiza Mensagens.respondido COM verificação de erros permanentes
7. Atualiza browser_logins e Mentions (ÚNICO lugar)

**v17 Changes**:
- Added `hasPermanentError` check for `youtube_comment` tasks
- Detects: VIDEO_NOT_FOUND, VIDEO_UNAVAILABLE, COMMENTS_DISABLED, LOGIN_REQUIRED
- Prevents false positives where deleted videos were marked as `respondido = true`

### ⚠️ `browser-reply-executor` (DEPRECATED - NÃO USAR)
**STATUS**: ÓRFÃO - Ninguém chama mais esta função!

**Por que foi deprecada**:
- Causava race condition com browser-dispatch
- `browser_reply_to_comment()` foi atualizada para NÃO chamar esta função
- Tinha callbacks duplicados com Trigger SQL

**Recomendação**: Deletar esta Edge Function

**Evidência**:
```sql
-- Verificar que SQL function NÃO chama mais:
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'browser_reply_to_comment';
-- Procurar por: "REMOVIDO: Chamada net.http_post para browser-reply-executor"
```

---

## ⚠️ Known Issues & Quirks

### 1. Agent retorna `success: false` quando comentário já existe
**Comportamento**: Quando o Browser Agent tenta postar um comentário que já foi postado anteriormente, ele:
- Navega ao vídeo
- Tenta postar
- Detecta que o comentário já existe (vê "há 1 dia", etc.)
- Retorna `success: false` mas result contém "COMMENT_POSTED"

**Causa**: O agent está programado para verificar se o comentário foi postado. Quando vê que já existe, considera que "não postou agora" e retorna false.

**Workaround**: O sistema de callbacks verifica o `result` text, não apenas o `success` boolean. Se o result contém padrões de sucesso ("há 0 segundo", "COMMENT_POSTED"), considera como sucesso.

### 2. Vídeos deletados marcados como `respondido = true`
**Problema** (RESOLVIDO em v17): Tasks de `youtube_comment` marcavam `respondido = true` mesmo quando o vídeo foi deletado (VIDEO_NOT_FOUND).

**Causa**: O callback não verificava erros permanentes antes de marcar como respondido.

**Solução v17**: Adicionado `hasPermanentError` check no browser-dispatch que detecta:
- VIDEO_NOT_FOUND
- VIDEO_UNAVAILABLE
- COMMENTS_DISABLED
- LOGIN_REQUIRED
- "não está mais disponível"
- "does not exist"

---

## ⚠️ Troubleshooting

### Tasks stuck em "processing"
```sql
-- Resetar tasks stuck há mais de 1 hora
UPDATE "Settings messages posts"
SET status = 'pending'
WHERE status = 'processing'
  AND postado < NOW() - INTERVAL '1 hour';
```

### Ver tasks com erro
```sql
SELECT id, task_type, status, response
FROM browser_tasks
WHERE status = 'failed'
  OR response::text LIKE '%error%'
ORDER BY created_at DESC
LIMIT 10;
```

### Verificar falsos positivos (vídeos deletados marcados como postados)
```sql
SELECT
  m.id as mensagem_id,
  m.respondido,
  bt.response->>'result' as result
FROM "Mensagens" m
JOIN browser_tasks bt ON (bt.metadata->>'mensagem_id')::bigint = m.id
WHERE m.respondido = true
  AND (
    bt.response->>'result' ILIKE '%VIDEO_NOT_FOUND%'
    OR bt.response->>'result' ILIKE '%VIDEO_UNAVAILABLE%'
  )
ORDER BY bt.created_at DESC;
```

### Corrigir falsos positivos
```sql
-- Marcar como não respondido quando vídeo foi deletado
UPDATE "Mensagens"
SET respondido = false
WHERE id IN (
  SELECT (bt.metadata->>'mensagem_id')::bigint
  FROM browser_tasks bt
  WHERE bt.response->>'result' ILIKE '%VIDEO_NOT_FOUND%'
    OR bt.response->>'result' ILIKE '%VIDEO_UNAVAILABLE%'
);
```

### Verificar prompt atual
```sql
SELECT comment_prompt, reply_prompt
FROM browser_platforms
WHERE platform_name = 'youtube';
```

---

## 📝 Changelog

### 31/12/2025 - v17 (PERMANENT ERROR DETECTION)
- **ADDED** `hasPermanentError` check in browser-dispatch for youtube_comment tasks
- **DETECTS**: VIDEO_NOT_FOUND, VIDEO_UNAVAILABLE, COMMENTS_DISABLED, LOGIN_REQUIRED
- **PREVENTS** false positives where deleted videos were marked as `respondido = true`
- **FIXED** 4 existing false positive records in database (mensagem_ids: 28959, 29812, 29865, 29866)
- **UPDATED** trigger to v4 with `task_type = 'youtube_reply'` conditional
- **FUTURE-PROOF** for Reddit platform (trigger won't process reddit tasks)
- **DOCUMENTED** Known Issues section with agent quirks

### 31/12/2025 - v16 (NO DUPLICATION)
- **REMOVED** duplicate callbacks from `browser-dispatch`
- **UPDATED** trigger `update_settings_post_on_task_complete` to v3
- **ADDED** "Agent asked question" error patterns to trigger
- **ADDED** network error patterns (ERR_TUNNEL, ERR_CONNECTION)
- **SINGLE SOURCE OF TRUTH**: Trigger SQL handles SMP/Mensagens
- **Edge Function**: Only handles browser_logins and Mentions decrement
- Fixed 31% failure rate from old prompt (now 0%)

### 30/12/2025
- Atualizado `comment_prompt` de 676 para 4613 chars
- Adicionado comportamento de visitar canal e assistir outros vídeos
- Adicionado curtir vídeos do canal, vídeo alvo e comentários
- Tempo de execução aumentado para 7-10 minutos (mais humano)
- **Fixed** reply_prompt to include parent_comment_preview

### 27/12/2025
- Criado sistema fire-and-forget
- Implementado `browser_reply_to_comment()`
- Criado `browser-reply-executor` Edge Function

---

**Mantido por**: Claude Code
**Projeto**: Liftlio
