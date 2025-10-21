-- =============================================
-- Função: can_comment_on_channel (V3 - COMPLETA COM VALIDAÇÕES DE PROJETO)
-- Descrição: Versão completa com 7 camadas de validação:
--   1. Projeto existe
--   2. YouTube ativo no projeto ("Youtube Active" = TRUE)
--   3. Integração válida (integracao_valida = TRUE)
--   4. Canal não desativado manualmente
--   5. Canal não blacklistado
--   6. Canal ativo no sistema
--   7. Intervalo mínimo respeitado (7-14 dias)
--
-- Criado: 2025-10-03
-- Atualizado: 2025-10-21 (validações de projeto + integração)
-- Etapa: 1 - Proteção por Frequência
-- =============================================

DROP FUNCTION IF EXISTS public.can_comment_on_channel(text, bigint);

CREATE OR REPLACE FUNCTION public.can_comment_on_channel(
  p_channel_id_youtube TEXT,  -- ID do canal no YouTube (ex: "UCxxxx")
  p_project_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_projeto_youtube_active BOOLEAN;
  v_projeto_integracao_valida BOOLEAN;
  v_canal_db_id BIGINT;
  v_canal_is_active BOOLEAN;
  v_canal_desativado_pelo_user BOOLEAN;
  v_canal_auto_disabled_reason TEXT;
  v_subscriber_count INTEGER;
  v_last_comment_date TIMESTAMPTZ;
  v_days_since_last_comment NUMERIC;
  v_required_days INTEGER;
BEGIN
  -- =============================================
  -- VALIDAÇÃO 1, 2, 3: Projeto existe + YouTube ativo + Integração válida
  -- =============================================
  SELECT
    COALESCE(p."Youtube Active", FALSE),
    COALESCE(p.integracao_valida, FALSE)
  INTO
    v_projeto_youtube_active,
    v_projeto_integracao_valida
  FROM "Projeto" p
  WHERE p.id = p_project_id;

  -- Se projeto não existe, lança exceção
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Projeto ID % não encontrado', p_project_id;
  END IF;

  -- Se YouTube não está ativo no projeto, bloqueia
  IF v_projeto_youtube_active = FALSE THEN
    RAISE LOG 'Projeto ID % bloqueado - YouTube não está ativo', p_project_id;
    RETURN FALSE;
  END IF;

  -- Se integração não está válida, bloqueia
  IF v_projeto_integracao_valida = FALSE THEN
    RAISE LOG 'Projeto ID % bloqueado - Integração não está válida', p_project_id;
    RETURN FALSE;
  END IF;

  -- =============================================
  -- VALIDAÇÃO 4, 5, 6: Buscar informações do canal
  -- =============================================
  SELECT
    c.id,
    COALESCE(c.is_active, FALSE),
    COALESCE(c.desativado_pelo_user, FALSE),
    c.auto_disabled_reason,
    COALESCE(c.subscriber_count, 0)
  INTO
    v_canal_db_id,
    v_canal_is_active,
    v_canal_desativado_pelo_user,
    v_canal_auto_disabled_reason,
    v_subscriber_count
  FROM "Canais do youtube" c
  WHERE c.channel_id = p_channel_id_youtube
    AND c."Projeto" = p_project_id;

  -- Se canal não existe na tabela, PODE comentar (ainda não foi adicionado)
  IF NOT FOUND THEN
    RAISE LOG 'Canal YouTube % aprovado - não está na tabela (novo)', p_channel_id_youtube;
    RETURN TRUE;
  END IF;

  -- Verificar se canal está ativo no sistema
  IF v_canal_is_active = FALSE THEN
    RAISE LOG 'Canal % bloqueado - is_active=FALSE', p_channel_id_youtube;
    RETURN FALSE;
  END IF;

  -- Verificar desativação manual
  IF v_canal_desativado_pelo_user = TRUE THEN
    RAISE LOG 'Canal % bloqueado - desativado pelo usuário', p_channel_id_youtube;
    RETURN FALSE;
  END IF;

  -- Verificar blacklist automática (será preenchido pela ETAPA 2)
  IF v_canal_auto_disabled_reason IS NOT NULL THEN
    RAISE LOG 'Canal % bloqueado - blacklist: %', p_channel_id_youtube, v_canal_auto_disabled_reason;
    RETURN FALSE;
  END IF;

  -- =============================================
  -- VALIDAÇÃO 7: Intervalo mínimo desde último comentário
  -- =============================================
  -- Buscar última data de comentário neste canal
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
    RAISE LOG 'Canal % aprovado - nunca comentou', p_channel_id_youtube;
    RETURN TRUE;
  END IF;

  -- Calcular dias desde último comentário
  v_days_since_last_comment := EXTRACT(EPOCH FROM (NOW() - v_last_comment_date)) / 86400;

  -- Determinar dias necessários baseado no tamanho do canal
  IF v_subscriber_count < 10000 THEN
    v_required_days := 14; -- Canal pequeno: mais cuidado
  ELSIF v_subscriber_count < 100000 THEN
    v_required_days := 10; -- Canal médio: cuidado moderado
  ELSE
    v_required_days := 7;  -- Canal grande: menos suspeito
  END IF;

  -- Comparar e decidir
  IF v_days_since_last_comment >= v_required_days THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro em can_comment_on_channel: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.can_comment_on_channel(TEXT, BIGINT) IS
'Verifica se pode comentar em canal com 7 validações: projeto (YouTube ativo + integração válida), canal (não desativado, is_active=true), intervalo mínimo (7-14 dias baseado em subs)';

-- =============================================
-- EXPLICAÇÃO DAS 7 VALIDAÇÕES:
-- =============================================

/*
CAMADA 1: PROJETO EXISTE
- Query busca projeto na tabela "Projeto"
- Se NOT FOUND → EXCEPTION (força quem chama a corrigir o bug)

CAMADA 2: YOUTUBE ATIVO NO PROJETO
- Campo "Youtube Active" deve ser TRUE
- Se FALSE → retorna FALSE (projeto não usa YouTube)

CAMADA 3: INTEGRAÇÃO VÁLIDA
- Campo integracao_valida deve ser TRUE
- Se FALSE → retorna FALSE (integração desativada/expirada)

CAMADA 4: CANAL NÃO DESATIVADO MANUALMENTE
- Campo desativado_pelo_user deve ser FALSE
- Se TRUE → retorna FALSE (usuário desativou manualmente)

CAMADA 5: CANAL NÃO BLACKLISTADO
- Campo auto_disabled_reason deve ser NULL
- Se NOT NULL → retorna FALSE (ETAPA 2 detectou deleções)

CAMADA 6: CANAL ATIVO NO SISTEMA
- Campo is_active deve ser TRUE
- Se FALSE → retorna FALSE (sistema desativou por inatividade)

CAMADA 7: INTERVALO MÍNIMO RESPEITADO
- Busca última mensagem do projeto neste canal (híbrido: suporta campo novo e antigo)
- Calcula dias desde última mensagem
- Compara com intervalo necessário:
  * < 10k subs: 14 dias
  * 10k-100k: 10 dias
  * > 100k: 7 dias
- Se passou o intervalo → TRUE, senão → FALSE

VERSÃO HÍBRIDA (CAMADA 7):
WHERE (v.canal = v_canal_db_id OR v.channel_id_yotube = p_channel_id_youtube)
        ↑                            ↑
    Padrão NOVO                  Padrão ANTIGO
  (vídeos recentes)            (vídeos antigos)

RESULTADO:
✅ Funciona com vídeos NOVOS (campo "canal" preenchido)
✅ Funciona com vídeos ANTIGOS (campo "canal" NULL)
✅ Compatibilidade total com histórico completo!
*/

-- =============================================
-- TESTES:
-- =============================================

/*
-- Teste 1: Projeto válido com YouTube ativo
SELECT can_comment_on_channel('UCKU0u3VbuYn0wD3CUr-Yn6A', 117);
-- Esperado: TRUE ou FALSE (baseado em intervalo)

-- Teste 2: Projeto com YouTube desativado
SELECT can_comment_on_channel('UCKU0u3VbuYn0wD3CUr-Yn6A', 70);
-- Esperado: FALSE (YouTube não ativo)

-- Teste 3: Projeto com integração inválida
SELECT can_comment_on_channel('UCKU0u3VbuYn0wD3CUr-Yn6A', 71);
-- Esperado: FALSE (integração inválida)

-- Teste 4: Projeto inexistente
SELECT can_comment_on_channel('UCKU0u3VbuYn0wD3CUr-Yn6A', 99999);
-- Esperado: EXCEPTION 'Projeto ID 99999 não encontrado'

-- Teste 5: Ver todos os canais e status
SELECT
  c.channel_id,
  c."Nome",
  c.subscriber_count,
  can_comment_on_channel(c.channel_id, 117) as pode_comentar,
  (
    SELECT MAX(m.created_at)
    FROM "Mensagens" m
    JOIN "Videos" v ON m.video = v.id
    WHERE (v.canal = c.id OR v.channel_id_yotube = c.channel_id)
      AND m.project_id = 117
      AND m.respondido = TRUE
  ) as ultimo_comentario
FROM "Canais do youtube" c
WHERE c."Projeto" = 117
ORDER BY ultimo_comentario DESC NULLS LAST
LIMIT 10;
*/
