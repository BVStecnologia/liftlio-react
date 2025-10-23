# 🚀 IMPLEMENTAÇÃO ANTI-SPAM - GUIA DE EXECUÇÃO

**Data**: 2025-10-21 (atualizado)
**Tempo estimado**: 15 minutos
**Foco**: 100% AÇÃO, ZERO teoria

---

## ✅ STATUS ATUAL

```
✅ can_comment_on_channel V4 - 8 validações (projeto + YouTube + integração + SUBSCRIPTION)
✅ verify_comment_and_apply_penalty criada
✅ cron_verify_comments criada E AGENDADA (a cada 60 min)
✅ Integração COMPLETA - anti-spam em verificar_novos_videos_youtube
✅ verificar_novos_videos_youtube COM proteção anti-spam (TESTADO E FUNCIONANDO!)
✅ SISTEMA 100% OPERACIONAL
```

**⭐ VERSÃO V4**: `can_comment_on_channel` agora valida:
1. Projeto existe
2. YouTube ativo (`"Youtube Active" = TRUE`)
3. Integração válida (`integracao_valida = TRUE`)
4. **Subscription ativa** (has_active_subscription = TRUE) ← NOVO!
5-8. Validações originais (canal desativado, blacklist, intervalo)

---

## 📋 O QUE FALTA FAZER

- [x] **TAREFA 1**: Adicionar filtro anti-spam em `verificar_novos_videos_youtube` ✅ CONCLUÍDO (2025-10-21)
  - ✅ Integrado e testado
  - ✅ Lógica de 30 minutos funcionando corretamente
  - ✅ Validação de projeto/YouTube Active/integração válida funcionando
- [x] **TAREFA 2**: Agendar `cron_verify_comments` no Supabase ✅ CONCLUÍDO (agendado 60 min)
- [x] **UPGRADE V4**: can_comment_on_channel com validação de subscription ✅ DEPLOYADO

---

## 🔧 TAREFA 1: Modificar verificar_novos_videos_youtube

### SQL COMPLETO (Copiar e executar no Supabase):

```sql
-- =============================================
-- Função: verificar_novos_videos_youtube (COM ANTI-SPAM)
-- Atualizado: 2025-10-20 (Integração Anti-Spam)
-- =============================================

DROP FUNCTION IF EXISTS verificar_novos_videos_youtube();

CREATE OR REPLACE FUNCTION verificar_novos_videos_youtube()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_projeto RECORD;
    v_canal RECORD;
    v_result JSONB;
    v_videos_checked INTEGER := 0;
    v_new_videos INTEGER := 0;
    v_project_results JSONB[] := ARRAY[]::JSONB[];
    v_youtube_api_key TEXT;
    v_edge_result JSONB;
    v_video JSONB;
BEGIN
    -- Obter a chave da API do YouTube
    SELECT value INTO v_youtube_api_key
    FROM vault.decrypted_secrets
    WHERE name = 'YOUTUBE_API_KEY'
    LIMIT 1;

    IF v_youtube_api_key IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'YouTube API key not found',
            'timestamp', NOW()
        );
    END IF;

    -- Processar cada projeto ativo
    FOR v_projeto IN
        SELECT DISTINCT p.id, p."Project name", p.qtdmonitoramento
        FROM "Projeto" p
        WHERE p.status = 'active'
          AND p.qtdmonitoramento > 0
    LOOP
        v_videos_checked := 0;
        v_new_videos := 0;

        -- Buscar top canais para monitoramento (baseado em rank_position)
        FOR v_canal IN
            SELECT c.channel_id, c."Nome"
            FROM "Canais do youtube" c
            JOIN "Canais do youtube_Projeto" cp ON cp."Canais do youtube_id" = c.id
            WHERE cp."Projeto_id" = v_projeto.id
              AND cp.rank_position <= v_projeto.qtdmonitoramento
            ORDER BY cp.rank_position
            LIMIT v_projeto.qtdmonitoramento
        LOOP
            -- ⭐ ANTI-SPAM: Verificar se pode comentar neste canal
            IF NOT can_comment_on_channel(v_canal.channel_id, v_projeto.id) THEN
                RAISE NOTICE 'Canal % pulado - bloqueado por Anti-Spam', v_canal."Nome";
                CONTINUE; -- Pula canal bloqueado
            END IF;

            -- Chamar Edge Function para buscar vídeos recentes
            BEGIN
                SELECT payload INTO v_edge_result
                FROM http((
                    'POST',
                    current_setting('app.supabase_url') || '/functions/v1/check-youtube-videos',
                    ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.supabase_anon_key'))],
                    'application/json',
                    jsonb_build_object(
                        'channelId', v_canal.channel_id,
                        'apiKey', v_youtube_api_key,
                        'maxResults', 5
                    )::text
                )::http_request);

                -- Processar vídeos retornados
                IF v_edge_result ? 'videos' THEN
                    FOR v_video IN SELECT * FROM jsonb_array_elements(v_edge_result->'videos')
                    LOOP
                        v_videos_checked := v_videos_checked + 1;

                        -- Verificar se o vídeo já existe
                        IF NOT EXISTS (
                            SELECT 1 FROM "Videos"
                            WHERE "VIDEO" = v_video->>'videoId'
                        ) THEN
                            -- Inserir novo vídeo
                            INSERT INTO "Videos" (
                                "VIDEO",
                                video_title,
                                video_description,
                                channel_id_yotube,
                                published_at,
                                view_count,
                                like_count,
                                comment_count,
                                created_at
                            ) VALUES (
                                v_video->>'videoId',
                                v_video->>'title',
                                v_video->>'description',
                                v_canal.channel_id,
                                (v_video->>'publishedAt')::TIMESTAMP,
                                (v_video->>'viewCount')::BIGINT,
                                (v_video->>'likeCount')::BIGINT,
                                (v_video->>'commentCount')::BIGINT,
                                NOW()
                            );

                            v_new_videos := v_new_videos + 1;

                            -- Criar mensagem de monitoramento
                            PERFORM create_monitoring_message(
                                v_projeto.id,
                                v_video->>'videoId',
                                v_canal.channel_id
                            );
                        END IF;
                    END LOOP;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- Log error but continue processing
                RAISE NOTICE 'Error processing channel %: %', v_canal.channel_id, SQLERRM;
            END;
        END LOOP;

        -- Adicionar resultado do projeto
        v_project_results := array_append(
            v_project_results,
            jsonb_build_object(
                'project_id', v_projeto.id,
                'project_name', v_projeto."Project name",
                'videos_checked', v_videos_checked,
                'new_videos', v_new_videos
            )
        );
    END LOOP;

    -- Retornar resultado consolidado
    RETURN jsonb_build_object(
        'success', true,
        'projects_processed', array_length(v_project_results, 1),
        'results', v_project_results,
        'timestamp', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'timestamp', NOW()
    );
END;
$$;
```

**O que mudou**: Adicionadas 4 linhas após linha 58 (filtro anti-spam antes de processar canal)

---

## ⏰ TAREFA 2: Agendar cron_verify_comments

### SQL COMPLETO (Copiar e executar no Supabase):

```sql
-- Agendar verificação de comentários deletados (roda a cada 1 hora)
SELECT cron.schedule(
    'verify-youtube-comments',
    '0 * * * *',
    $$SELECT cron_verify_comments()$$
);
```

### Validar agendamento:

```sql
-- Ver cron ativo
SELECT * FROM cron.job WHERE jobname = 'verify-youtube-comments';
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Execute na ordem:

### 1. Funções Anti-Spam existem?
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN ('can_comment_on_channel', 'verify_comment_and_apply_penalty', 'cron_verify_comments')
AND routine_schema = 'public';
```
**Esperado**: 3 funções retornadas

### 2. Função modificada foi aplicada?
```sql
SELECT verificar_novos_videos_youtube();
```
**Esperado**: JSON com success=true (verificar NOTICE logs para ver canais pulados)

### 3. Cron foi agendado?
```sql
SELECT jobname, schedule, command FROM cron.job
WHERE jobname = 'verify-youtube-comments';
```
**Esperado**: 1 linha retornada

### 4. Testar anti-spam diretamente (com novas validações)
```sql
-- Teste 1: Projeto válido com YouTube ativo
SELECT can_comment_on_channel('UCKU0u3VbuYn0wD3CUr-Yn6A', 117);
-- Esperado: TRUE ou FALSE (baseado em intervalo)

-- Teste 2: Projeto com YouTube desativado (deve bloquear)
-- Substitua 70 por ID de projeto com "Youtube Active" = FALSE
SELECT can_comment_on_channel('UCKU0u3VbuYn0wD3CUr-Yn6A', 70);
-- Esperado: FALSE

-- Teste 3: Projeto inexistente (deve dar EXCEPTION)
SELECT can_comment_on_channel('UCKU0u3VbuYn0wD3CUr-Yn6A', 99999);
-- Esperado: EXCEPTION 'Projeto ID 99999 não encontrado'
```
**Esperado**: Validações funcionando conforme acima

### 5. Testar verificação manual
```sql
SELECT cron_verify_comments();
```
**Esperado**: JSON com verified, deleted, errors

---

## 🧪 COMANDOS DE TESTE COMPLETO

```sql
-- 1. Ver quais canais podem comentar
SELECT
  c.channel_id,
  c."Nome",
  c.subscriber_count,
  can_comment_on_channel(c.channel_id, 77) as pode_comentar
FROM "Canais do youtube" c
JOIN "Canais do youtube_Projeto" cp ON cp."Canais do youtube_id" = c.id
WHERE cp."Projeto_id" = 77
ORDER BY cp.rank_position
LIMIT 10;

-- 2. Rodar verificação de novos vídeos (olhar NOTICE logs)
SELECT verificar_novos_videos_youtube();

-- 3. Verificar comentários deletados manualmente
SELECT cron_verify_comments();

-- 4. Ver canais blacklistados
SELECT "Nome", channel_id, auto_disabled_reason, comments_deleted_count
FROM "Canais do youtube"
WHERE auto_disabled_reason IS NOT NULL OR comments_deleted_count > 0;

-- 5. Ver histórico de execução do cron
SELECT * FROM cron.job_run_details
WHERE jobname = 'verify-youtube-comments'
ORDER BY start_time DESC
LIMIT 5;
```

---

## 🎯 ORDEM DE EXECUÇÃO

1. ✅ Executar TAREFA 1 (modificar função)
2. ✅ Validar checklist item 1
3. ✅ Validar checklist item 2
4. ✅ Executar TAREFA 2 (agendar cron)
5. ✅ Validar checklist item 3
6. ✅ Executar testes completos
7. ✅ Monitorar por 24h

---

## 🚨 SE ALGO DER ERRADO

### Reverter TAREFA 1:
```sql
-- Voltar versão sem anti-spam (arquivo original em /02_Descoberta/)
```

### Cancelar TAREFA 2:
```sql
SELECT cron.unschedule('verify-youtube-comments');
```

---

**Última atualização**: 2025-10-23
**Versão**: can_comment_on_channel V4 (8 validações COM subscription)
**Status**: SISTEMA 100% OPERACIONAL ✅

**Testes realizados:**
- ✅ `can_comment_on_channel` V4 com validação de subscription (2025-10-23)
- ✅ `verificar_novos_videos_youtube` executada 2x com intervalo de 17 minutos
- ✅ Lógica de intervalo de 30 minutos respeitada (0 canais processados na 2ª execução)
- ✅ Integração anti-spam funcionando perfeitamente
- ✅ `cron_verify_comments` agendado a cada 60 minutos

**Sistema Completo**:
1. ✅ TAREFA 1 (verificar_novos_videos_youtube com anti-spam)
2. ✅ TAREFA 2 (cron_verify_comments agendado)
3. ✅ UPGRADE V4 (validação de subscription ativa)
