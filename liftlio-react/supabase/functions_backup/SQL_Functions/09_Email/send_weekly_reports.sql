-- =============================================
-- Funcao: send_weekly_reports
-- Descricao: Envia report semanal para TODOS os projetos ativos
-- Cada projeto recebe no email do seu criador
-- Criado: 2025-12-30
-- =============================================
-- CRON: Todo domingo 12:00 UTC (09:00 BRT)
-- SELECT cron.schedule('weekly_reports', '0 12 * * 0', 'SELECT send_weekly_reports()');
-- =============================================

DROP FUNCTION IF EXISTS public.send_weekly_reports();

CREATE OR REPLACE FUNCTION public.send_weekly_reports()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_project RECORD;
    v_template_id UUID;
    v_week_range TEXT;
    v_variables JSONB;
    v_send_result JSONB;
    v_results JSONB := '[]'::jsonb;
    v_total_sent INTEGER := 0;

    -- Analytics
    v_unique_visitors INTEGER;
    v_total_sessions INTEGER;
    v_total_pageviews INTEGER;

    -- YouTube metrics
    v_total_videos INTEGER;
    v_total_comments INTEGER;
    v_total_leads INTEGER;
BEGIN
    -- Buscar template UNICO para todos
    SELECT id INTO v_template_id
    FROM email_templates
    WHERE name = 'weekly_project_report' AND is_active = true;

    IF v_template_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Template not found');
    END IF;

    v_week_range := TO_CHAR(NOW() - INTERVAL '7 days', 'DD Mon') || ' - ' || TO_CHAR(NOW(), 'DD Mon YYYY');

    -- Iterar por TODOS os projetos ativos com subscription ativa
    FOR v_project IN
        SELECT
            p.id as project_id,
            p."Project name" as project_name,
            c.email as customer_email
        FROM "Projeto" p
        JOIN customers c ON p."User id" = c.user_id
        JOIN subscriptions s ON c.id = s.customer_id
        WHERE s.status = 'active'
        AND p."Youtube Active" = true
    LOOP
        -- Buscar analytics do projeto
        SELECT
            COALESCE(COUNT(DISTINCT visitor_id), 0),
            COALESCE(COUNT(DISTINCT session_id), 0),
            COALESCE(COUNT(CASE WHEN event_type = 'pageview' THEN 1 END), 0)
        INTO v_unique_visitors, v_total_sessions, v_total_pageviews
        FROM analytics
        WHERE project_id = v_project.project_id
        AND created_at >= NOW() - INTERVAL '7 days';

        -- Buscar YouTube metrics
        SELECT
            COALESCE(total_videos, 0),
            COALESCE(total_comments, 0),
            COALESCE(total_leads, 0)
        INTO v_total_videos, v_total_comments, v_total_leads
        FROM dashboard_metrics
        WHERE project_id = v_project.project_id;

        v_total_videos := COALESCE(v_total_videos, 0);
        v_total_comments := COALESCE(v_total_comments, 0);
        v_total_leads := COALESCE(v_total_leads, 0);

        -- MESMO template para TODOS os projetos
        v_variables := jsonb_build_object(
            'project_name', v_project.project_name,
            'week_range', v_week_range,
            'unique_visitors', v_unique_visitors::TEXT,
            'total_sessions', v_total_sessions::TEXT,
            'total_pageviews', v_total_pageviews::TEXT,
            'total_videos', v_total_videos::TEXT,
            'total_comments', v_total_comments::TEXT,
            'total_leads', v_total_leads::TEXT
        );

        -- Enviar email
        v_send_result := send_email(
            v_project.customer_email,
            v_project.project_name || ' Weekly Report - ' || v_week_range,
            NULL,
            NULL,
            v_template_id::TEXT,
            v_variables,
            NULL,
            NULL,
            'simple'
        );

        v_results := v_results || jsonb_build_object(
            'project_id', v_project.project_id,
            'project_name', v_project.project_name,
            'email', v_project.customer_email,
            'result', v_send_result
        );

        v_total_sent := v_total_sent + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'total_sent', v_total_sent,
        'week_range', v_week_range,
        'reports', v_results
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- =============================================
-- TESTE MANUAL
-- =============================================
-- SELECT send_weekly_reports();

-- =============================================
-- CRON JOB (executar uma vez para agendar)
-- =============================================
-- SELECT cron.schedule('weekly_reports', '0 12 * * 0', 'SELECT send_weekly_reports()');
