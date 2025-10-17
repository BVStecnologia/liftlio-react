# 💬 STATUS 5: CRIAÇÃO DE MENSAGENS DE ENGAGEMENT

**Transição**: STATUS 4 (LEADS) → STATUS 5 (ENGAGEMENT) → STATUS 6 (POSTAGENS)
**Função Principal**: `start_engagement_messages_processing()`
**Tempo Médio**: 3-10 minutos (depende da quantidade de comentários)
**Intervalo**: 30 segundos entre batches
**Objetivo**: Criar mensagens de engagement usando timestamps da transcrição do vídeo como ganchos emocionais

---

## 📋 VISÃO GERAL

Neste estágio, o sistema cria **mensagens de engagement** para comentários, usando Claude AI para gerar respostas contextualizadas que:
- Usam timestamps específicos da transcrição do vídeo como gancho emocional
- Mencionam o produto/serviço de forma INDIRETA (como usuário compartilhando experiência)
- Priorizam leads para menções ao produto
- Respeitam limites de menções baseados no tamanho do vídeo

Após criar todas as mensagens, o sistema:
1. Atualiza status do projeto → 6
2. Chama `agendar_postagens_todos_projetos()` (STATUS_6)
3. Sistema de postagens assume controle

---

## 🎯 FUNÇÕES NESTE MÓDULO (6 funções)

### 01_process_engagement_comments_with_claude.sql
**Tipo**: AI Processor (análise com Claude)
**Entrada**: project_id, limit
**Saída**: JSONB com respostas geradas
**Responsabilidade**:
- Usar transcrição do vídeo como contexto
- Gerar comentários com timestamps como gancho emocional
- Mencionar produto de forma INDIRETA (usuário comum)
- Respeitar limite de menções baseado no tamanho do vídeo

### 02_process_and_create_messages_engagement.sql
**Tipo**: Message Creator (wrapper + inserção)
**Entrada**: project_id
**Saída**: TABLE (message_id, cp_id, status)
**Responsabilidade**:
- Chamar função 01 para gerar respostas
- Inserir mensagens na tabela Mensagens
- Marcar comentários como processados

### 03_process_engagement_messages_batch.sql
**Tipo**: Batch Processor (processador em lotes)
**Entrada**: project_id, batch_size
**Saída**: void
**Responsabilidade**:
- Gerenciar jobs do cron
- Processar comentários em lotes
- Fazer chamadas recursivas se necessário
- **Proteções contra loop infinito** ✅

### 04_start_engagement_messages_processing.sql
**Tipo**: Inicializador
**Entrada**: project_id, batch_size
**Saída**: text (mensagem de status)
**Responsabilidade**:
- Verificar se já existe job rodando
- Iniciar processamento imediato
- Chamar função 03 para processar lotes

### 05_stop_engagement_messages_processing.sql
**Tipo**: Controle de Job
**Entrada**: project_id
**Saída**: text
**Responsabilidade**:
- Parar job cron em execução
- Útil para cancelar processamento

### 06_video_engagement_metrics.sql
**Tipo**: Analytics
**Entrada**: Vários parâmetros
**Saída**: Métricas de engagement
**Responsabilidade**:
- Calcular métricas de engagement
- Análise de performance das mensagens

---

## 🔄 FLUXO DETALHADO

```
┌──────────────────────────────────────────────────────────────────┐
│                       STATUS 5 → 6                               │
│                                                                   │
│  start_engagement_messages_processing() é chamado                │
│            │                                                      │
│            ▼                                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Verifica leads sem mensagem criada                        │ │
│  │  WHERE is_lead = true                                      │ │
│  │  AND NOT EXISTS (mensagem em Mensagens_Engajamento)        │ │
│  └──────────────────────┬─────────────────────────────────────┘ │
│                         │                                         │
│                         ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Agenda job pg_cron (30s):                                 │ │
│  │  "SELECT process_engagement_messages_batch({id}, 5)"       │ │
│  └──────────────────────┬─────────────────────────────────────┘ │
│                         │                                         │
│                         ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  process_engagement_messages_batch()                       │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 1. Adquire Advisory Lock                             │ │ │
│  │  │    pg_try_advisory_lock(99999 + project_id)          │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 2. Circuit Breaker Check                             │ │ │
│  │  │    • Max 100 execuções/hora                          │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 3. Busca até 5 leads sem mensagem                    │ │ │
│  │  │    SELECT cp.id, cp.text_original,                   │ │ │
│  │  │           v.titulo, cp.score_pics_total              │ │ │
│  │  │    FROM Comentarios_Principais cp                    │ │ │
│  │  │    WHERE cp.is_lead = true                           │ │ │
│  │  │    AND NOT EXISTS (mensagem criada)                  │ │ │
│  │  │    ORDER BY cp.score_pics_total DESC                 │ │ │
│  │  │    LIMIT 5                                           │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 4. Para cada lead:                                   │ │ │
│  │  │    • Coleta contexto:                                │ │ │
│  │  │      - Texto do comentário                           │ │ │
│  │  │      - Score PICS                                    │ │ │
│  │  │      - Título do vídeo                               │ │ │
│  │  │      - Keywords do projeto                           │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 5. Chama process_engagement_comments_with_claude()   │ │ │
│  │  │    • Envia batch de 5 leads com contexto             │ │ │
│  │  │    • Claude gera mensagem personalizada              │ │ │
│  │  │    • Retorna array de mensagens                      │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 6. Salva mensagens na tabela                         │ │ │
│  │  │    INSERT INTO Mensagens_Engajamento                 │ │ │
│  │  │    (                                                 │ │ │
│  │  │      comentario_id,                                  │ │ │
│  │  │      mensagem_texto,                                 │ │ │
│  │  │      status = 'pendente',                            │ │ │
│  │  │      criado_por = 'Claude AI'                        │ │ │
│  │  │    )                                                 │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 7. Verifica se há mais leads sem mensagem            │ │ │
│  │  │    IF SIM:                                           │ │ │
│  │  │      • Agenda próxima execução (30s)                 │ │ │
│  │  │    IF NÃO:                                           │ │ │
│  │  │      • Remove job do pg_cron                         │ │ │
│  │  │      • Chama agendar_postagens_todos_projetos()      │ │ │
│  │  │      • UPDATE status = '6'                           │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 8. Libera Advisory Lock                              │ │ │
│  │  │    pg_advisory_unlock(99999 + project_id)            │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│            │                                                    │
│            ▼                                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  agendar_postagens_todos_projetos()                        │ │
│  │  • Define horários ideais para postagem                    │ │
│  │  • UPDATE scheduled_time nas mensagens                     │ │
│  │  • Cria jobs de postagem automática                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│            │                                                    │
│            ▼                                                    │
│  ✅ Pipeline Completo: STATUS 6                                │
│  ▶  Mensagens prontas para postagem agendada                   │
└────────────────────────────────────────────────────────────────┘
```

---

## 💾 TABELAS AFETADAS

### Tabela: `Comentarios_Principais`
**Operação**: SELECT
**Campos Lidos**:
- `id`, `text_original`, `author_name`, `score_pics_total`, `is_lead`, `video_id`

### Tabela: `Mensagens_Engajamento`
**Operação**: INSERT
**Campos Preenchidos**:
- `comentario_id`
- `mensagem_texto`
- `status` ('pendente', 'agendada', 'enviada')
- `criado_por` ('Claude AI')
- `created_at`
- `scheduled_time` (preenchido por `agendar_postagens`)

### Tabela: `Projeto`
**Operação**: UPDATE
**Campos Alterados**:
- `status` = '6' (Pipeline completo)

---

## 🤖 ESTRUTURA DA GERAÇÃO DE MENSAGENS

### Input para Claude (Batch de 5)
```json
[
  {
    "comment_id": 123,
    "comment_text": "Estou com esse problema há meses e não consigo resolver...",
    "author": "João Silva",
    "video_title": "Como resolver problema X",
    "score_pics": 35,
    "project_keywords": ["desenvolvimento", "JavaScript"],
    "project_description": "Consultoria em desenvolvimento web"
  },
  {
    "comment_id": 124,
    "comment_text": "Preciso urgentemente de ajuda com Y...",
    "author": "Maria Santos",
    "video_title": "Tutorial completo de Y",
    "score_pics": 31,
    "project_keywords": ["tutorial", "iniciantes"],
    "project_description": "Cursos online de programação"
  }
  // ... até 5 leads
]
```

### Output do Claude
```json
[
  {
    "comment_id": 123,
    "message": "Oi João! Entendo perfeitamente sua frustração com esse problema. Passei por algo similar quando [contexto relevante]. Uma dica que pode ajudar é [solução específica]. Se quiser conversar mais sobre isso, posso compartilhar um material que preparei especificamente sobre esse tema. Te ajudaria?",
    "tone": "helpful",
    "call_to_action": "offer_resource"
  },
  {
    "comment_id": 124,
    "message": "Maria, fico feliz que esteja buscando aprender Y! Pelo que você comentou, parece que você já tem uma boa base. Tenho um checklist gratuito que pode acelerar bastante seu aprendizado nesse tema. Seria útil para você?",
    "tone": "encouraging",
    "call_to_action": "offer_checklist"
  }
]
```

---

## 🧠 LÓGICA PRINCIPAL

### Função: `process_and_create_messages_engagement()`

```sql
CREATE OR REPLACE FUNCTION process_and_create_messages_engagement(
    comment_ids bigint[]
)
RETURNS void AS $$
DECLARE
    comments_data JSONB;
    generated_messages JSONB;
    i INTEGER;
    message_text TEXT;
BEGIN
    -- 1. Coletar dados dos comentários
    SELECT jsonb_agg(
        jsonb_build_object(
            'comment_id', cp.id,
            'comment_text', cp.text_original,
            'author', cp.author_name,
            'video_title', v.titulo,
            'score_pics', cp.score_pics_total,
            'project_keywords', p.keywords,
            'project_description', p.descricao
        )
    )
    INTO comments_data
    FROM "Comentarios_Principais" cp
    JOIN "Videos" v ON cp.video_id = v.id
    JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
    JOIN "Projeto" p ON s."Projeto_id" = p.id
    WHERE cp.id = ANY(comment_ids);

    -- 2. Chamar Claude para gerar mensagens
    SELECT process_engagement_comments_with_claude(comments_data)
    INTO generated_messages;

    -- 3. Inserir mensagens na tabela
    FOR i IN 1 .. jsonb_array_length(generated_messages)
    LOOP
        INSERT INTO "Mensagens_Engajamento" (
            comentario_id,
            mensagem_texto,
            status,
            criado_por,
            tone,
            call_to_action
        ) VALUES (
            (generated_messages->i->>'comment_id')::bigint,
            generated_messages->i->>'message',
            'pendente',
            'Claude AI',
            generated_messages->i->>'tone',
            generated_messages->i->>'call_to_action'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### Função: `agendar_postagens_todos_projetos()`

```sql
CREATE OR REPLACE FUNCTION agendar_postagens_todos_projetos()
RETURNS void AS $$
DECLARE
    message_record RECORD;
    ideal_time TIMESTAMP;
BEGIN
    -- Para cada mensagem pendente
    FOR message_record IN (
        SELECT id, comentario_id, created_at
        FROM "Mensagens_Engajamento"
        WHERE status = 'pendente'
        AND scheduled_time IS NULL
        ORDER BY created_at
    )
    LOOP
        -- Calcula horário ideal (ex: próximo dia útil, horário comercial)
        ideal_time := calculate_ideal_posting_time(message_record.created_at);

        -- Atualiza a mensagem
        UPDATE "Mensagens_Engajamento"
        SET
            scheduled_time = ideal_time,
            status = 'agendada'
        WHERE id = message_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## 🛡️ PROTEÇÕES IMPLEMENTADAS

### 1. Advisory Locks
```sql
pg_try_advisory_lock(99999 + project_id)
```

### 2. Circuit Breaker
Máximo 100 execuções por hora

### 3. Priorização por Score
```sql
ORDER BY cp.score_pics_total DESC
```
Leads com maior score são priorizados

### 4. Evita Duplicatas
```sql
WHERE NOT EXISTS (
    SELECT 1 FROM "Mensagens_Engajamento"
    WHERE comentario_id = cp.id
)
```

### 5. Agendamento Inteligente
- Evita fins de semana
- Prioriza horário comercial (9h-18h)
- Distribui mensagens ao longo do tempo

---

## 📊 MÉTRICAS ESPERADAS

| Métrica | Valor Típico |
|---------|--------------|
| Tempo por Mensagem | 5-8 segundos |
| Batch Size | 5 leads |
| Intervalo | 30 segundos |
| Tempo Total | 30-90 min |
| Taxa de Sucesso | > 98% |
| Mensagens Criadas | = Número de leads |

---

## 🎯 TIPOS DE MENSAGENS

### 1. Mensagem de Ajuda
**Para**: Leads com problema claro
**Tom**: Empático, solucionador
**Exemplo**: "Entendo sua frustração com X. Já passei por isso e descobri que..."

### 2. Mensagem Educacional
**Para**: Leads buscando aprender
**Tom**: Encorajador, educativo
**Exemplo**: "Ótima pergunta! Para entender melhor Y, sugiro começar por..."

### 3. Mensagem de Oferta
**Para**: Leads prontos para ação
**Tom**: Direto, profissional
**Exemplo**: "Vejo que você precisa de Z. Preparei um material gratuito que pode ajudar..."

---

## 🔍 TROUBLESHOOTING

### Problema: Pipeline travado em STATUS 5
**Diagnóstico**:
```sql
-- Ver leads sem mensagem
SELECT COUNT(*)
FROM "Comentarios_Principais" cp
JOIN "Videos" v ON cp.video_id = v.id
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = {project_id}
AND cp.is_lead = true
AND NOT EXISTS (
    SELECT 1 FROM "Mensagens_Engajamento"
    WHERE comentario_id = cp.id
);

-- Ver últimas mensagens criadas
SELECT * FROM "Mensagens_Engajamento"
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📊 QUERIES DE MONITORAMENTO

### Ver progresso de mensagens
```sql
SELECT
    COUNT(*) FILTER (WHERE status = 'pendente') as pendentes,
    COUNT(*) FILTER (WHERE status = 'agendada') as agendadas,
    COUNT(*) FILTER (WHERE status = 'enviada') as enviadas,
    COUNT(*) as total
FROM "Mensagens_Engajamento" me
JOIN "Comentarios_Principais" cp ON me.comentario_id = cp.id
JOIN "Videos" v ON cp.video_id = v.id
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = {project_id};
```

### Ver próximas postagens agendadas
```sql
SELECT
    me.mensagem_texto,
    me.scheduled_time,
    cp.author_name,
    v.titulo
FROM "Mensagens_Engajamento" me
JOIN "Comentarios_Principais" cp ON me.comentario_id = cp.id
JOIN "Videos" v ON cp.video_id = v.id
WHERE me.status = 'agendada'
AND me.scheduled_time >= NOW()
ORDER BY me.scheduled_time
LIMIT 20;
```

---

## 🎯 MAPA MENTAL

```
                    ┌─────────────────────────┐
                    │   STATUS 5              │
                    │   (Engagement Messages) │
                    └──────────┬──────────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │ process_engagement_messages_   │
              │         batch()                │
              │ (a cada 30s)                   │
              └────────────────┬───────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
    ┌─────────┐          ┌─────────┐          ┌─────────┐
    │ Lead 1  │          │ Lead 2  │          │ Lead 3  │
    │Score 35 │          │Score 32 │          │Score 29 │
    └────┬────┘          └────┬────┘          └────┬────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ process_engagement_comments_  │
              │      with_claude()             │
              │ (Edge Function - Batch)        │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Claude API                    │
              │ • Analisa contexto do lead    │
              │ • Considera score PICS        │
              │ • Gera mensagem personalizada │
              │ • Define tom e CTA            │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ INSERT Mensagens_Engajamento  │
              │ • mensagem_texto              │
              │ • status = 'pendente'         │
              │ • criado_por = 'Claude AI'    │
              └───────────────┬───────────────┘
                              │
                              ▼
                    ┌─────────────────────────┐
                    │ Todos leads processados?│
                    └──────────┬──────────────┘
                               │
              ┌────────────────┴────────────────┐
              │ SIM                             │ NÃO
              ▼                                 ▼
    ┌─────────────────┐                 ┌─────────────┐
    │ agendar_        │                 │ Agenda      │
    │ postagens_      │                 │ próximo     │
    │ todos_projetos()│                 │ batch (30s) │
    └────────┬────────┘                 └─────────────┘
             │
             ▼
    ┌─────────────────┐
    │ UPDATE          │
    │ scheduled_time  │
    │ status =        │
    │ 'agendada'      │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ UPDATE          │
    │ status = '6'    │
    │ (Pipeline       │
    │  Completo!)     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │  STATUS 6       │
    │  ✅ FINALIZADO  │
    └─────────────────┘
```

---

## 📁 ARQUIVOS RELACIONADOS

### SQL Functions
- `start_engagement_messages_processing.sql`
- `process_engagement_messages_batch.sql`
- `process_and_create_messages_engagement.sql`
- `agendar_postagens_todos_projetos.sql`

### Edge Functions
- `process-engagement-comments-with-claude.ts`
- `claude-complete.ts`

---

## ✅ CHECKLIST DE SUCESSO

Para considerar STATUS 5→6 bem-sucedido:

- [ ] Mensagem criada para cada lead (is_lead = true)
- [ ] Todas as mensagens têm `mensagem_texto` preenchido
- [ ] Status inicial das mensagens = 'pendente'
- [ ] `agendar_postagens` executado com sucesso
- [ ] Mensagens têm `scheduled_time` definido
- [ ] Status das mensagens mudou para 'agendada'
- [ ] Status do projeto mudou para '6'
- [ ] Job removido do pg_cron
- [ ] ✅ Pipeline completo!

---

**Última Atualização**: 2025-01-30
**Versão**: 1.0