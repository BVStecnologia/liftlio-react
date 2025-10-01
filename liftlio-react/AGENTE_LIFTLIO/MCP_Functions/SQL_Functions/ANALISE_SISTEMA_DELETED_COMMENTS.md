# 🔍 ANÁLISE PROFUNDA: Sistema de Detecção de Comentários Deletados

**Data**: 2025-09-30
**Autor**: Claude Code (Anthropic)
**Status**: Em desenvolvimento

---

## 📊 SITUAÇÃO ATUAL

### ✅ O que funciona bem:
1. **Pipeline completo STATUS 0-6**: Monitoramento, análise e engajamento funcionando
2. **Postagem automática**: Sistema posta comentários via API do YouTube
3. **Trigger automático**: `trigger_postar_comentario_youtube` gerencia postagens
4. **Rastreamento de mensagens**: Tabela `Mensagens` armazena comentários criados

### ❌ PROBLEMA CRÍTICO IDENTIFICADO:

**A tabela `Mensagens` NÃO armazena o `youtube_comment_id` retornado pela API!**

#### Como funciona hoje:
```
1. Claude AI cria comentário → Salvo na tabela Mensagens (id=123)
2. Trigger posta no YouTube → API retorna {"id": "UgxKREWmLwaCd3gCoAEC"}
3. ❌ Este ID do YouTube é PERDIDO! Não é salvo em lugar nenhum
4. ❌ Sistema não sabe qual comentário é qual no YouTube
5. ❌ IMPOSSÍVEL verificar se comentário ainda existe
```

#### Campos atuais da tabela Mensagens:
- ✅ `id`: ID interno do Liftlio
- ✅ `mensagem`: Texto do comentário
- ✅ `respondido`: Se foi postado ou não
- ✅ `video`: Relação com vídeo
- ❌ **FALTA**: `youtube_comment_id` (ID retornado pelo YouTube)

---

## 🎯 OBJETIVOS DA SOLUÇÃO

1. **Detectar quando um comentário foi deletado**
2. **Rastrear canais que deletam comentários frequentemente**
3. **Sistema de "strikes" progressivo**
4. **Suspensão automática de canais problemáticos**
5. **Monitoramento periódico e alertas**
6. **Analytics para identificar padrões**

---

## 🏗️ ARQUITETURA DA SOLUÇÃO COMPLETA

### FASE 1: Infraestrutura de Dados

#### 1.1 Novos campos na tabela `Mensagens`
```sql
ALTER TABLE "Mensagens"
ADD COLUMN youtube_comment_id TEXT,              -- ID do comentário no YouTube
ADD COLUMN last_verification_at TIMESTAMPTZ,     -- Última verificação
ADD COLUMN verification_status TEXT DEFAULT 'pending', -- 'pending','active','deleted','failed'
ADD COLUMN deletion_detected_at TIMESTAMPTZ,     -- Quando foi detectado como deletado
ADD COLUMN verification_attempts INTEGER DEFAULT 0; -- Tentativas de verificação

CREATE INDEX idx_mensagens_youtube_comment_id ON "Mensagens"(youtube_comment_id);
CREATE INDEX idx_mensagens_verification_status ON "Mensagens"(verification_status);
```

#### 1.2 Novos campos na tabela `Canais do youtube`
```sql
ALTER TABLE "Canais do youtube"
ADD COLUMN deletion_strikes INTEGER DEFAULT 0,   -- Contador de strikes
ADD COLUMN last_strike_at TIMESTAMPTZ,           -- Último strike
ADD COLUMN suspended_until TIMESTAMPTZ,          -- Suspensão temporária
ADD COLUMN suspension_reason TEXT,               -- Motivo da suspensão
ADD COLUMN permanent_ban BOOLEAN DEFAULT FALSE,  -- Ban permanente
ADD COLUMN deletion_history JSONB DEFAULT '[]'; -- Histórico de deletions

CREATE INDEX idx_canais_deletion_strikes ON "Canais do youtube"(deletion_strikes);
CREATE INDEX idx_canais_suspended_until ON "Canais do youtube"(suspended_until);
```

#### 1.3 Nova tabela: `comment_deletion_log`
```sql
CREATE TABLE comment_deletion_log (
    id BIGSERIAL PRIMARY KEY,
    mensagem_id BIGINT REFERENCES "Mensagens"(id),
    canal_id BIGINT REFERENCES "Canais do youtube"(id),
    video_id BIGINT REFERENCES "Videos"(id),
    project_id BIGINT REFERENCES "Projeto"(id),
    youtube_comment_id TEXT,
    posted_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    time_until_deletion INTERVAL, -- Quanto tempo ficou online
    comment_text TEXT,
    channel_response TEXT, -- Se canal respondeu antes de deletar
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deletion_log_canal ON comment_deletion_log(canal_id);
CREATE INDEX idx_deletion_log_project ON comment_deletion_log(project_id);
```

---

### FASE 2: Funções Core de Verificação

#### 2.1 ⚠️ CORREÇÃO CRÍTICA: Salvar youtube_comment_id após postagem
**Arquivo**: `/04_Mensagens/post_scheduled_messages.sql`

**📊 FLUXO REAL DE POSTAGEM:**
```
CRON (pg_cron a cada X minutos)
  ↓
cron_processar_todas_postagens_pendentes()
  ↓
post_scheduled_messages(settings_id)    ← Settings messages posts
  ↓
respond_to_youtube_comment(project_id, comment_id, text)
  ↓
YouTube API retorna: { "id": "UgxKRE..." }
  ↓
❌ PROBLEMA: ID não está sendo salvo!
```

**ATUAL** (linhas 56-68):
```sql
IF (v_response->>'success')::boolean THEN
    UPDATE "Settings messages posts"
    SET status = 'posted',
        postado = NOW()
    WHERE id = p_settings_id;

    UPDATE "Mensagens"
    SET respondido = true    -- ❌ SÓ MARCA COMO RESPONDIDO!
    WHERE id = (
        SELECT "Mensagens"
        FROM "Settings messages posts"
        WHERE id = p_settings_id
    );
```

**CORREÇÃO** (extrair e salvar o ID):
```sql
IF (v_response->>'success')::boolean THEN
    UPDATE "Settings messages posts"
    SET status = 'posted',
        postado = NOW()
    WHERE id = p_settings_id;

    UPDATE "Mensagens"
    SET respondido = true,
        youtube_comment_id = (v_response->'response'->>'id')::TEXT,  -- ✅ SALVA O ID!
        verification_status = 'active',                               -- ✅ STATUS INICIAL
        last_verification_at = NOW()                                  -- ✅ PRIMEIRA VERIFICAÇÃO
    WHERE id = (
        SELECT "Mensagens"
        FROM "Settings messages posts"
        WHERE id = p_settings_id
    );
```

#### 2.2 Função auxiliar: check_youtube_comment_status()
**Propósito**: Chamar API do YouTube para verificar se comentário existe

```sql
CREATE OR REPLACE FUNCTION check_youtube_comment_status(
    p_project_id INTEGER,
    p_youtube_comment_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_api_key TEXT;
    v_api_url TEXT;
    v_http_response http_response;
    v_response JSONB;
BEGIN
    -- Obter API key
    v_api_key := get_youtube_api_key();

    -- Construir URL
    v_api_url := format(
        'https://www.googleapis.com/youtube/v3/comments?part=id&id=%s&key=%s',
        urlencode(p_youtube_comment_id),
        v_api_key
    );

    -- Fazer requisição
    SELECT * INTO v_http_response
    FROM http((
        'GET',
        v_api_url,
        ARRAY[http_header('Accept', 'application/json')]::http_header[],
        NULL,
        NULL
    )::http_request);

    -- Verificar se comentário existe
    IF v_http_response.status = 200 THEN
        v_response := v_http_response.content::jsonb;

        -- Se items array tem 1 item = comentário existe
        IF jsonb_array_length(v_response->'items') > 0 THEN
            RETURN jsonb_build_object('found', true, 'status', 200);
        ELSE
            RETURN jsonb_build_object('found', false, 'status', 404);
        END IF;
    ELSE
        -- Erro na API
        RETURN jsonb_build_object('found', false, 'status', v_http_response.status);
    END IF;
END;
$$ LANGUAGE plpgsql;
```

#### 2.3 Função: verify_comment_exists()
**Propósito**: Verificar se um comentário ainda existe no YouTube

```sql
CREATE OR REPLACE FUNCTION verify_comment_exists(p_mensagem_id BIGINT)
RETURNS JSONB AS $$
DECLARE
    v_youtube_comment_id TEXT;
    v_project_id INTEGER;
    v_api_response JSONB;
    v_status TEXT;
BEGIN
    -- Buscar dados da mensagem
    SELECT youtube_comment_id, project_id
    INTO v_youtube_comment_id, v_project_id
    FROM "Mensagens"
    WHERE id = p_mensagem_id;

    -- Se não tem youtube_comment_id, não pode verificar
    IF v_youtube_comment_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'youtube_comment_id not found',
            'mensagem_id', p_mensagem_id
        );
    END IF;

    -- Chamar API do YouTube para verificar
    -- GET /youtube/v3/comments?id={comment_id}&key={API_KEY}
    v_api_response := check_youtube_comment_status(
        v_project_id,
        v_youtube_comment_id
    );

    -- Processar resposta
    IF v_api_response->>'found' = 'true' THEN
        -- Comentário ainda existe
        UPDATE "Mensagens"
        SET
            verification_status = 'active',
            last_verification_at = NOW(),
            verification_attempts = verification_attempts + 1
        WHERE id = p_mensagem_id;

        v_status := 'active';
    ELSE
        -- Comentário foi deletado!
        UPDATE "Mensagens"
        SET
            verification_status = 'deleted',
            deletion_detected_at = NOW(),
            verification_attempts = verification_attempts + 1
        WHERE id = p_mensagem_id;

        -- Processar deleção
        PERFORM handle_deleted_comment(p_mensagem_id);

        v_status := 'deleted';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'mensagem_id', p_mensagem_id,
        'youtube_comment_id', v_youtube_comment_id,
        'status', v_status,
        'verified_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;
```

#### 2.4 Função: handle_deleted_comment()
**Propósito**: Processar comentário deletado e aplicar strikes

```sql
CREATE OR REPLACE FUNCTION handle_deleted_comment(p_mensagem_id BIGINT)
RETURNS JSONB AS $$
DECLARE
    v_canal_id BIGINT;
    v_video_id BIGINT;
    v_project_id BIGINT;
    v_current_strikes INTEGER;
    v_suspension_days INTEGER;
    v_action TEXT;
    v_mensagem_data RECORD;
BEGIN
    -- Buscar dados completos da mensagem
    SELECT
        m.video,
        m.project_id,
        m.created_at as posted_at,
        m.mensagem,
        m.youtube_comment_id,
        v.canal,
        c.id as canal_id,
        c.deletion_strikes
    INTO v_mensagem_data
    FROM "Mensagens" m
    JOIN "Videos" v ON m.video = v.id
    JOIN "Canais do youtube" c ON v.canal = c.id
    WHERE m.id = p_mensagem_id;

    -- Registrar no log
    INSERT INTO comment_deletion_log (
        mensagem_id,
        canal_id,
        video_id,
        project_id,
        youtube_comment_id,
        posted_at,
        time_until_deletion,
        comment_text
    ) VALUES (
        p_mensagem_id,
        v_mensagem_data.canal_id,
        v_mensagem_data.video,
        v_mensagem_data.project_id,
        v_mensagem_data.youtube_comment_id,
        v_mensagem_data.posted_at,
        NOW() - v_mensagem_data.posted_at,
        v_mensagem_data.mensagem
    );

    -- Incrementar strikes
    v_current_strikes := v_mensagem_data.deletion_strikes + 1;

    -- Lógica progressiva de punição
    CASE
        WHEN v_current_strikes = 1 THEN
            v_action := 'WARNING';
            v_suspension_days := 0;
        WHEN v_current_strikes = 2 THEN
            v_action := 'SUSPEND_7_DAYS';
            v_suspension_days := 7;
        WHEN v_current_strikes = 3 THEN
            v_action := 'SUSPEND_30_DAYS';
            v_suspension_days := 30;
        ELSE
            v_action := 'PERMANENT_BAN';
            v_suspension_days := NULL; -- Permanente
    END CASE;

    -- Aplicar punição
    IF v_action = 'PERMANENT_BAN' THEN
        UPDATE "Canais do youtube"
        SET
            deletion_strikes = v_current_strikes,
            last_strike_at = NOW(),
            permanent_ban = TRUE,
            suspension_reason = 'Deleted ' || v_current_strikes || ' comments',
            is_active = FALSE,
            desativado_pelo_user = TRUE
        WHERE id = v_mensagem_data.canal_id;
    ELSIF v_suspension_days > 0 THEN
        UPDATE "Canais do youtube"
        SET
            deletion_strikes = v_current_strikes,
            last_strike_at = NOW(),
            suspended_until = NOW() + (v_suspension_days || ' days')::INTERVAL,
            suspension_reason = 'Deleted ' || v_current_strikes || ' comments',
            is_active = FALSE
        WHERE id = v_mensagem_data.canal_id;
    ELSE
        UPDATE "Canais do youtube"
        SET
            deletion_strikes = v_current_strikes,
            last_strike_at = NOW()
        WHERE id = v_mensagem_data.canal_id;
    END IF;

    -- Criar notificação
    INSERT INTO "Notificacoes" (
        projeto_id,
        lido,
        Mensagem,
        url,
        comando
    ) VALUES (
        v_mensagem_data.project_id,
        FALSE,
        'Comment deleted by channel! Strike #' || v_current_strikes || ' - Action: ' || v_action,
        '/monitoring?canal=' || v_mensagem_data.canal_id,
        'view_channel_strikes'
    );

    RETURN jsonb_build_object(
        'success', true,
        'mensagem_id', p_mensagem_id,
        'canal_id', v_mensagem_data.canal_id,
        'strikes', v_current_strikes,
        'action', v_action,
        'suspension_days', v_suspension_days
    );
END;
$$ LANGUAGE plpgsql;
```

---

### FASE 3: Monitoramento em Lote

#### 3.1 Função: batch_verify_recent_comments()
**Propósito**: Verificar vários comentários de uma vez

```sql
CREATE OR REPLACE FUNCTION batch_verify_recent_comments(
    p_project_id INTEGER,
    p_hours_ago INTEGER DEFAULT 24,
    p_batch_size INTEGER DEFAULT 50
)
RETURNS JSONB AS $$
DECLARE
    v_mensagem RECORD;
    v_verified INTEGER := 0;
    v_active INTEGER := 0;
    v_deleted INTEGER := 0;
    v_failed INTEGER := 0;
    v_result JSONB;
    v_results JSONB[] := '{}';
BEGIN
    -- Buscar comentários postados nas últimas X horas
    FOR v_mensagem IN
        SELECT id, youtube_comment_id
        FROM "Mensagens"
        WHERE project_id = p_project_id
        AND youtube_comment_id IS NOT NULL
        AND respondido = TRUE
        AND created_at > NOW() - (p_hours_ago || ' hours')::INTERVAL
        AND (
            last_verification_at IS NULL
            OR last_verification_at < NOW() - '6 hours'::INTERVAL
        )
        ORDER BY created_at DESC
        LIMIT p_batch_size
    LOOP
        -- Verificar cada comentário
        v_result := verify_comment_exists(v_mensagem.id);

        v_results := array_append(v_results, v_result);
        v_verified := v_verified + 1;

        -- Contar status
        CASE (v_result->>'status')::TEXT
            WHEN 'active' THEN v_active := v_active + 1;
            WHEN 'deleted' THEN v_deleted := v_deleted + 1;
            ELSE v_failed := v_failed + 1;
        END CASE;

        -- Rate limiting: 1 verificação por segundo
        PERFORM pg_sleep(1);
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'project_id', p_project_id,
        'hours_checked', p_hours_ago,
        'total_verified', v_verified,
        'active', v_active,
        'deleted', v_deleted,
        'failed', v_failed,
        'results', v_results
    );
END;
$$ LANGUAGE plpgsql;
```

---

### FASE 4: Função SQL de Monitoramento Global

**Arquivo**: `/13_Utils_Sistema/Crons/cron_verify_all_comments.sql`

#### 4.1 Função principal que verifica todos os projetos
```sql
CREATE OR REPLACE FUNCTION batch_verify_all_projects_comments()
RETURNS JSONB AS $$
DECLARE
    v_projeto RECORD;
    v_result JSONB;
    v_all_results JSONB[] := '{}';
    v_total_verified INTEGER := 0;
    v_total_deleted INTEGER := 0;
    v_projects_checked INTEGER := 0;
BEGIN
    -- Buscar todos os projetos ativos
    FOR v_projeto IN
        SELECT id, "Project name"
        FROM "Projeto"
        WHERE "Youtube Active" = TRUE
        AND integracao_valida = TRUE
        ORDER BY id
    LOOP
        BEGIN
            -- Verificar comentários das últimas 24h
            v_result := batch_verify_recent_comments(
                p_project_id := v_projeto.id,
                p_hours_ago := 24,
                p_batch_size := 50
            );

            v_all_results := array_append(v_all_results, jsonb_build_object(
                'project_id', v_projeto.id,
                'project_name', v_projeto."Project name",
                'result', v_result
            ));

            v_total_verified := v_total_verified + (v_result->>'total_verified')::INTEGER;
            v_total_deleted := v_total_deleted + (v_result->>'deleted')::INTEGER;
            v_projects_checked := v_projects_checked + 1;

            -- Se encontrou deletados, enviar notificação
            IF (v_result->>'deleted')::INTEGER > 0 THEN
                PERFORM send_email(
                    template_id := 'comment_deletion_alert',
                    to_email := 'admin@liftlio.com',
                    data := jsonb_build_object(
                        'project_name', v_projeto."Project name",
                        'deleted_count', v_result->>'deleted',
                        'report_url', 'https://liftlio.com/monitoring?project=' || v_projeto.id
                    )
                );
            END IF;

            -- Rate limiting entre projetos
            PERFORM pg_sleep(5);

        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao verificar projeto %: %', v_projeto.id, SQLERRM;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'projects_checked', v_projects_checked,
        'total_verified', v_total_verified,
        'total_deleted', v_total_deleted,
        'results', v_all_results,
        'checked_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;
```

#### 4.2 Agendar execução periódica
```sql
-- Executar a cada 6 horas usando pg_cron
SELECT cron.schedule(
    'verify-deleted-comments',           -- Nome do job
    '0 */6 * * *',                       -- A cada 6 horas
    $$SELECT batch_verify_all_projects_comments()$$
);
```

---

## 📊 ANALYTICS E INSIGHTS

### Query: Taxa de deleção por canal
```sql
SELECT
    c."Nome" as canal_nome,
    c.deletion_strikes,
    c.suspended_until,
    COUNT(cdl.id) as total_deletions,
    AVG(EXTRACT(EPOCH FROM cdl.time_until_deletion) / 3600) as avg_hours_until_deletion,
    MAX(cdl.deleted_at) as last_deletion
FROM "Canais do youtube" c
LEFT JOIN comment_deletion_log cdl ON c.id = cdl.canal_id
WHERE c.deletion_strikes > 0
GROUP BY c.id, c."Nome", c.deletion_strikes, c.suspended_until
ORDER BY total_deletions DESC;
```

### Query: Padrão temporal de deleções
```sql
SELECT
    DATE_TRUNC('hour', time_until_deletion) as time_bucket,
    COUNT(*) as deletions,
    AVG(EXTRACT(EPOCH FROM time_until_deletion)) as avg_seconds
FROM comment_deletion_log
GROUP BY time_bucket
ORDER BY deletions DESC;
```

---

## 🔄 IMPLEMENTAÇÃO GRADUAL

### Sprint 1 (Semana 1):
- ✅ Adicionar campos nas tabelas
- ✅ Modificar trigger para salvar youtube_comment_id
- ✅ Criar função verify_comment_exists()
- ✅ Testar manualmente com 5-10 comentários

### Sprint 2 (Semana 2):
- ✅ Criar função handle_deleted_comment()
- ✅ Implementar sistema de strikes
- ✅ Criar tabela comment_deletion_log
- ✅ Testar lógica de suspensão

### Sprint 3 (Semana 3):
- ✅ Criar função batch_verify_recent_comments()
- ✅ Criar função batch_verify_all_projects_comments()
- ✅ Configurar pg_cron para rodar a cada 6h
- ✅ Criar notificações por email (usando send_email existente)

### Sprint 4 (Semana 4):
- ✅ Criar analytics dashboard
- ✅ Implementar retry logic
- ✅ Documentação completa
- ✅ Deploy em produção

---

## ⚠️ CONSIDERAÇÕES IMPORTANTES

### Rate Limits do YouTube API:
- **10,000 units/dia** quota padrão
- Verificar comentário = **1 unit**
- Batch de 50 = 50 units
- Máximo diário: ~200 batches (10,000 comentários)

### Falsos Positivos:
- Comentário pode estar temporariamente indisponível
- Implementar retry com backoff exponencial
- Só marcar como deletado após 3 tentativas falhadas

### Privacy & GDPR:
- Não armazenar conteúdo de comentários de usuários
- Apenas rastrear nossos próprios comentários
- Log de deleções pode ser anonimizado

---

## 📈 MÉTRICAS DE SUCESSO

1. **Taxa de detecção**: % de comentários deletados detectados em <24h
2. **Precisão**: % de detecções que são realmente deleções
3. **Resposta**: Tempo médio entre deleção e ação corretiva
4. **Redução de desperdício**: % de canais problemáticos identificados antes de investir mais esforço

---

**Próximo passo**: Começar implementação Sprint 1?
