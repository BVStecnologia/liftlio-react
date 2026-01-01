-- =============================================
-- Função: get_project_metrics (REFATORADA V3)
-- Descrição: Retorna métricas dos 4 cards do Monitoring page
-- Data: 2025-10-24
-- Atualizado: 2026-01-01 - Corrigido para usar tabela Videos ao invés de videos_scanreados JSONB
-- Motivo: Campo videos_scanreados JSONB antigo não é mais atualizado pelo sistema novo
-- Validado: Projeto 117 (26 canais, 36 vídeos monitored, 15 aprovados, 1 hoje)
-- =============================================

DROP FUNCTION IF EXISTS get_project_metrics(INTEGER);

CREATE OR REPLACE FUNCTION get_project_metrics(
    p_project_id INTEGER
)
RETURNS TABLE (
    total_channels INTEGER,
    total_videos INTEGER,
    posts INTEGER,
    videos_today INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- CARD 1: CHANNELS (Canais Ativos) - COM FILTRO ANTI-SPAM
        (
            SELECT COUNT(*)::INTEGER
            FROM "Canais do youtube" c
            WHERE c."Projeto" = p_project_id
              AND (c.is_active = true OR c.is_active IS NULL)
              AND c.auto_disabled_reason IS NULL
              AND (c.desativado_pelo_user = false OR c.desativado_pelo_user IS NULL)
        ) as total_channels,

        -- CARD 2: ANALYZED (Total de vídeos na tabela Videos - monitored)
        (
            SELECT COUNT(*)::INTEGER
            FROM "Videos" v
            JOIN "Canais do youtube" c ON v.canal = c.id
            WHERE c."Projeto" = p_project_id
              AND v.monitored = true
        ) as total_videos,

        -- CARD 3: APPROVED (Vídeos High/Medium com mensagem criada)
        (
            SELECT COUNT(DISTINCT v.id)::INTEGER
            FROM "Videos" v
            JOIN "Canais do youtube" c ON v.canal = c.id
            LEFT JOIN "Mensagens" m ON m.video = v.id
            WHERE c."Projeto" = p_project_id
              AND v.monitored = true
              AND v.lead_potential IN ('High', 'Medium')
              AND m.id IS NOT NULL
        ) as posts,

        -- CARD 4: TODAY (Vídeos criados HOJE na tabela Videos = aprovados hoje)
        (
            SELECT COUNT(*)::INTEGER
            FROM "Videos" v
            JOIN "Canais do youtube" c ON v.canal = c.id
            WHERE c."Projeto" = p_project_id
              AND v.monitored = true
              AND v.created_at::date = CURRENT_DATE
        ) as videos_today;
END;
$$;

COMMENT ON FUNCTION get_project_metrics(INTEGER) IS
'Retorna métricas dos 4 cards do Monitoring page (V3 - 2026-01-01).

MUDANÇAS V3:
- Usa tabela Videos ao invés de videos_scanreados JSONB
- Campo videos_scanreados JSONB antigo não é mais atualizado
- Sistema novo usa: videos_scanreados_2, videos_para_scann, executed

Card 1: CHANNELS - Canais ativos (filtro anti-spam)
Card 2: ANALYZED - Vídeos monitored na tabela Videos
Card 3: APPROVED - Vídeos High/Medium com mensagem criada
Card 4: TODAY - Vídeos aprovados HOJE (created_at = today)

Validado Projeto 117:
- Channels=26
- Analyzed=36
- Approved=15
- Today=1

Uso: SELECT * FROM get_project_metrics(117);';
