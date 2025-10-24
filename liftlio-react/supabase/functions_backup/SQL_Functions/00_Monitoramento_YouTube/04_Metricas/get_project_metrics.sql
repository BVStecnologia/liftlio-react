-- =============================================
-- Função: get_project_metrics (REFATORADA V2)
-- Descrição: Retorna métricas dos 4 cards do Monitoring page
-- Data: 2025-10-24
-- Atualizado: 2025-10-24 - Adicionada validação de mensagens no Card 3
-- Validado: Projeto 117 (6 canais, 10 vídeos, 0 aprovados com mensagens, 10 hoje)
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
        -- CARD 1: CHANNELS (Canais Ativos) - Query validada: 6 canais
        (
            SELECT COUNT(*)::INTEGER
            FROM "Canais do youtube" c
            WHERE c."Projeto" = p_project_id
        ) as total_channels,

        -- CARD 2: ANALYZED (Vídeos Analisados) - Query validada: 10 vídeos únicos
        (
            SELECT COUNT(DISTINCT elem->>'id')::INTEGER
            FROM "Canais do youtube" c,
                 LATERAL jsonb_array_elements(
                     CASE
                         WHEN c.videos_scanreados IS NULL
                              OR c.videos_scanreados = ''
                              OR c.videos_scanreados::text NOT LIKE '[%'
                         THEN '[]'::jsonb
                         ELSE c.videos_scanreados::jsonb
                     END
                 ) elem
            WHERE c."Projeto" = p_project_id
              AND c.videos_scanreados IS NOT NULL
              AND c.videos_scanreados != ''
        ) as total_videos,

        -- CARD 3: APPROVED (Vídeos Aprovados COM mensagens postadas)
        -- Validação adicional: só conta se existir mensagem na tabela Mensagens
        (
            SELECT COUNT(DISTINCT elem->>'id')::INTEGER
            FROM "Canais do youtube" c,
                 LATERAL jsonb_array_elements(
                     CASE
                         WHEN c.videos_scanreados IS NULL
                              OR c.videos_scanreados = ''
                              OR c.videos_scanreados::text NOT LIKE '[%'
                         THEN '[]'::jsonb
                         ELSE c.videos_scanreados::jsonb
                     END
                 ) elem
            WHERE c."Projeto" = p_project_id
              AND elem->>'status' = 'APPROVED'
              AND EXISTS (
                  SELECT 1
                  FROM "Videos" v
                  INNER JOIN "Mensagens" m ON m.video = v.id
                  WHERE v."VIDEO" = (elem->>'id')
              )
        ) as posts,

        -- CARD 4: TODAY (Vídeos Analisados Hoje) - Query validada: 10 vídeos hoje
        (
            SELECT COUNT(DISTINCT elem->>'id')::INTEGER
            FROM "Canais do youtube" c,
                 LATERAL jsonb_array_elements(
                     CASE
                         WHEN c.videos_scanreados IS NULL
                              OR c.videos_scanreados = ''
                              OR c.videos_scanreados::text NOT LIKE '[%'
                         THEN '[]'::jsonb
                         ELSE c.videos_scanreados::jsonb
                     END
                 ) elem
            WHERE c."Projeto" = p_project_id
              AND (
                  (elem->>'analyzed_at' IS NOT NULL
                   AND (elem->>'analyzed_at')::timestamptz >= CURRENT_DATE::timestamptz)
                  OR
                  (elem->>'analyzed_at' IS NULL
                   AND c.last_canal_check >= CURRENT_DATE::timestamptz)
              )
        ) as videos_today;
END;
$$;

COMMENT ON FUNCTION get_project_metrics(INTEGER) IS
'Retorna métricas dos 4 cards do Monitoring page.

Card 3 (APPROVED) inclui validação adicional:
- Vídeo deve ter status APPROVED em videos_scanreados
- E deve existir pelo menos 1 mensagem na tabela Mensagens

Validado Projeto 117:
- Channels=6
- Analyzed=10
- Approved=0 (com validação de mensagens)
- Today=10

Uso: SELECT * FROM get_project_metrics(117);';
