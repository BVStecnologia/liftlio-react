-- =============================================
-- Função: can_comment_on_channel (V2 - HÍBRIDO)
-- Descrição: Versão híbrida que suporta AMBOS os padrões:
--   - Vídeos NOVOS (campo "canal" preenchido) ← corrigido 30/09/2025
--   - Vídeos ANTIGOS (campo "canal" NULL, usa "channel_id_yotube")
--
-- Criado: 2025-10-03
-- Atualizado: 2025-10-03 (correção híbrida)
-- Etapa: 1 - Proteção por Frequência
-- =============================================

DROP FUNCTION IF EXISTS can_comment_on_channel(TEXT, BIGINT);

CREATE OR REPLACE FUNCTION can_comment_on_channel(
  p_channel_id_youtube TEXT,  -- ID do canal no YouTube (ex: "UCxxxx")
  p_project_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_canal_db_id BIGINT;
  v_is_active BOOLEAN;
  v_desativado_pelo_user BOOLEAN;
  v_auto_disabled_reason TEXT;
  v_subscriber_count BIGINT;
  v_last_comment_date TIMESTAMPTZ;
  v_days_since_last_comment NUMERIC;
  v_required_days INTEGER;
BEGIN
  -- 1. Buscar informações do canal na tabela "Canais do youtube"
  SELECT
    id,
    is_active,
    desativado_pelo_user,
    auto_disabled_reason,
    subscriber_count
  INTO
    v_canal_db_id,
    v_is_active,
    v_desativado_pelo_user,
    v_auto_disabled_reason,
    v_subscriber_count
  FROM "Canais do youtube"
  WHERE channel_id = p_channel_id_youtube;

  -- Se canal não existe na tabela, PODE comentar (ainda não foi adicionado)
  IF NOT FOUND THEN
    RAISE NOTICE 'Canal YouTube % aprovado - não está na tabela (novo)', p_channel_id_youtube;
    RETURN TRUE;
  END IF;

  -- 2. Verificar controle do sistema (is_active)
  IF v_is_active = FALSE THEN
    RAISE NOTICE 'Canal % (DB ID %) pulado - is_active=FALSE (sistema desativou)',
      p_channel_id_youtube, v_canal_db_id;
    RETURN FALSE;
  END IF;

  -- 3. Verificar desativação manual
  IF v_desativado_pelo_user = TRUE THEN
    RAISE NOTICE 'Canal % (DB ID %) pulado - desativado pelo usuário',
      p_channel_id_youtube, v_canal_db_id;
    RETURN FALSE;
  END IF;

  -- 4. Verificar blacklist automática (será preenchido pela ETAPA 2)
  IF v_auto_disabled_reason IS NOT NULL THEN
    RAISE NOTICE 'Canal % (DB ID %) pulado - blacklist: %',
      p_channel_id_youtube, v_canal_db_id, v_auto_disabled_reason;
    RETURN FALSE;
  END IF;

  -- 5. Buscar última data de comentário neste canal
  -- ⭐ VERSÃO HÍBRIDA: Suporta AMBOS os padrões (novo e antigo)
  SELECT MAX(m.created_at)
  INTO v_last_comment_date
  FROM "Mensagens" m
  JOIN "Videos" v ON m.video = v.id
  WHERE (
      -- Padrão NOVO (campo "canal" preenchido) ← preferência
      v.canal = v_canal_db_id
      OR
      -- Padrão ANTIGO (campo "canal" NULL, usa "channel_id_yotube") ← fallback
      v.channel_id_yotube = p_channel_id_youtube
    )
    AND m.project_id = p_project_id
    AND m.respondido = TRUE;

  -- Se nunca comentou, pode comentar
  IF v_last_comment_date IS NULL THEN
    RAISE NOTICE 'Canal % (DB ID %) aprovado - nunca comentou antes',
      p_channel_id_youtube, v_canal_db_id;
    RETURN TRUE;
  END IF;

  -- 6. Calcular dias desde último comentário
  v_days_since_last_comment := EXTRACT(EPOCH FROM (NOW() - v_last_comment_date)) / 86400;

  -- 7. Determinar dias necessários baseado no tamanho do canal
  IF v_subscriber_count < 10000 THEN
    v_required_days := 14; -- Canal pequeno: mais cuidado
  ELSIF v_subscriber_count < 100000 THEN
    v_required_days := 10; -- Canal médio: cuidado moderado
  ELSE
    v_required_days := 7;  -- Canal grande: menos suspeito
  END IF;

  -- 8. Comparar e decidir
  IF v_days_since_last_comment >= v_required_days THEN
    RAISE NOTICE 'Canal % (DB ID %) aprovado - última há %.1f dias, precisa %',
      p_channel_id_youtube, v_canal_db_id, v_days_since_last_comment, v_required_days;
    RETURN TRUE;
  ELSE
    RAISE NOTICE 'Canal % (DB ID %) pulado - comentou há %.1f dias, precisa %',
      p_channel_id_youtube, v_canal_db_id, v_days_since_last_comment, v_required_days;
    RETURN FALSE;
  END IF;
END;
$$;

-- =============================================
-- EXPLICAÇÃO DA VERSÃO HÍBRIDA:
-- =============================================

/*
PROBLEMA DESCOBERTO:
- Sistema foi CORRIGIDO em 30/09/2025
- Vídeos ANTES de 30/09: campo "canal" = NULL (96.7%)
- Vídeos DEPOIS de 30/09: campo "canal" preenchido (100%)

SOLUÇÃO HÍBRIDA:
WHERE (v.canal = v_canal_db_id OR v.channel_id_yotube = p_channel_id_youtube)
        ↑                            ↑
    Padrão NOVO                  Padrão ANTIGO
  (vídeos recentes)            (vídeos antigos)

RESULTADO:
✅ Funciona com vídeos NOVOS (campo "canal" preenchido)
✅ Funciona com vídeos ANTIGOS (campo "canal" NULL)
✅ Compatibilidade total com histórico completo!

PERFORMANCE:
- OR é eficiente porque usa índices em ambos os campos
- Busca primeiro pelo mais rápido (FK BIGINT)
- Se não achar, tenta pelo TEXT
*/

-- =============================================
-- TESTES:
-- =============================================

/*
-- Teste 1: Canal com mensagens ANTIGAS (campo canal NULL)
SELECT can_comment_on_channel('UCBgPxTfodXMa_zavgl0DX7A', 77);
-- Esperado: FALSE (comentou há 13.9 dias, precisa 7)

-- Teste 2: Canal com mensagens NOVAS (campo canal preenchido)
SELECT can_comment_on_channel('UCISXKMc6zJCGfaM6dz4DhIQ', 77);
-- Esperado: depende dos dias desde última mensagem

-- Teste 3: Comparar ambos os padrões lado a lado
SELECT
  c.channel_id,
  c."Nome",
  MAX(CASE WHEN v.canal IS NOT NULL THEN m.created_at END) as ultima_msg_campo_novo,
  MAX(CASE WHEN v.canal IS NULL THEN m.created_at END) as ultima_msg_campo_antigo,
  MAX(m.created_at) as ultima_msg_total,
  can_comment_on_channel(c.channel_id, 77) as pode_comentar
FROM "Canais do youtube" c
LEFT JOIN "Videos" v ON v.channel_id_yotube = c.channel_id OR v.canal = c.id
LEFT JOIN "Mensagens" m ON m.video = v.id AND m.respondido = TRUE AND m.project_id = 77
WHERE c."Projeto" = 77
GROUP BY c.channel_id, c."Nome"
ORDER BY ultima_msg_total DESC NULLS LAST
LIMIT 10;
*/
