-- =============================================
-- Função: get_project_dashboard_stats
-- Descrição: Obtém estatísticas completas do dashboard para um projeto
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.get_project_dashboard_stats(project_id_param integer)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSON;
    channels_count INTEGER;
    videos_count INTEGER;
    total_mentions INTEGER;
    today_mentions INTEGER;
BEGIN
    -- Contagem de canais ativos para o projeto
    SELECT COUNT(*)
    INTO channels_count
    FROM public."Canais do youtube"
    WHERE "Projeto" = project_id_param AND is_active = true;

    -- Contagem de vídeos para o projeto
    SELECT COUNT(*)
    INTO videos_count
    FROM public."Videos" v
    JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
    WHERE s."Projeto_id" = project_id_param;

    -- Modificado: Contagem total de registros onde postado não é nulo
    SELECT COUNT(*)
    INTO total_mentions
    FROM public."Settings messages posts" smp
    WHERE smp."Projeto" = project_id_param AND smp.postado IS NOT NULL;

    -- Contagem de mensagens postadas hoje (mantido como estava)
    SELECT COUNT(*)
    INTO today_mentions
    FROM public."Settings messages posts" smp
    WHERE smp."Projeto" = project_id_param
      AND smp.postado >= CURRENT_DATE
      AND smp.postado < (CURRENT_DATE + INTERVAL '1 day');

    -- Construir o resultado em JSON (mantido como estava)
    result := json_build_object(
        'channels_count', channels_count,
        'videos_count', videos_count,
        'total_mentions', total_mentions,
        'today_mentions', today_mentions
    );

    RETURN result;
END;
$function$