-- =============================================
-- Função: verify_comment_and_apply_penalty
-- Descrição: Verifica se comentário YouTube ainda existe
--            e aplica penalidade automática se deletado
-- Criado: 2025-10-03
-- Etapa: 2 - Detecção Automática
-- =============================================

DROP FUNCTION IF EXISTS verify_comment_and_apply_penalty(BIGINT);

CREATE OR REPLACE FUNCTION verify_comment_and_apply_penalty(
  p_message_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_youtube_comment_id TEXT;
  v_canal_id BIGINT;
  v_canal_channel_id TEXT;
  v_message_created_at TIMESTAMPTZ;
  v_verification_count INTEGER;
  v_still_exists BOOLEAN;
  v_hours_since_posted NUMERIC;
  v_current_deleted_count INTEGER;
  v_blacklist_reason TEXT;
  v_api_response JSONB;
  v_api_key TEXT;
BEGIN
  -- 1. Buscar informações da mensagem
  SELECT
    m.youtube_comment_id,
    COALESCE(v.canal, c.id) as canal_id,
    c.channel_id,
    m.created_at,
    COALESCE(m.verification_count, 0)
  INTO
    v_youtube_comment_id,
    v_canal_id,
    v_canal_channel_id,
    v_message_created_at,
    v_verification_count
  FROM "Mensagens" m
  LEFT JOIN "Videos" v ON m.video = v.id
  LEFT JOIN "Canais do youtube" c ON (v.canal = c.id OR v.channel_id_yotube = c.channel_id)
  WHERE m.id = p_message_id;

  -- Se mensagem não existe
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Mensagem não encontrada',
      'message_id', p_message_id
    );
  END IF;

  -- Se não tem youtube_comment_id
  IF v_youtube_comment_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Mensagem não tem youtube_comment_id',
      'message_id', p_message_id
    );
  END IF;

  -- 2. Calcular horas desde postagem
  v_hours_since_posted := EXTRACT(EPOCH FROM (NOW() - v_message_created_at)) / 3600;

  -- 3. Buscar API key do Vault (mesmo padrão de get_youtube_api_key)
  v_api_key := get_secret('Youtube Key');

  IF v_api_key IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'YouTube API key not found in vault',
      'message_id', p_message_id
    );
  END IF;

  -- 4. Chamar YouTube API para verificar se comentário existe
  -- Usa extensão http do Supabase
  BEGIN
    SELECT content::jsonb INTO v_api_response
    FROM http((
      'GET',
      'https://www.googleapis.com/youtube/v3/comments?id=' || v_youtube_comment_id || '&key=' || v_api_key,
      ARRAY[http_header('Content-Type', 'application/json')],
      NULL,
      NULL
    )::http_request);

    -- Verificar se comentário existe na resposta
    -- Se items array está vazio ou não existe, comentário foi deletado
    IF v_api_response->'items' IS NULL OR jsonb_array_length(v_api_response->'items') = 0 THEN
      v_still_exists := FALSE;
    ELSE
      v_still_exists := TRUE;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Se erro na API, assume que comentário ainda existe (não penaliza por erro de API)
    v_still_exists := TRUE;
    RAISE NOTICE 'Erro ao chamar YouTube API: %', SQLERRM;
  END;

  -- 5. Atualizar registro da mensagem
  UPDATE "Mensagens"
  SET
    last_verified_at = NOW(),
    verification_count = v_verification_count + 1,
    still_exists = v_still_exists,
    deleted_at = CASE WHEN v_still_exists = FALSE THEN NOW() ELSE deleted_at END
  WHERE id = p_message_id;

  -- 6. SE comentário foi deletado, aplicar penalidades
  IF v_still_exists = FALSE THEN
    -- Buscar contador atual de deleções do canal
    SELECT COALESCE(comments_deleted_count, 0)
    INTO v_current_deleted_count
    FROM "Canais do youtube"
    WHERE id = v_canal_id;

    -- Incrementar contador de deleções
    UPDATE "Canais do youtube"
    SET comments_deleted_count = v_current_deleted_count + 1
    WHERE id = v_canal_id;

    -- Determinar motivo de blacklist baseado em timing e padrão
    IF v_hours_since_posted < 1 THEN
      v_blacklist_reason := 'Bot detection - comentário deletado em menos de 1h (filtro automático YouTube)';
    ELSIF v_hours_since_posted < 24 THEN
      v_blacklist_reason := format('Dono rejeita - comentário deletado em %.1f horas', v_hours_since_posted);
    ELSIF (v_current_deleted_count + 1) >= 2 THEN
      v_blacklist_reason := format('Padrão de rejeição - %s deleções detectadas', v_current_deleted_count + 1);
    ELSE
      -- Deleção tardia (>24h) mas primeira vez - não blacklista ainda
      v_blacklist_reason := NULL;
    END IF;

    -- Aplicar blacklist se houver motivo
    IF v_blacklist_reason IS NOT NULL THEN
      UPDATE "Canais do youtube"
      SET auto_disabled_reason = v_blacklist_reason
      WHERE id = v_canal_id;

      RAISE NOTICE 'Canal % BLACKLISTADO: %', v_canal_channel_id, v_blacklist_reason;
    END IF;

    -- Retornar resultado (comentário deletado)
    RETURN jsonb_build_object(
      'success', true,
      'message_id', p_message_id,
      'youtube_comment_id', v_youtube_comment_id,
      'still_exists', false,
      'deleted_at', NOW(),
      'hours_since_posted', ROUND(v_hours_since_posted, 1),
      'verification_count', v_verification_count + 1,
      'deleted_count_total', v_current_deleted_count + 1,
      'blacklist_applied', v_blacklist_reason IS NOT NULL,
      'blacklist_reason', v_blacklist_reason
    );
  ELSE
    -- Retornar resultado (comentário ainda existe)
    RETURN jsonb_build_object(
      'success', true,
      'message_id', p_message_id,
      'youtube_comment_id', v_youtube_comment_id,
      'still_exists', true,
      'hours_since_posted', ROUND(v_hours_since_posted, 1),
      'verification_count', v_verification_count + 1
    );
  END IF;
END;
$$;

-- =============================================
-- COMENTÁRIOS E EXPLICAÇÕES:
-- =============================================

/*
LÓGICA DE BLACKLIST:

1. < 1 hora (filtro automático):
   - YouTube detectou como spam automaticamente
   - BLACKLIST IMEDIATO

2. < 24 horas (dono ativo):
   - Dono do canal viu e deletou rapidamente
   - Indica que canal monitora e rejeita comentários
   - BLACKLIST IMEDIATO

3. >= 2 deleções (padrão):
   - Canal já deletou 2+ comentários nossos
   - Padrão claro de rejeição
   - BLACKLIST IMEDIATO

4. > 24 horas (deleção tardia):
   - Primeira deleção: NÃO blacklista (pode ser acidente)
   - Segunda deleção: BLACKLIST (confirma padrão)

INTEGRAÇÃO COM ETAPA 1:
- Campo auto_disabled_reason é verificado por can_comment_on_channel()
- Se preenchido → retorna FALSE (não comenta mais)
- Sistema completo funciona automaticamente!
*/

-- =============================================
-- DEPENDÊNCIAS:
-- =============================================

/*
EXTENSÕES NECESSÁRIAS:
- http (para chamar YouTube API)
  CREATE EXTENSION IF NOT EXISTS http;

SECRETS NO VAULT:
- 'Youtube Key' (chave de API do YouTube) - JÁ EXISTE ✅
  Acessada via: get_secret('Youtube Key')

COLUNAS NECESSÁRIAS:
- Mensagens: last_verified_at, verification_count, still_exists, deleted_at
- Canais do youtube: comments_deleted_count, auto_disabled_reason
*/

-- =============================================
-- TESTES:
-- =============================================

/*
-- Teste 1: Verificar comentário que ainda existe
SELECT verify_comment_and_apply_penalty(12345);
-- Esperado: {"still_exists": true, "verification_count": 1}

-- Teste 2: Verificar comentário deletado (simular deletando manualmente no YouTube)
SELECT verify_comment_and_apply_penalty(12345);
-- Esperado: {"still_exists": false, "blacklist_applied": true}

-- Teste 3: Ver canais blacklistados
SELECT
  "Nome",
  channel_id,
  auto_disabled_reason,
  comments_deleted_count
FROM "Canais do youtube"
WHERE auto_disabled_reason IS NOT NULL;

-- Teste 4: Ver mensagens verificadas
SELECT
  id,
  youtube_comment_id,
  last_verified_at,
  verification_count,
  still_exists,
  deleted_at
FROM "Mensagens"
WHERE last_verified_at IS NOT NULL
ORDER BY last_verified_at DESC
LIMIT 10;
*/
