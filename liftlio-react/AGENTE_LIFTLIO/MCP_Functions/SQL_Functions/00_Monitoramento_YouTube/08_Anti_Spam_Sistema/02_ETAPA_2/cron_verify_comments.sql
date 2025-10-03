-- =============================================
-- Função: cron_verify_comments
-- Descrição: CRON que verifica comentários periodicamente
--            e detecta deleções automaticamente
-- Criado: 2025-10-03
-- Atualizado: 2025-10-03 (correção filtro Youtube Active)
-- Roda: A cada 1 hora
-- Etapa: 2 - Detecção Automática
-- =============================================

DROP FUNCTION IF EXISTS cron_verify_comments();

CREATE OR REPLACE FUNCTION cron_verify_comments()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_message RECORD;
  v_result JSONB;
  v_verified_count INTEGER := 0;
  v_deleted_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_max_per_run INTEGER := 50; -- Limite para não sobrecarregar API
BEGIN
  -- Buscar mensagens que precisam verificação
  -- Cronograma: 1h, 6h, 24h, 3d, 7d, 14d após postagem
  FOR v_message IN
    SELECT
      m.id,
      m.youtube_comment_id,
      m.created_at,
      COALESCE(m.verification_count, 0) as verification_count,
      m.project_id,
      p."Youtube Active" as youtube_active,
      i.ativo as integration_active
    FROM "Mensagens" m
    JOIN "Projeto" p ON m.project_id = p.id
    LEFT JOIN "Integrações" i ON p."Integrações" = i.id
    WHERE m.youtube_comment_id IS NOT NULL
      AND m.respondido = TRUE
      AND COALESCE(m.still_exists, TRUE) = TRUE
      AND COALESCE(m.verification_count, 0) < 6
      -- ✅ CORREÇÃO: Youtube Active em vez de status
      AND p."Youtube Active" = TRUE
      -- ✅ VERIFICAÇÃO: Integração existe e está ativa
      AND i.id IS NOT NULL
      AND i.ativo = TRUE
      AND (
        -- 1ª verificação: 1 hora depois
        (m.verification_count IS NULL OR m.verification_count = 0)
        AND m.created_at <= NOW() - INTERVAL '1 hour'
        OR
        -- 2ª verificação: 6 horas depois
        m.verification_count = 1
        AND m.created_at <= NOW() - INTERVAL '6 hours'
        OR
        -- 3ª verificação: 24 horas depois
        m.verification_count = 2
        AND m.created_at <= NOW() - INTERVAL '24 hours'
        OR
        -- 4ª verificação: 3 dias depois
        m.verification_count = 3
        AND m.created_at <= NOW() - INTERVAL '3 days'
        OR
        -- 5ª verificação: 7 dias depois
        m.verification_count = 4
        AND m.created_at <= NOW() - INTERVAL '7 days'
        OR
        -- 6ª verificação: 14 dias depois (última)
        m.verification_count = 5
        AND m.created_at <= NOW() - INTERVAL '14 days'
      )
    ORDER BY m.created_at ASC
    LIMIT v_max_per_run
  LOOP
    BEGIN
      -- Chamar função de verificação e penalidade
      v_result := verify_comment_and_apply_penalty(v_message.id);

      -- Contar resultados
      IF v_result->>'success' = 'true' THEN
        v_verified_count := v_verified_count + 1;

        -- Se comentário foi deletado
        IF v_result->>'still_exists' = 'false' THEN
          v_deleted_count := v_deleted_count + 1;

          RAISE NOTICE 'Comentário DELETADO detectado: message_id=%, canal foi penalizado',
            v_message.id;
        END IF;
      ELSE
        v_error_count := v_error_count + 1;
        RAISE NOTICE 'Erro ao verificar message_id=%: %',
          v_message.id, v_result->>'error';
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      RAISE NOTICE 'Exceção ao verificar message_id=%: %',
        v_message.id, SQLERRM;
    END;
  END LOOP;

  -- Retornar estatísticas
  RETURN jsonb_build_object(
    'success', true,
    'verified', v_verified_count,
    'deleted', v_deleted_count,
    'errors', v_error_count,
    'max_per_run', v_max_per_run,
    'timestamp', NOW()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'verified', v_verified_count,
    'deleted', v_deleted_count,
    'errors', v_error_count,
    'timestamp', NOW()
  );
END;
$$;

-- =============================================
-- COMENTÁRIOS:
-- =============================================

/*
CRONOGRAMA DE VERIFICAÇÕES:

Comentário postado: 2025-10-03 10:00
  ├─ 11:00 (1h)    → verification_count = 0 → 1ª verificação
  ├─ 16:00 (6h)    → verification_count = 1 → 2ª verificação
  ├─ 10:00 +1d     → verification_count = 2 → 3ª verificação
  ├─ 10:00 +3d     → verification_count = 3 → 4ª verificação
  ├─ 10:00 +7d     → verification_count = 4 → 5ª verificação
  └─ 10:00 +14d    → verification_count = 5 → 6ª e última

VERIFICAÇÕES DE SEGURANÇA:

✅ Projeto."Youtube Active" = TRUE (CORRIGIDO 2025-10-03)
  - Só verifica comentários de projetos com YouTube ativo
  - Evita processar projetos sem YouTube habilitado

✅ Integrações.id IS NOT NULL
  - Verifica se projeto tem integração cadastrada
  - Usa LEFT JOIN para segurança

✅ Integrações.ativo = TRUE
  - Só verifica se integração YouTube está ativa
  - Evita erros com integrações desativadas/banidas

LIMITE DE PROCESSAMENTO:

- Máximo 50 comentários por execução
- Evita sobrecarregar YouTube API
- CRON roda a cada 1h → 50/hora = 1.200/dia

INTEGRAÇÃO COM ETAPA 1:

- Se detectar deleção → preenche auto_disabled_reason
- can_comment_on_channel() vê e bloqueia automaticamente
- Sistema completo funcionando!
*/

-- =============================================
-- CONFIGURAR CRON NO SUPABASE:
-- =============================================

/*
-- No Supabase Dashboard → Database → Cron Jobs:

SELECT cron.schedule(
  'verify-youtube-comments',     -- Nome do job
  '0 * * * *',                   -- A cada 1 hora (minuto 0)
  $$SELECT cron_verify_comments()$$
);

-- Para ver jobs ativos:
SELECT * FROM cron.job;

-- Para desabilitar:
SELECT cron.unschedule('verify-youtube-comments');

-- Para ver histórico:
SELECT * FROM cron.job_run_details
WHERE jobname = 'verify-youtube-comments'
ORDER BY start_time DESC
LIMIT 10;
*/

-- =============================================
-- TESTES:
-- =============================================

/*
-- Teste 1: Rodar manualmente
SELECT cron_verify_comments();

-- Resultado esperado:
{
  "success": true,
  "verified": 8,
  "deleted": 1,
  "errors": 0,
  "max_per_run": 50,
  "timestamp": "2025-10-03T15:30:00Z"
}

-- Teste 2: Ver mensagens verificadas recentemente
SELECT
  id,
  youtube_comment_id,
  created_at,
  last_verified_at,
  verification_count,
  still_exists,
  deleted_at
FROM "Mensagens"
WHERE last_verified_at >= NOW() - INTERVAL '1 hour'
ORDER BY last_verified_at DESC;

-- Teste 3: Ver canais blacklistados
SELECT
  "Nome",
  channel_id,
  auto_disabled_reason,
  comments_deleted_count
FROM "Canais do youtube"
WHERE auto_disabled_reason IS NOT NULL
  OR comments_deleted_count > 0;
*/
