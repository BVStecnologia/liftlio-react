# 🛡️ Sistema Anti-Spam - Monitoramento Inteligente YouTube

**Criado**: 2025-01-02
**Última atualização**: 2025-01-02
**Status**: 📝 PLANEJAMENTO
**Versão**: 1.0.0

---

## 🎯 OBJETIVO

Criar sistema inteligente que **PREVINE** bans do YouTube através de:

1. **Controle de frequência** - Não comentar demais no mesmo canal
2. **Detecção de deleção** - Identificar quando comentários são removidos
3. **Blacklist automático** - Parar de comentar em canais problemáticos
4. **Parecer humano** - Espaçamento e variação para não parecer bot

---

## 📊 SITUAÇÃO ATUAL

### ❌ Problemas Identificados:

```
Projeto 58 (HW): BANIDO
├─ 231 mensagens postadas
├─ 14 comentários em 1 canal
└─ Causa: Concentração excessiva

Projeto 77 (Liftlio): BANIDO
├─ 90 mensagens em 1 dia
├─ 34 comentários em 1 canal
└─ Causa: Volume + concentração
```

### ✅ Sistema Novo Vai:

```
✅ Limitar comentários por canal (1x por semana)
✅ Ajustar limite por tamanho do canal
✅ Detectar quando comentário é deletado
✅ Blacklist automático após 2 deleções
✅ Monitorar por 14 dias cada comentário
✅ Respeitar canais desativados manualmente
```

---

## 🗂️ ESTRUTURA DE PASTAS

```
08_Anti_Spam_Sistema/
│
├── README.md                          ← Este arquivo (MASTER PLAN)
│
├── ETAPAS/                            ← Implementação incremental
│   ├── ETAPA_1_README.md
│   ├── ETAPA_2_README.md
│   ├── ETAPA_3_README.md
│   ├── ETAPA_4_README.md
│   ├── ETAPA_5_README.md
│   └── ETAPA_6_README.md
│
├── MIGRATIONS/                        ← Alterações no schema
│   ├── 01_add_mensagens_tracking_columns.sql
│   └── 02_add_canais_control_columns.sql
│
├── FUNCOES/                           ← Funções SQL principais
│   ├── 01_get_last_comment_date_on_channel.sql
│   ├── 02_classify_channel_size.sql
│   ├── 03_can_comment_on_channel.sql
│   ├── 04_check_if_comment_exists.sql
│   ├── 05_verify_and_update_comment_status.sql
│   └── 06_apply_channel_penalty.sql
│
├── CRONS/                             ← Automações
│   ├── cron_verify_recent_comments.sql
│   └── cron_verify_old_comments.sql
│
├── ANALYTICS/                         ← Queries de análise
│   ├── deletion_rate_by_channel.sql
│   ├── blacklist_report.sql
│   ├── frequency_analysis.sql
│   └── channel_health_dashboard.sql
│
└── TESTES/                            ← Scripts de teste
    ├── test_etapa_1.sql
    ├── test_etapa_2.sql
    └── test_full_system.sql
```

---

## 🚀 PLANO DE IMPLEMENTAÇÃO

### 📋 VISÃO GERAL DAS ETAPAS

| Etapa | Nome | Objetivo | Duração | Risco | Status |
|-------|------|----------|---------|-------|--------|
| 1 | Controle Básico | Impedir 2x seguidas mesmo canal | 2h | 🟢 ZERO | ⏳ Pendente |
| 2 | Classificação | Ajustar por tamanho do canal | 1h | 🟢 BAIXO | ⏳ Pendente |
| 3 | Salvar IDs | Preparar tracking de comentários | 30min | 🟢 ZERO | ⏳ Pendente |
| 4 | Verificação Manual | Testar detecção de deleção | 1h | 🟢 ZERO | ⏳ Pendente |
| 5 | Blacklist Manual | Bloquear canais manualmente | 1h | 🟢 BAIXO | ⏳ Pendente |
| 6 | Sistema Automático | CRON + verificação periódica | 3h | 🟡 MÉDIO | ⏳ Pendente |

**Total Estimado**: 8.5 horas
**Pode parar em qualquer etapa se resolver o problema!**

---

## 📝 ETAPA 1: CONTROLE BÁSICO DE FREQUÊNCIA

### 🎯 Objetivo:
Impedir que o sistema comente 2 vezes seguidas no mesmo canal

### 🛠️ O que fazer:

#### 1.1. Criar função: `get_last_comment_date_on_channel()`

```sql
CREATE OR REPLACE FUNCTION get_last_comment_date_on_channel(
    p_canal_id BIGINT,
    p_project_id BIGINT
) RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN (
        SELECT MAX(m.created_at)
        FROM "Mensagens" m
        JOIN "Videos" v ON m.video = v.id
        JOIN "Canais do youtube" c ON v.canal_id = c.id
        WHERE c.id = p_canal_id
          AND m.project_id = p_project_id
          AND m.respondido = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 1.2. Modificar `process_monitored_videos()`

Adicionar ANTES de criar comentário:

```sql
-- Verificar última vez que comentou neste canal
v_last_comment := get_last_comment_date_on_channel(v_canal_id, v_project_id);

-- Se comentou há menos de 7 dias, PULAR
IF v_last_comment IS NOT NULL
   AND (NOW() - v_last_comment) < INTERVAL '7 days' THEN

    RAISE NOTICE 'Canal % pulado - comentou há % dias',
        v_canal_id,
        EXTRACT(EPOCH FROM (NOW() - v_last_comment)) / 86400;
    CONTINUE; -- Pular para próximo vídeo
END IF;
```

### ✅ Como Testar:

```sql
-- Teste 1: Ver quando foi último comentário
SELECT
    c.nome,
    get_last_comment_date_on_channel(c.id, 77) as ultimo_comentario,
    EXTRACT(EPOCH FROM (NOW() - get_last_comment_date_on_channel(c.id, 77))) / 86400 as dias_desde
FROM "Canais do youtube" c
WHERE c.id IN (SELECT DISTINCT canal_id FROM "Videos" WHERE monitored = TRUE)
LIMIT 10;

-- Teste 2: Processar vídeos e ver logs
SELECT process_monitored_videos();
-- Deve aparecer: "Canal X pulado - comentou há Y dias"

-- Teste 3: Verificar que NÃO criou mensagens duplicadas
SELECT
    c.nome,
    COUNT(*) as total_comentarios,
    MAX(m.created_at) as ultimo,
    MIN(m.created_at) as primeiro
FROM "Mensagens" m
JOIN "Videos" v ON m.video = v.id
JOIN "Canais do youtube" c ON v.canal_id = c.id
WHERE m."Comentario_Principais" IS NULL
  AND m.created_at >= NOW() - INTERVAL '7 days'
GROUP BY c.nome
HAVING COUNT(*) > 1; -- Não deve retornar nada!
```

### 🔄 Como Reverter:

```sql
-- Só remover o bloco IF adicionado em process_monitored_videos()
-- Nada quebra pois não modificou dados, só lógica
```

### 📈 Resultado Esperado:

```
✅ Sistema para de comentar 2x no mesmo canal em < 7 dias
✅ 60% do problema resolvido com ZERO risco
✅ Logs claros mostrando canais pulados
```

---

## 📝 ETAPA 2: CLASSIFICAÇÃO POR TAMANHO

### 🎯 Objetivo:
Ajustar intervalo baseado no tamanho do canal (pequeno = mais cuidado)

### 🛠️ O que fazer:

#### 2.1. Criar função: `classify_channel_size()`

```sql
CREATE OR REPLACE FUNCTION classify_channel_size(
    p_canal_id BIGINT
) RETURNS TEXT AS $$
DECLARE
    v_subscribers INTEGER;
BEGIN
    SELECT subscriber_count INTO v_subscribers
    FROM "Canais do youtube"
    WHERE id = p_canal_id;

    IF v_subscribers IS NULL OR v_subscribers < 10000 THEN
        RETURN 'small';
    ELSIF v_subscribers < 100000 THEN
        RETURN 'medium';
    ELSE
        RETURN 'large';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2.2. Modificar lógica em `process_monitored_videos()`

```sql
-- Classificar tamanho do canal
v_channel_size := classify_channel_size(v_canal_id);

-- Definir intervalo baseado no tamanho
v_min_days := CASE v_channel_size
    WHEN 'small' THEN 14
    WHEN 'medium' THEN 10
    ELSE 7
END;

-- Verificar última vez que comentou
v_last_comment := get_last_comment_date_on_channel(v_canal_id, v_project_id);

IF v_last_comment IS NOT NULL
   AND (NOW() - v_last_comment) < (v_min_days || ' days')::INTERVAL THEN

    RAISE NOTICE 'Canal % (%) pulado - precisa % dias, tem %',
        v_canal_id,
        v_channel_size,
        v_min_days,
        ROUND(EXTRACT(EPOCH FROM (NOW() - v_last_comment)) / 86400, 1);
    CONTINUE;
END IF;
```

### ✅ Como Testar:

```sql
-- Teste 1: Ver classificação dos canais
SELECT
    c.id,
    c.nome,
    c.subscriber_count,
    classify_channel_size(c.id) as tamanho
FROM "Canais do youtube" c
ORDER BY c.subscriber_count DESC
LIMIT 20;

-- Teste 2: Processar e ver diferentes intervalos nos logs
SELECT process_monitored_videos();
-- Deve mostrar: "Canal X (small) pulado - precisa 14 dias"
--              "Canal Y (large) pulado - precisa 7 dias"
```

### 📈 Resultado Esperado:

```
✅ Canais pequenos: espera 14 dias
✅ Canais médios: espera 10 dias
✅ Canais grandes: espera 7 dias
✅ Ainda mais seguro, adaptado à realidade do canal
```

---

## 📝 ETAPA 3: SALVAR YOUTUBE_COMMENT_ID

### 🎯 Objetivo:
Capturar e salvar o ID do comentário retornado pela API do YouTube

### 🛠️ O que fazer:

#### 3.1. Modificar `post_youtube_video_comment()`

Adicionar APÓS postagem bem-sucedida:

```sql
-- Extrair comment_id da resposta
v_comment_id := http_response.content::JSONB->'id';

-- Salvar na tabela Mensagens
UPDATE "Mensagens"
SET youtube_comment_id = v_comment_id
WHERE id = v_message_id;

RAISE NOTICE 'Comentário postado com ID: %', v_comment_id;
```

### ✅ Como Testar:

```sql
-- Teste 1: Postar 1 comentário de teste
UPDATE "Mensagens"
SET teste = TRUE, respondido = FALSE
WHERE id = 12345; -- ID de teste

-- Aguardar postagem via CRON ou trigger

-- Teste 2: Verificar se salvou o ID
SELECT
    id,
    mensagem,
    youtube_comment_id,
    respondido,
    created_at
FROM "Mensagens"
WHERE id = 12345;
-- youtube_comment_id deve estar preenchido!

-- Teste 3: Verificar formato do ID
SELECT
    COUNT(*) as total,
    COUNT(youtube_comment_id) as com_id,
    AVG(LENGTH(youtube_comment_id)) as tamanho_medio_id
FROM "Mensagens"
WHERE respondido = TRUE
  AND created_at >= NOW() - INTERVAL '7 days';
```

### 📈 Resultado Esperado:

```
✅ Campo youtube_comment_id preenchido automaticamente
✅ Formato: String ~30 caracteres (ex: "UgzX3...")
✅ Preparado para verificação futura
```

---

## 📝 ETAPA 4: VERIFICAÇÃO MANUAL DE DELEÇÃO

### 🎯 Objetivo:
Criar função que verifica se comentário ainda existe no YouTube

### 🛠️ O que fazer:

#### 4.1. Criar função: `check_if_comment_exists()`

```sql
CREATE OR REPLACE FUNCTION check_if_comment_exists(
    p_youtube_comment_id TEXT,
    p_project_id BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
    v_token TEXT;
    v_response JSONB;
    v_http_response http_response;
BEGIN
    -- Obter token do projeto
    v_token := get_youtube_token(p_project_id);

    -- Chamar YouTube API
    SELECT * INTO v_http_response
    FROM http((
        'GET',
        'https://www.googleapis.com/youtube/v3/comments?part=id&id=' || p_youtube_comment_id,
        ARRAY[
            http_header('Authorization', 'Bearer ' || v_token)
        ]::http_header[],
        NULL,
        NULL
    )::http_request);

    -- Extrair resposta
    v_response := v_http_response.content::JSONB;

    -- Se items array está vazio ou null = comentário não existe
    RETURN (v_response->'items')::JSONB->0 IS NOT NULL;

EXCEPTION WHEN OTHERS THEN
    -- Em caso de erro, assumir que existe (evitar falso positivo)
    RAISE WARNING 'Erro ao verificar comentário: %', SQLERRM;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### ✅ Como Testar:

```sql
-- Teste 1: Verificar comentário que existe
SELECT
    id,
    youtube_comment_id,
    check_if_comment_exists(youtube_comment_id, project_id) as ainda_existe
FROM "Mensagens"
WHERE youtube_comment_id IS NOT NULL
  AND respondido = TRUE
LIMIT 1;
-- Deve retornar TRUE

-- Teste 2: Deletar 1 comentário manualmente no YouTube
-- Depois verificar:
SELECT check_if_comment_exists('ID_DO_COMENTARIO_DELETADO', 77);
-- Deve retornar FALSE

-- Teste 3: Batch de verificação
SELECT
    COUNT(*) as total,
    SUM(CASE WHEN check_if_comment_exists(youtube_comment_id, project_id)
        THEN 1 ELSE 0 END) as ativos,
    SUM(CASE WHEN NOT check_if_comment_exists(youtube_comment_id, project_id)
        THEN 1 ELSE 0 END) as deletados
FROM "Mensagens"
WHERE youtube_comment_id IS NOT NULL
  AND respondido = TRUE
  AND created_at >= NOW() - INTERVAL '7 days'
LIMIT 10; -- Testar com poucos primeiro!
```

### 📈 Resultado Esperado:

```
✅ Função retorna TRUE = comentário existe
✅ Função retorna FALSE = foi deletado
✅ Pronto para automação
```

---

## 📝 ETAPA 5: BLACKLIST MANUAL DE CANAIS

### 🎯 Objetivo:
Criar campos na tabela "Canais do youtube" para controle anti-spam

### 🛠️ O que fazer:

#### 5.1. Migration: Adicionar colunas

```sql
-- MIGRATIONS/02_add_canais_control_columns.sql

ALTER TABLE "Canais do youtube"
ADD COLUMN IF NOT EXISTS last_comment_posted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS comments_deleted_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_disabled_reason TEXT;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_canais_auto_disabled
ON "Canais do youtube"(auto_disabled_reason)
WHERE auto_disabled_reason IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_canais_last_comment
ON "Canais do youtube"(last_comment_posted_at)
WHERE last_comment_posted_at IS NOT NULL;
```

#### 5.2. Modificar `process_monitored_videos()`

Adicionar filtro NO WHERE:

```sql
WHERE c.is_active = TRUE
  AND c.desativado_pelo_user = FALSE
  AND c.auto_disabled_reason IS NULL  -- ⭐ NOVO
  AND v.monitored = TRUE
  -- resto da query...
```

Adicionar APÓS criar comentário:

```sql
-- Atualizar timestamp do último comentário
UPDATE "Canais do youtube"
SET last_comment_posted_at = NOW()
WHERE id = v_canal_id;
```

### ✅ Como Testar:

```sql
-- Teste 1: Aplicar migration
\i MIGRATIONS/02_add_canais_control_columns.sql

-- Teste 2: Blacklist manual de 1 canal
UPDATE "Canais do youtube"
SET auto_disabled_reason = 'Teste manual - comentários deletados'
WHERE id = 123; -- Canal de teste

-- Teste 3: Processar vídeos
SELECT process_monitored_videos();
-- Canal 123 NÃO deve aparecer nos logs

-- Teste 4: Verificar que foi ignorado
SELECT
    c.nome,
    c.auto_disabled_reason,
    COUNT(v.id) as videos_disponiveis
FROM "Canais do youtube" c
LEFT JOIN "Videos" v ON v.canal_id = c.id AND v.monitored = TRUE
WHERE c.auto_disabled_reason IS NOT NULL
GROUP BY c.nome, c.auto_disabled_reason;

-- Teste 5: Remover blacklist
UPDATE "Canais do youtube"
SET auto_disabled_reason = NULL
WHERE id = 123;
```

### 📈 Resultado Esperado:

```
✅ Canais com auto_disabled_reason são ignorados
✅ last_comment_posted_at atualizado automaticamente
✅ Preparado para blacklist automático
```

---

## 📝 ETAPA 6: SISTEMA AUTOMÁTICO COMPLETO

### 🎯 Objetivo:
Verificar comentários periodicamente e aplicar blacklist automático

### 🛠️ O que fazer:

#### 6.1. Migration: Adicionar colunas em "Mensagens"

```sql
-- MIGRATIONS/01_add_mensagens_tracking_columns.sql

ALTER TABLE "Mensagens"
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS still_exists BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_mensagens_verification
ON "Mensagens"(respondido, youtube_comment_id, still_exists, created_at)
WHERE youtube_comment_id IS NOT NULL;
```

#### 6.2. Criar função: `verify_and_update_comment_status()`

```sql
CREATE OR REPLACE FUNCTION verify_and_update_comment_status(
    p_message_id BIGINT
) RETURNS JSONB AS $$
DECLARE
    v_message RECORD;
    v_still_exists BOOLEAN;
    v_hours_since_posted DECIMAL;
BEGIN
    -- Buscar dados da mensagem
    SELECT
        m.*,
        v.canal_id,
        EXTRACT(EPOCH FROM (NOW() - m.created_at)) / 3600 as hours_old
    INTO v_message
    FROM "Mensagens" m
    JOIN "Videos" v ON m.video = v.id
    WHERE m.id = p_message_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Mensagem não encontrada');
    END IF;

    -- Verificar se comentário ainda existe
    v_still_exists := check_if_comment_exists(
        v_message.youtube_comment_id,
        v_message.project_id
    );

    -- Atualizar status da mensagem
    UPDATE "Mensagens"
    SET
        last_verified_at = NOW(),
        verification_count = verification_count + 1,
        still_exists = v_still_exists,
        deleted_at = CASE
            WHEN NOT v_still_exists AND deleted_at IS NULL
            THEN NOW()
            ELSE deleted_at
        END
    WHERE id = p_message_id;

    -- Se foi deletado, aplicar penalidade ao canal
    IF NOT v_still_exists THEN
        PERFORM apply_channel_penalty(
            v_message.canal_id,
            v_message.project_id,
            v_message.hours_old
        );
    END IF;

    RETURN jsonb_build_object(
        'message_id', p_message_id,
        'still_exists', v_still_exists,
        'hours_old', ROUND(v_message.hours_old, 1),
        'verification_count', v_message.verification_count + 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 6.3. Criar função: `apply_channel_penalty()`

```sql
CREATE OR REPLACE FUNCTION apply_channel_penalty(
    p_canal_id BIGINT,
    p_project_id BIGINT,
    p_hours_until_deleted DECIMAL
) RETURNS VOID AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Incrementar contador
    UPDATE "Canais do youtube"
    SET comments_deleted_count = comments_deleted_count + 1
    WHERE id = p_canal_id
    RETURNING comments_deleted_count INTO v_deleted_count;

    -- Aplicar blacklist baseado em timing e quantidade
    IF p_hours_until_deleted < 1 THEN
        -- Deletado em < 1 hora = BLACKLIST IMEDIATO
        UPDATE "Canais do youtube"
        SET auto_disabled_reason = format(
            'Comentário deletado em %.1f horas (detecção de bot)',
            p_hours_until_deleted
        )
        WHERE id = p_canal_id;

        RAISE NOTICE 'Canal % BLACKLISTED - Deleção rápida', p_canal_id;

    ELSIF p_hours_until_deleted < 24 THEN
        -- Deletado em < 24h = BLACKLIST
        UPDATE "Canais do youtube"
        SET auto_disabled_reason = format(
            'Comentário deletado em %.1f horas (dono ativo rejeita)',
            p_hours_until_deleted
        )
        WHERE id = p_canal_id;

        RAISE NOTICE 'Canal % BLACKLISTED - Deleção em 24h', p_canal_id;

    ELSIF v_deleted_count >= 2 THEN
        -- 2+ deleções = BLACKLIST
        UPDATE "Canais do youtube"
        SET auto_disabled_reason = format(
            '%s comentários deletados - canal rejeita conteúdo',
            v_deleted_count
        )
        WHERE id = p_canal_id;

        RAISE NOTICE 'Canal % BLACKLISTED - % deleções', p_canal_id, v_deleted_count;
    ELSE
        RAISE NOTICE 'Canal % - Warning: % deleções', p_canal_id, v_deleted_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 6.4. Criar CRON: Verificação periódica

```sql
-- CRONS/cron_verify_recent_comments.sql

CREATE OR REPLACE FUNCTION cron_verify_recent_comments()
RETURNS JSONB AS $$
DECLARE
    v_verified INTEGER := 0;
    v_deleted INTEGER := 0;
    v_message RECORD;
BEGIN
    -- Verificar comentários que precisam de checagem
    FOR v_message IN
        SELECT
            m.id,
            EXTRACT(EPOCH FROM (NOW() - m.created_at)) / 3600 as hours_old,
            m.verification_count
        FROM "Mensagens" m
        WHERE m.respondido = TRUE
          AND m.youtube_comment_id IS NOT NULL
          AND m.still_exists = TRUE
          AND (
              -- 1 hora: primeira verificação
              (hours_old >= 1 AND m.verification_count = 0)
              -- 6 horas: segunda verificação
              OR (hours_old >= 6 AND m.verification_count = 1)
              -- 24 horas: terceira verificação
              OR (hours_old >= 24 AND m.verification_count = 2)
              -- 72 horas: quarta verificação
              OR (hours_old >= 72 AND m.verification_count = 3)
              -- 7 dias: quinta verificação
              OR (hours_old >= 168 AND m.verification_count = 4)
              -- 14 dias: sexta e última verificação
              OR (hours_old >= 336 AND m.verification_count = 5)
          )
        ORDER BY m.created_at DESC
        LIMIT 50 -- Processar em lotes
    LOOP
        DECLARE
            v_result JSONB;
        BEGIN
            v_result := verify_and_update_comment_status(v_message.id);
            v_verified := v_verified + 1;

            IF NOT (v_result->>'still_exists')::BOOLEAN THEN
                v_deleted := v_deleted + 1;
            END IF;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'verified', v_verified,
        'deleted', v_deleted,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### ✅ Como Testar:

```sql
-- Teste 1: Aplicar migrations
\i MIGRATIONS/01_add_mensagens_tracking_columns.sql

-- Teste 2: Verificar 1 comentário manualmente
SELECT verify_and_update_comment_status(12345);

-- Teste 3: Deletar comentário no YouTube e verificar novamente
-- Deve incrementar comments_deleted_count do canal

-- Teste 4: Rodar CRON manualmente
SELECT cron_verify_recent_comments();
-- Ver quantos foram verificados e quantos deletados

-- Teste 5: Conferir blacklist automático
SELECT
    c.nome,
    c.comments_deleted_count,
    c.auto_disabled_reason,
    COUNT(m.id) as total_comentarios
FROM "Canais do youtube" c
LEFT JOIN "Videos" v ON v.canal_id = c.id
LEFT JOIN "Mensagens" m ON m.video = v.id AND m.respondido = TRUE
WHERE c.auto_disabled_reason IS NOT NULL
GROUP BY c.nome, c.comments_deleted_count, c.auto_disabled_reason;
```

### 📈 Resultado Esperado:

```
✅ CRON verifica automaticamente (1h, 6h, 24h, 3d, 7d, 14d)
✅ Comentários deletados são detectados
✅ Canais problemáticos vão para blacklist automaticamente
✅ Sistema 100% automático após configurar CRON
```

---

## 📊 ANALYTICS & MONITORAMENTO

### Queries Essenciais:

#### 1. Taxa de Deleção por Canal

```sql
-- ANALYTICS/deletion_rate_by_channel.sql

SELECT
    c.nome,
    c.subscriber_count,
    classify_channel_size(c.id) as tamanho,
    COUNT(m.id) as total_comentarios,
    SUM(CASE WHEN m.still_exists = FALSE THEN 1 ELSE 0 END) as deletados,
    ROUND(100.0 * SUM(CASE WHEN m.still_exists = FALSE THEN 1 ELSE 0 END) /
        NULLIF(COUNT(m.id), 0), 2) as taxa_delecao_pct,
    c.auto_disabled_reason
FROM "Canais do youtube" c
JOIN "Videos" v ON v.canal_id = c.id
JOIN "Mensagens" m ON m.video = v.id
WHERE m.respondido = TRUE
  AND m.youtube_comment_id IS NOT NULL
GROUP BY c.nome, c.subscriber_count, c.id, c.auto_disabled_reason
HAVING COUNT(m.id) >= 3 -- Mínimo 3 comentários para calcular taxa
ORDER BY taxa_delecao_pct DESC NULLS LAST;
```

#### 2. Relatório de Blacklist

```sql
-- ANALYTICS/blacklist_report.sql

SELECT
    c.id,
    c.nome,
    c.subscriber_count,
    c.comments_deleted_count,
    c.auto_disabled_reason,
    c.last_comment_posted_at,
    COUNT(m.id) as total_comentarios_postados,
    SUM(CASE WHEN m.still_exists = FALSE THEN 1 ELSE 0 END) as confirmados_deletados
FROM "Canais do youtube" c
LEFT JOIN "Videos" v ON v.canal_id = c.id
LEFT JOIN "Mensagens" m ON m.video = v.id AND m.respondido = TRUE
WHERE c.auto_disabled_reason IS NOT NULL
GROUP BY c.id, c.nome, c.subscriber_count, c.comments_deleted_count,
         c.auto_disabled_reason, c.last_comment_posted_at
ORDER BY c.last_comment_posted_at DESC;
```

#### 3. Análise de Frequência

```sql
-- ANALYTICS/frequency_analysis.sql

SELECT
    c.nome,
    c.last_comment_posted_at,
    EXTRACT(EPOCH FROM (NOW() - c.last_comment_posted_at)) / 86400 as dias_desde_ultimo,
    classify_channel_size(c.id) as tamanho,
    CASE classify_channel_size(c.id)
        WHEN 'small' THEN 14
        WHEN 'medium' THEN 10
        ELSE 7
    END as intervalo_necessario,
    CASE
        WHEN c.last_comment_posted_at IS NULL THEN 'Nunca comentou'
        WHEN EXTRACT(EPOCH FROM (NOW() - c.last_comment_posted_at)) / 86400 >=
             CASE classify_channel_size(c.id) WHEN 'small' THEN 14 WHEN 'medium' THEN 10 ELSE 7 END
        THEN '✅ Pode comentar'
        ELSE format('⏳ Faltam %.1f dias',
             CASE classify_channel_size(c.id) WHEN 'small' THEN 14 WHEN 'medium' THEN 10 ELSE 7 END -
             EXTRACT(EPOCH FROM (NOW() - c.last_comment_posted_at)) / 86400)
    END as status
FROM "Canais do youtube" c
WHERE c.is_active = TRUE
  AND c.desativado_pelo_user = FALSE
  AND c.auto_disabled_reason IS NULL
ORDER BY dias_desde_ultimo DESC NULLS LAST
LIMIT 50;
```

#### 4. Dashboard de Saúde

```sql
-- ANALYTICS/channel_health_dashboard.sql

WITH stats AS (
    SELECT
        COUNT(DISTINCT c.id) as total_canais,
        COUNT(DISTINCT CASE WHEN c.auto_disabled_reason IS NOT NULL THEN c.id END) as blacklisted,
        COUNT(DISTINCT CASE WHEN c.desativado_pelo_user = TRUE THEN c.id END) as desativados_manual,
        COUNT(DISTINCT CASE WHEN c.is_active = TRUE AND c.auto_disabled_reason IS NULL
              AND c.desativado_pelo_user = FALSE THEN c.id END) as ativos,
        SUM(c.comments_deleted_count) as total_delecoes
    FROM "Canais do youtube" c
)
SELECT
    total_canais,
    ativos,
    blacklisted,
    desativados_manual,
    total_delecoes,
    ROUND(100.0 * blacklisted / NULLIF(total_canais, 0), 2) as pct_blacklisted,
    ROUND(100.0 * ativos / NULLIF(total_canais, 0), 2) as pct_ativos
FROM stats;
```

---

## 🔄 CRONOGRAMA DE VERIFICAÇÃO

```
CRON JOB 1: A cada 1 hora
├─ Verificar comentários com 1h (primeira check)
├─ Verificar comentários com 6h (segunda check)
└─ Verificar comentários com 24h (terceira check)
   └─ LIMITE: 50 comentários por execução

CRON JOB 2: 1x por dia (00:00)
├─ Verificar comentários com 3 dias (quarta check)
├─ Verificar comentários com 7 dias (quinta check)
└─ Verificar comentários com 14 dias (sexta check)
   └─ LIMITE: 100 comentários por execução
```

### Configurar no Supabase:

```sql
-- No Supabase Dashboard → Database → Cron Jobs

-- CRON 1: Verificação frequente (a cada hora)
SELECT cron.schedule(
    'verify-recent-youtube-comments',
    '0 * * * *',  -- A cada hora
    'SELECT cron_verify_recent_comments();'
);

-- CRON 2: Verificação diária (meia-noite)
SELECT cron.schedule(
    'verify-old-youtube-comments',
    '0 0 * * *',  -- Diariamente às 00:00
    'SELECT cron_verify_recent_comments();'  -- Mesma função, ela filtra por idade
);
```

---

## 🚨 REGRAS DE BLACKLIST

### Automático:

```
🔴 BLACKLIST IMEDIATO:
├─ Comentário deletado em < 1 hora
└─ Motivo: "Detecção de bot / filtro automático"

🔴 BLACKLIST EM 24H:
├─ Comentário deletado em < 24 horas
└─ Motivo: "Dono ativo rejeita comentários"

🟡 BLACKLIST APÓS 2 DELEÇÕES:
├─ 2+ comentários deletados (qualquer timing)
└─ Motivo: "Canal rejeita consistentemente conteúdo"
```

### Manual (usuário pode fazer):

```sql
-- Blacklist manual:
UPDATE "Canais do youtube"
SET auto_disabled_reason = 'Blacklist manual - [motivo]'
WHERE id = 123;

-- Remover blacklist:
UPDATE "Canais do youtube"
SET auto_disabled_reason = NULL,
    comments_deleted_count = 0
WHERE id = 123;
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### ✅ Antes de Começar:
- [ ] Backup do banco de dados
- [ ] Ambiente de staging preparado (se houver)
- [ ] Acesso ao Supabase Dashboard
- [ ] Token YouTube válido para testes

### ✅ Etapa 1:
- [ ] Criar função `get_last_comment_date_on_channel()`
- [ ] Modificar `process_monitored_videos()`
- [ ] Testar com logs
- [ ] Confirmar que não cria duplicatas
- [ ] ✅ Commit no GitHub

### ✅ Etapa 2:
- [ ] Criar função `classify_channel_size()`
- [ ] Atualizar lógica de intervalo
- [ ] Testar com diferentes tamanhos
- [ ] ✅ Commit no GitHub

### ✅ Etapa 3:
- [ ] Modificar `post_youtube_video_comment()`
- [ ] Salvar `youtube_comment_id`
- [ ] Testar postagem
- [ ] Verificar IDs salvos
- [ ] ✅ Commit no GitHub

### ✅ Etapa 4:
- [ ] Criar função `check_if_comment_exists()`
- [ ] Testar com comentário existente
- [ ] Deletar 1 comentário e testar
- [ ] ✅ Commit no GitHub

### ✅ Etapa 5:
- [ ] Aplicar migration em "Canais do youtube"
- [ ] Modificar WHERE em `process_monitored_videos()`
- [ ] Testar blacklist manual
- [ ] ✅ Commit no GitHub

### ✅ Etapa 6:
- [ ] Aplicar migration em "Mensagens"
- [ ] Criar função `verify_and_update_comment_status()`
- [ ] Criar função `apply_channel_penalty()`
- [ ] Criar CRON `cron_verify_recent_comments()`
- [ ] Configurar CRONs no Supabase
- [ ] Testar end-to-end
- [ ] Monitorar por 1 semana
- [ ] ✅ Commit no GitHub

---

## 🎯 MÉTRICAS DE SUCESSO

### Indicadores Principais:

```
✅ Taxa de Deleção < 10%
├─ Meta: Menos de 10% dos comentários deletados
└─ Medida: (comentários_deletados / total_postados) * 100

✅ Zero Bans de Conta
├─ Meta: Nenhuma conta banida nos próximos 3 meses
└─ Medida: Monitorar status de integração

✅ Cobertura de Verificação > 95%
├─ Meta: 95%+ dos comentários verificados em 14 dias
└─ Medida: (comentários_verificados / total_postados) * 100

✅ Blacklist Efetivo
├─ Meta: Canais com 2+ deleções bloqueados automaticamente
└─ Medida: COUNT(auto_disabled_reason IS NOT NULL)
```

---

## 🛟 TROUBLESHOOTING

### Problema: CRONs não estão rodando

```sql
-- Verificar status dos CRONs
SELECT * FROM cron.job;

-- Ver logs de execução
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;

-- Testar manualmente
SELECT cron_verify_recent_comments();
```

### Problema: Muitos falsos positivos (comentários existem mas marcados como deletados)

```sql
-- Verificar taxa de erro da API
SELECT
    COUNT(*) as total,
    SUM(CASE WHEN still_exists = FALSE THEN 1 ELSE 0 END) as marcados_deletados,
    COUNT(DISTINCT youtube_comment_id) as comentarios_unicos
FROM "Mensagens"
WHERE respondido = TRUE
  AND verification_count > 0;

-- Revisar manualmente alguns casos
SELECT * FROM "Mensagens"
WHERE still_exists = FALSE
ORDER BY deleted_at DESC
LIMIT 10;
```

### Problema: Nenhum canal está sendo processado

```sql
-- Ver status dos canais
SELECT
    COUNT(*) as total,
    SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as ativos,
    SUM(CASE WHEN auto_disabled_reason IS NOT NULL THEN 1 ELSE 0 END) as blacklisted,
    SUM(CASE WHEN desativado_pelo_user = TRUE THEN 1 ELSE 0 END) as desativados_manual
FROM "Canais do youtube";

-- Ver canais disponíveis para comentar
SELECT
    c.nome,
    c.is_active,
    c.auto_disabled_reason,
    c.last_comment_posted_at,
    EXTRACT(EPOCH FROM (NOW() - c.last_comment_posted_at)) / 86400 as dias_desde
FROM "Canais do youtube" c
WHERE c.is_active = TRUE
  AND c.desativado_pelo_user = FALSE
  AND c.auto_disabled_reason IS NULL
ORDER BY c.last_comment_posted_at NULLS FIRST;
```

---

## 📚 REFERÊNCIAS

- **YouTube API Comments**: https://developers.google.com/youtube/v3/docs/comments
- **Supabase pg_cron**: https://supabase.com/docs/guides/database/extensions/pg_cron
- **Documentação PIPELINE**: `../README.md`
- **Funções YouTube**: `../01_YouTube/`

---

## 📝 CHANGELOG

### 2025-01-02 - Criação inicial
- ✅ Estrutura completa do sistema anti-spam
- ✅ 6 etapas de implementação detalhadas
- ✅ Migrations, funções, CRONs e analytics
- ✅ Testes e troubleshooting documentados

---

**🎯 PRÓXIMO PASSO**: Ler `ETAPAS/ETAPA_1_README.md` e começar implementação!
