-- =============================================
-- Funcao: get_project_dashboard_stats
-- Descricao: Obtem estatisticas completas do dashboard para um projeto
-- Criado: 2024-01-24
-- Atualizado: 2025-01-19 - Adicionado total_engagement + JOIN com Mensagens para filtrar por tipo
-- Atualizado: 2025-10-19 - Corrigido post_today para contar TODOS os tipos (produto + engajamento)
-- =============================================

-- Drop da versao anterior
DROP FUNCTION IF EXISTS public.get_project_dashboard_stats(INTEGER);

CREATE OR REPLACE FUNCTION public.get_project_dashboard_stats(project_id_param INTEGER)
RETURNS JSON AS $$
DECLARE
    result JSON;
    channels_count INTEGER;
    videos_count INTEGER;
    total_mentions INTEGER;
    total_engagement INTEGER;  -- NOVO: Mensagens tipo 'engajamento' postadas
    post_today INTEGER;
BEGIN
    -- Contagem de canais ativos para o projeto
    SELECT COUNT(*)
    INTO channels_count
    FROM public."Canais do youtube"
    WHERE "Projeto" = project_id_param AND is_active = true;

    -- Contagem de videos para o projeto
    SELECT COUNT(*)
    INTO videos_count
    FROM public."Videos" v
    JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
    WHERE s."Projeto_id" = project_id_param;

    -- MODIFICADO: Total de mensagens tipo 'produto' postadas (JOIN com Mensagens)
    SELECT COUNT(*)
    INTO total_mentions
    FROM public."Settings messages posts" smp
    JOIN public."Mensagens" m ON smp."Mensagens" = m.id
    WHERE smp."Projeto" = project_id_param
      AND smp.postado IS NOT NULL
      AND m.tipo_resposta = 'produto';

    -- NOVO: Total de mensagens tipo 'engajamento' postadas
    SELECT COUNT(*)
    INTO total_engagement
    FROM public."Settings messages posts" smp
    JOIN public."Mensagens" m ON smp."Mensagens" = m.id
    WHERE smp."Projeto" = project_id_param
      AND smp.postado IS NOT NULL
      AND m.tipo_resposta = 'engajamento';

    -- CORRIGIDO: TODAS as mensagens postadas hoje (produto + engajamento)
    SELECT COUNT(*)
    INTO post_today
    FROM public."Settings messages posts" smp
    WHERE smp."Projeto" = project_id_param
      AND smp.postado IS NOT NULL
      AND smp.postado >= CURRENT_DATE
      AND smp.postado < (CURRENT_DATE + INTERVAL '1 day');

    -- MODIFICADO: JSON agora inclui total_engagement
    result := json_build_object(
        'channels_count', channels_count,
        'videos_count', videos_count,
        'total_mentions', total_mentions,
        'total_engagement', total_engagement,  -- NOVO
        'post_today', post_today
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;