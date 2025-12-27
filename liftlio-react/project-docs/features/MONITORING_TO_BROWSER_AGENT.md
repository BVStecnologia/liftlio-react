# Migracao: Monitoring → Browser Agent

## TL;DR
> Trocar **1 linha** em `processar_postagens_pendentes()`: em vez de `respond_to_youtube_comment()` (API), fazer INSERT em `browser_tasks` (agente).

---

## 1. Pipeline ATUAL (Sistema Completo)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PIPELINE DE MONITORING                                │
│                     (Postagem de comentarios em videos)                      │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────┐
   │  CRON: Monitormanto de Novos Videos  │  ← DESATIVADO (esperando agente)
   │  */45 min                            │
   │  verificar_novos_videos_youtube()    │
   └──────────────────┬───────────────────┘
                      │ Detecta novos videos nos canais
                      ▼
   ┌──────────────────────────────────────┐
   │  CRON: processar_fila_videos         │
   │  */5 min                             │
   └──────────────────┬───────────────────┘
                      │ Processa fila de videos
                      ▼
   ┌──────────────────────────────────────┐
   │  CRON: process_monitored_videos      │
   │  */5 min                             │
   │  Analisa video e cria mensagem       │
   └──────────────────┬───────────────────┘
                      │ Gera mensagens para cada video
                      ▼
   ┌──────────────────────────────────────┐
   │  CRON: create_comments_for_analyzed  │
   │  */5 min                             │
   └──────────────────┬───────────────────┘
                      │ Cria registros de comentarios
                      ▼
   ┌──────────────────────────────────────┐
   │  CRON: agendar_postagens_diarias     │
   │  */5 min                             │
   │  agendar_postagens_todos_projetos()  │
   └──────────────────┬───────────────────┘
                      │ Cria registros em "Settings messages posts"
                      │ status = 'pending', proxima_postagem = horario
                      ▼
   ┌──────────────────────────────────────┐
   │  CRON: Responder comentarios         │
   │  */30 min                            │
   │  cron_processar_todas_postagens()    │
   └──────────────────┬───────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────┐
   │  processar_postagens_pendentes()     │
   │                                      │
   │  SELECT * FROM "Settings messages    │
   │  posts" WHERE status = 'pending'     │
   │  AND proxima_postagem <= NOW()       │
   └──────────────────┬───────────────────┘
                      │
                      ▼
   ╔══════════════════════════════════════╗
   ║  respond_to_youtube_comment()        ║  ← PROBLEMA!
   ║                                      ║
   ║  POST googleapis.com/youtube/v3/    ║
   ║  comments?part=snippet               ║
   ║                                      ║
   ║  Usa OAuth token direto              ║
   ║  Detectado como bot → BANS           ║
   ╚══════════════════════════════════════╝
                      │
                      ▼
              ┌───────────────┐
              │  YouTube API  │
              │  403 Forbidden│ ← Frequente!
              └───────────────┘
```

---

## 2. Pipeline NOVO (Com Browser Agent)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PIPELINE DE MONITORING                                │
│                     (Postagem via Browser Agent)                             │
└─────────────────────────────────────────────────────────────────────────────┘

   [... mesmo fluxo ate aqui ...]
                      │
                      ▼
   ┌──────────────────────────────────────┐
   │  processar_postagens_pendentes()     │
   │                                      │
   │  SELECT * FROM "Settings messages    │
   │  posts" WHERE status = 'pending'     │
   └──────────────────┬───────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
   ┌─────────────────┐     ┌─────────────────┐
   │ VERIFICAR:      │     │ SE NAO:         │
   │ is_connected?   │     │ SKIP projeto    │
   │ browser_logins  │     │ (nao pode       │
   │ platform=youtube│     │  postar)        │
   └────────┬────────┘     └─────────────────┘
            │ SIM
            ▼
   ╔══════════════════════════════════════╗
   ║  INSERT INTO browser_tasks           ║  ← NOVO!
   ║                                      ║
   ║  project_id, task, task_type,        ║
   ║  status='pending', priority          ║
   ║                                      ║
   ║  + post_id nos metadata              ║
   ╚══════════════════════════════════════╝
            │
            │  UPDATE "Settings messages posts"
            │  SET status = 'queued'
            ▼
   ┌──────────────────────────────────────┐
   │  CRON: browser-dispatch-cron         │  ← JA EXISTE!
   │  * * * * * (cada minuto)             │
   │                                      │
   │  Edge Function: browser-dispatch     │
   │  SELECT FROM browser_tasks           │
   │  WHERE status = 'pending'            │
   └──────────────────┬───────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────┐
   │  POST browser_mcp_url/agent/task     │
   │                                      │
   │  Chrome + Google Session             │
   │  Comportamento humanizado            │
   │  - Assiste videos                    │
   │  - Curte                             │
   │  - Le comentarios                    │
   │  - Posta comentario                  │
   └──────────────────┬───────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────┐
   │  CALLBACK (no proprio browser-       │
   │  dispatch ou nova logica):           │
   │                                      │
   │  Se SUCESSO:                         │
   │  - UPDATE Settings messages posts    │
   │    SET status = 'posted'             │
   │  - UPDATE Mensagens                  │
   │    SET respondido = true             │
   └──────────────────────────────────────┘
```

---

## 3. O Que Precisa Mudar

### 3.1 UNICA FUNCAO A MODIFICAR: `processar_postagens_pendentes()`

```sql
-- Arquivo: 04_processar_postagens_pendentes.sql
-- Linha: ~116-126

-- ═══════════════════════════════════════════════════════════════
-- ANTES (API direta):
-- ═══════════════════════════════════════════════════════════════

v_resposta := respond_to_youtube_comment(
    v_registro.projeto_id::INT,
    v_parent_comment_id,
    v_mensagem_texto
);

-- ═══════════════════════════════════════════════════════════════
-- DEPOIS (Browser Agent):
-- ═══════════════════════════════════════════════════════════════

-- 1. Verificar se YouTube esta conectado no Browser Agent
SELECT is_connected INTO v_youtube_conectado
FROM browser_logins
WHERE projeto_id = v_registro.projeto_id
  AND platform_name = 'youtube'
  AND is_active = true;

IF v_youtube_conectado IS NULL OR v_youtube_conectado = false THEN
    -- Pular este projeto - nao pode postar sem conexao
    RAISE NOTICE 'Projeto % sem YouTube conectado, pulando', v_registro.projeto_id;
    CONTINUE;  -- Vai para proximo registro no loop
END IF;

-- 2. Buscar URL do video para o prompt
SELECT v.url INTO v_video_url
FROM "Videos" v
WHERE v.id = v_registro.video_id;

-- 3. Inserir na fila do Browser Agent
INSERT INTO browser_tasks (
    project_id,
    task,
    task_type,
    status,
    priority,
    created_by
)
VALUES (
    v_registro.projeto_id,
    format(
        E'## TASK: Post YouTube Comment\n\n'
        '1. Go to video: %s\n'
        '2. Find comment section\n'
        '3. Find and reply to comment ID: %s\n'
        '4. Post this reply: "%s"\n\n'
        '## RESPONSE:\n'
        '- COMMENT_POSTED if success\n'
        '- ERROR: reason if failed\n\n'
        '## METADATA:\n'
        'post_id: %s',
        v_video_url,
        v_parent_comment_id,
        v_mensagem_texto,
        v_registro.id
    ),
    'youtube_comment',
    'pending',
    2,
    NULL
)
RETURNING id INTO v_task_id;

-- 4. Marcar como "queued" (sera atualizado quando task completar)
UPDATE "Settings messages posts"
SET status = 'queued'
WHERE id = v_registro.id;

-- 5. Registrar que task foi criada
RAISE NOTICE 'Task % criada para post %', v_task_id, v_registro.id;

-- Nao precisa esperar resposta - browser-dispatch vai processar
v_sucessos := v_sucessos + 1;
```

### 3.2 MODIFICAR: `browser-dispatch` Edge Function

Adicionar callback para atualizar `Settings messages posts` quando task completa:

```typescript
// Apos linha 95 (depois de atualizar browser_tasks)

// Se task_type = 'youtube_comment', atualizar Settings messages posts
if (task.task_type === 'youtube_comment' && agentResult.success) {
    // Extrair post_id do prompt (metadata)
    const postIdMatch = task.task.match(/post_id:\s*(\d+)/);
    if (postIdMatch) {
        const postId = parseInt(postIdMatch[1]);

        // Atualizar status para 'posted'
        await supabase
            .from('Settings messages posts')
            .update({
                status: 'posted',
                postado: new Date().toISOString()
            })
            .eq('id', postId);

        // Buscar mensagem_id e marcar como respondida
        const { data: postData } = await supabase
            .from('Settings messages posts')
            .select('Mensagens')
            .eq('id', postId)
            .single();

        if (postData?.Mensagens) {
            await supabase
                .from('Mensagens')
                .update({ respondido: true })
                .eq('id', postData.Mensagens);
        }

        console.log(`Updated Settings messages posts ${postId} to 'posted'`);
    }
} else if (task.task_type === 'youtube_comment' && !agentResult.success) {
    // Marcar como failed
    const postIdMatch = task.task.match(/post_id:\s*(\d+)/);
    if (postIdMatch) {
        await supabase
            .from('Settings messages posts')
            .update({
                status: 'failed',
                postado: new Date().toISOString()
            })
            .eq('id', parseInt(postIdMatch[1]));
    }
}
```

---

## 4. Resumo Visual: O Que Muda

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ✅ JA EXISTE (nao mexer):                                     │
│   ─────────────────────────                                     │
│   • browser_tasks (tabela)                                      │
│   • browser_logins (tabela com is_connected)                    │
│   • browser-dispatch-cron (CRON cada minuto)                    │
│   • browser-dispatch (Edge Function)                            │
│   • server-vnc.js (Browser Agent)                               │
│   • Projeto 117 ja conectado ao YouTube                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   🔧 MODIFICAR (2 arquivos):                                    │
│   ──────────────────────────                                    │
│                                                                 │
│   1. processar_postagens_pendentes.sql                          │
│      - Adicionar verificacao is_connected                       │
│      - Trocar respond_to_youtube_comment() por INSERT           │
│      - Mudar status 'pending' → 'queued'                        │
│                                                                 │
│   2. browser-dispatch (Edge Function)                           │
│      - Adicionar callback para youtube_comment                  │
│      - Atualizar Settings messages posts quando sucesso         │
│      - Atualizar Mensagens.respondido = true                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ❌ NAO PRECISA CRIAR:                                         │
│   ─────────────────────                                         │
│   • Nova Edge Function                                          │
│   • Nova tabela                                                 │
│   • Novo CRON                                                   │
│   • Novo endpoint no agente                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Ordem de Implementacao

```
[ ] 1. Modificar processar_postagens_pendentes()
       - Adicionar verificacao is_connected
       - Trocar API por INSERT em browser_tasks
       - Testar localmente

[ ] 2. Modificar browser-dispatch Edge Function
       - Adicionar callback para task_type='youtube_comment'
       - Deploy

[ ] 3. Testar com 1 post
       - Criar post manual em Settings messages posts
       - Verificar se task e criada
       - Verificar se agente executa
       - Verificar se callback atualiza status

[ ] 4. Reativar CRON de monitoramento
       - UPDATE cron.job SET active = true
         WHERE jobname = 'Monitormanto de Novos Videos Do canal'
```

---

## 6. Prompt Humanizado (Opcional - Melhoria Futura)

Para comportamento mais natural, o prompt pode ser expandido:

```markdown
## TASK: Post YouTube Comment (Human-like)

### Pre-actions (simulate browsing):
1. Go to channel page first
2. Watch 1-2 recent videos briefly (30s each)
3. Like at least one video

### Main action:
4. Navigate to target video: {{video_url}}
5. Watch for 60 seconds
6. Scroll to comments
7. Read 3-5 existing comments
8. Find parent comment: "{{parent_text}}"
9. Post reply: "{{comment_text}}"

### Response:
- COMMENT_POSTED
- ERROR: [reason]

### Metadata:
post_id: {{post_id}}
```

Isso pode ser configurado depois em `browser_platforms` ou nova tabela.
