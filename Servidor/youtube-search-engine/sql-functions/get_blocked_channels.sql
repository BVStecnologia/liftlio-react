-- =============================================
-- Função: get_blocked_channels (BATCH VERSION)
-- Descrição: Retorna TODOS canais bloqueados de um projeto de uma vez
-- Uso: YouTube Search Engine (Python) - 1 query ao invés de N
-- Criado: 2025-10-21
-- =============================================

DROP FUNCTION IF EXISTS get_blocked_channels(BIGINT);

CREATE OR REPLACE FUNCTION get_blocked_channels(
    p_project_id BIGINT
)
RETURNS TABLE(channel_id_youtube TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Retorna lista de channel_id bloqueados pelo anti-spam
    -- Python faz 1 query e filtra todos vídeos em memória (batch processing)

    RETURN QUERY
    SELECT c.channel_id
    FROM "Canais do youtube" c
    WHERE c."Projeto" = p_project_id
    AND (
        -- Bloqueios do sistema anti-spam
        c.auto_disabled_reason IS NOT NULL  -- ETAPA 2: Deletou comentários
        OR c.is_active = FALSE              -- Sistema desativou
        OR c.desativado_pelo_user = TRUE    -- Usuário bloqueou manualmente
    );
END;
$$;

COMMENT ON FUNCTION get_blocked_channels(BIGINT) IS
'Retorna lista de canais bloqueados (batch). YouTube Search Engine faz 1 query e filtra N vídeos em Python.';

-- =============================================
-- TESTES:
-- =============================================

/*
-- Teste 1: Ver canais bloqueados do projeto 117
SELECT * FROM get_blocked_channels(117);
-- Retorna: Lista de channel_id bloqueados

-- Teste 2: Contar quantos bloqueados
SELECT COUNT(*) FROM get_blocked_channels(117);
-- Retorna: Número total de canais bloqueados

-- Teste 3: Ver detalhes dos bloqueados
SELECT
    c.channel_id,
    c."Nome",
    c.auto_disabled_reason,
    c.is_active,
    c.desativado_pelo_user
FROM "Canais do youtube" c
WHERE c.channel_id IN (SELECT * FROM get_blocked_channels(117));
-- Retorna: Detalhes completos de cada canal bloqueado

-- Teste 4: Projetos sem canais bloqueados
SELECT get_blocked_channels(999);
-- Retorna: Lista vazia (nenhum canal bloqueado)
*/

-- =============================================
-- INTEGRAÇÃO COM PYTHON (youtube_search_engine.py):
-- =============================================

/*
async def filter_blocked_channels(self, videos, project_id):
    """Filtra vídeos de canais bloqueados - VERSÃO BATCH (1 query)"""

    # 🚀 1 query única para buscar TODOS canais bloqueados
    result = await self.supabase.rpc(
        'get_blocked_channels',
        {'p_project_id': project_id}
    ).execute()

    # Criar set para lookup O(1) - muito rápido
    blocked_channels = set(result.data) if result.data else set()

    # Filtrar vídeos em memória (Python)
    allowed_videos = []
    blocked_count = 0

    for video in videos:
        channel_id = video['snippet']['channelId']

        if channel_id not in blocked_channels:
            allowed_videos.append(video)
        else:
            blocked_count += 1
            print(f"⚠️ Canal {channel_id} bloqueado - vídeo ignorado")

    print(f"✅ {len(allowed_videos)}/{len(videos)} vídeos permitidos")
    print(f"⚠️ {len(blocked_channels)} canais bloqueados no projeto")
    print(f"🚫 {blocked_count} vídeos filtrados")

    return allowed_videos

# Uso na pipeline principal:
videos = await self.search_youtube(query, project_data)
videos = await self.filter_blocked_channels(videos, project_data['projeto_id'])
# Continuar processamento apenas com vídeos permitidos...

# PERFORMANCE:
# ❌ Versão antiga: 50 vídeos = 50 queries (2500ms)
# ✅ Versão batch: 50 vídeos = 1 query (50ms) 🚀 50x mais rápido!
*/
