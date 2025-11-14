-- =============================================
-- Trigger: trigger_video_curation (ASYNC com dblink)
-- Descrição: Dispara curadoria de comentários de forma ASSÍNCRONA usando dblink
-- Criado: 2025-11-12
-- Atualizado: 2025-11-13 - Implementado fire-and-forget com dblink
-- Tabela: Videos (38 colunas existentes)
-- Extensão: dblink v1.2 (já instalada no Supabase)
-- =============================================
--
-- COMO FUNCIONA:
-- 1. UPDATE "Videos" SET curadoria_trigger = 1 WHERE id = X
-- 2. Trigger dispara dblink_send_query (ASYNC)
-- 3. Trigger retorna IMEDIATAMENTE (~10ms)
-- 4. curate_comments_with_claude roda em background (~90s)
-- 5. Campo curadoria_trigger volta para NULL automaticamente
--
-- =============================================

-- PASSO 1: Remover trigger e função antigos
DROP TRIGGER IF EXISTS trigger_video_curation ON "Videos" CASCADE;
DROP TRIGGER IF EXISTS trigger_async_video_curation ON "Videos" CASCADE;
DROP TRIGGER IF EXISTS trigger_async_curation ON "Videos" CASCADE;

DROP FUNCTION IF EXISTS public.trigger_video_curation_function() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_async_curation() CASCADE;

-- PASSO 2: Criar campo curadoria_trigger (se não existir)
ALTER TABLE "Videos"
ADD COLUMN IF NOT EXISTS curadoria_trigger INTEGER DEFAULT NULL;

-- PASSO 3: Habilitar extensão dblink (já vem instalada no Supabase)
CREATE EXTENSION IF NOT EXISTS dblink;

-- PASSO 4: Criar função do trigger com dblink async
CREATE OR REPLACE FUNCTION public.trigger_async_dblink_curation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_conn_name TEXT;
    v_conn_string TEXT;
    v_query TEXT;
BEGIN
    -- Só dispara quando curadoria_trigger muda para 1
    IF NEW.curadoria_trigger = 1 AND
       (OLD.curadoria_trigger IS NULL OR OLD.curadoria_trigger <> 1) THEN

        -- Validações
        IF NEW.comentarios_atualizados IS NOT TRUE THEN
            RAISE NOTICE 'Vídeo % sem comentários atualizados', NEW.id;
            UPDATE "Videos" SET curadoria_trigger = NULL WHERE id = NEW.id;
            RETURN NEW;
        END IF;

        IF NEW.comment_count IS NULL OR NEW.comment_count = 0 THEN
            RAISE NOTICE 'Vídeo % sem comentários', NEW.id;
            UPDATE "Videos" SET curadoria_trigger = NULL WHERE id = NEW.id;
            RETURN NEW;
        END IF;

        -- Nome único da conexão (evita conflitos)
        v_conn_name := 'async_curate_' || NEW.id || '_' || extract(epoch from now())::bigint;

        -- Connection string (localhost = mesma database)
        v_conn_string := format('dbname=%s', current_database());

        -- Query que vai rodar em background
        v_query := format('SELECT curate_comments_with_claude(%s)', NEW.id);

        BEGIN
            -- 1. Conecta
            PERFORM dblink_connect(v_conn_name, v_conn_string);

            -- 2. Envia query (NÃO espera resposta = async!)
            PERFORM dblink_send_query(v_conn_name, v_query);

            -- 3. Desconecta (query continua rodando em background!)
            PERFORM dblink_disconnect(v_conn_name);

            RAISE NOTICE '🚀 Curadoria async disparada para vídeo % (%)', NEW.id, NEW."VIDEO";

        EXCEPTION WHEN OTHERS THEN
            -- Se falhar, tenta desconectar
            BEGIN
                PERFORM dblink_disconnect(v_conn_name);
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;

            RAISE WARNING '❌ Erro ao disparar curadoria async para vídeo %: %', NEW.id, SQLERRM;
        END;

        -- Limpa campo curadoria_trigger (marca como processado)
        UPDATE "Videos" SET curadoria_trigger = NULL WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

-- PASSO 5: Criar trigger
CREATE TRIGGER trigger_async_dblink_curation
    AFTER UPDATE OF curadoria_trigger ON "Videos"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_async_dblink_curation();

-- =============================================
-- INSTRUÇÕES DE USO:
-- =============================================
--
-- 📋 SETUP (executar UMA VEZ):
-- Cole todo este arquivo no SQL Editor do Supabase e execute.
--
-- 🚀 DISPARAR CURADORIA:
--
-- Para um vídeo:
UPDATE "Videos"
SET curadoria_trigger = 1
WHERE id = 28638;

-- Para múltiplos vídeos:
UPDATE "Videos"
SET curadoria_trigger = 1
WHERE id IN (28638, 28640, 28641);

-- Para todos com comentários:
UPDATE "Videos"
SET curadoria_trigger = 1
WHERE comentarios_atualizados = TRUE
AND comment_count > 5
AND curadoria_trigger IS NULL;

-- 🔍 VERIFICAR RESULTADOS:
--
-- Checar se campo foi limpo (deve estar NULL):
SELECT id, "VIDEO", curadoria_trigger, comment_count
FROM "Videos"
WHERE id = 28638;

-- Ver comentários mantidos após curadoria:
SELECT
    v.id,
    v."VIDEO",
    v.comment_count as total_original,
    COUNT(cp.id) as comentarios_mantidos,
    ROUND((COUNT(cp.id)::numeric / NULLIF(v.comment_count, 0) * 100), 1) as percentual_mantido
FROM "Videos" v
LEFT JOIN "Comentarios_Principais" cp ON cp.video_id = v.id
WHERE v.id = 28638
GROUP BY v.id, v."VIDEO", v.comment_count;

-- Ver quais comentários foram marcados como LED:
SELECT
    id,
    text_display,
    like_count,
    led,
    lead_score
FROM "Comentarios_Principais"
WHERE video_id = 28638
ORDER BY like_count DESC;

-- 📊 MONITORAMENTO:
--
-- Ver vídeos aguardando curadoria:
SELECT id, "VIDEO", comment_count, curadoria_trigger
FROM "Videos"
WHERE curadoria_trigger = 1
ORDER BY id DESC;

-- Ver últimos vídeos curados (curadoria_trigger foi NULL recentemente):
SELECT
    v.id,
    v."VIDEO",
    v.comment_count,
    COUNT(cp.id) as comentarios_mantidos
FROM "Videos" v
LEFT JOIN "Comentarios_Principais" cp ON cp.video_id = v.id
WHERE v.comentarios_atualizados = TRUE
AND v.curadoria_trigger IS NULL
GROUP BY v.id, v."VIDEO", v.comment_count
ORDER BY v.id DESC
LIMIT 10;

-- =============================================
-- NOTAS TÉCNICAS:
-- =============================================
-- ✅ Trigger completa em ~10ms (não bloqueia!)
-- ✅ curate_comments_with_claude roda em background via dblink
-- ✅ Campo curadoria_trigger auto-limpa para NULL
-- ✅ dblink usa conexão local (sem senha necessária)
-- ✅ Nome de conexão único evita conflitos
-- ⚠️ Fire-and-forget: sem feedback de erro da função async
-- ⚠️ DELETA comentários não curados (comportamento de curate_comments_with_claude)
-- ⚠️ Processo pode demorar ~30-90s dependendo do número de comentários
--
-- TROUBLESHOOTING:
-- - Se função não disparar: verificar se dblink está habilitado
-- - Se travar: verificar se não há locks na tabela Videos
-- - Se erro de permissão: função usa SECURITY DEFINER
-- =============================================

-- TESTE RÁPIDO:
-- UPDATE "Videos" SET curadoria_trigger = 1 WHERE id = 28638;
-- SELECT id, curadoria_trigger FROM "Videos" WHERE id = 28638; -- deve ser NULL