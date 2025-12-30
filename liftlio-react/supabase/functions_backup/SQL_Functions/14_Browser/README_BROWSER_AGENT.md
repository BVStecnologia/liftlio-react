# 🤖 Browser Agent - Sistema de Postagens Humanizadas

**Atualizado**: 2025-12-30
**Status**: Produção Ativa

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

### `browser-reply-executor`
Fire-and-forget executor que:
1. Recebe task da SQL function
2. Marca task como 'running'
3. Dispara requisição ao Browser Agent (não espera)
4. Retorna imediatamente (evita timeout de 60s)
5. Browser Agent atualiza DB quando termina

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

### Verificar prompt atual
```sql
SELECT comment_prompt, reply_prompt
FROM browser_platforms
WHERE platform_name = 'youtube';
```

---

## 📝 Changelog

### 30/12/2025
- Atualizado `comment_prompt` de 676 para 4613 chars
- Adicionado comportamento de visitar canal e assistir outros vídeos
- Adicionado curtir vídeos do canal, vídeo alvo e comentários
- Tempo de execução aumentado para 7-10 minutos (mais humano)

### 27/12/2025
- Criado sistema fire-and-forget
- Implementado `browser_reply_to_comment()`
- Criado `browser-reply-executor` Edge Function

---

**Mantido por**: Claude Code
**Projeto**: Liftlio
