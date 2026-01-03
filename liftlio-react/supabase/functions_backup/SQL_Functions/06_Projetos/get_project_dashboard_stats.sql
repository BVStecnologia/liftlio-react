-- =============================================
-- Funcao: get_project_dashboard_stats
-- Descricao: Obtem estatisticas completas do dashboard para um projeto
-- Criado: 2024-01-24
-- Atualizado: 2025-01-19 - Adicionado total_engagement + JOIN com Mensagens para filtrar por tipo
-- Atualizado: 2025-10-19 - Corrigido post_today para contar TODOS os tipos (produto + engajamento)
-- Atualizado: 2025-12-21 - Filtro ANTI-SPAM na contagem de canais (exclui blacklistados/desativados)
-- Atualizado: 2026-01-03 - FIX TIMEZONE: Usa fuso_horario do projeto em vez de UTC para post_today
-- =============================================

DROP FUNCTION IF EXISTS public.get_project_dashboard_stats(INTEGER);

CREATE OR REPLACE FUNCTION public.get_project_dashboard_stats(project_id_param INTEGER)
RETURNS JSON AS $$
DECLARE
    result JSON;
    channels_count INTEGER;
    videos_count INTEGER;
    total_mentions INTEGER;
    total_engagement INTEGER;
    post_today INTEGER;
    project_tz TEXT;
BEGIN
    -- Get project timezone (default to America/Sao_Paulo if not set)
    SELECT COALESCE(fuso_horario, 'America/Sao_Paulo')
    INTO project_tz
    FROM public."Projeto"
    WHERE id = project_id_param;

    IF project_tz IS NULL THEN
        project_tz := 'America/Sao_Paulo';
    END IF;

    -- Contagem de canais ativos para o projeto
    SELECT COUNT(*)
    INTO channels_count
    FROM public."Canais do youtube"
    WHERE "Projeto" = project_id_param
      AND is_active = true
      AND auto_disabled_reason IS NULL
      AND (desativado_pelo_user = false OR desativado_pelo_user IS NULL);

    -- Contagem de videos para o projeto
    SELECT COUNT(*)
    INTO videos_count
    FROM public."Videos" v
    JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
    WHERE s."Projeto_id" = project_id_param;

    -- Total de mensagens tipo 'produto' postadas
    SELECT COUNT(*)
    INTO total_mentions
    FROM public."Settings messages posts" smp
    JOIN public."Mensagens" m ON smp."Mensagens" = m.id
    WHERE smp."Projeto" = project_id_param
      AND smp.postado IS NOT NULL
      AND m.tipo_resposta = 'produto';

    -- Total de mensagens tipo 'engajamento' postadas
    SELECT COUNT(*)
    INTO total_engagement
    FROM public."Settings messages posts" smp
    JOIN public."Mensagens" m ON smp."Mensagens" = m.id
    WHERE smp."Projeto" = project_id_param
      AND smp.postado IS NOT NULL
      AND m.tipo_resposta = 'engajamento';

    -- TODAS as mensagens postadas hoje NO TIMEZONE DO PROJETO
    SELECT COUNT(*)
    INTO post_today
    FROM public."Settings messages posts" smp
    WHERE smp."Projeto" = project_id_param
      AND smp.postado IS NOT NULL
      AND DATE(smp.postado AT TIME ZONE 'UTC' AT TIME ZONE project_tz)
        = DATE(NOW() AT TIME ZONE project_tz);

    result := json_build_object(
        'channels_count', channels_count,
        'videos_count', videos_count,
        'total_mentions', total_mentions,
        'total_engagement', total_engagement,
        'post_today', post_today,
        'project_timezone', project_tz
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;
