-- =============================================
-- Função: send_weekly_owner_report (v2)
-- Descrição: Envia relatório semanal para criadores do Liftlio
-- CORREÇÃO: Usa admin_analytics (métricas do app) em vez de analytics
-- MELHORIA: Envia para Valdair E Steven
-- MELHORIA: Filtra dados de localhost
-- Criado: 2025-12-30
-- Atualizado: 2026-01-03 - v2 com admin_analytics
-- =============================================

DROP FUNCTION IF EXISTS send_weekly_owner_report();

CREATE OR REPLACE FUNCTION send_weekly_owner_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_owner_emails TEXT[] := ARRAY['valdair3d@gmail.com', 'liftliome@gmail.com'];
    v_email TEXT;

    -- Analytics data (from admin_analytics - app metrics)
    v_unique_visitors INTEGER;
    v_total_sessions INTEGER;
    v_total_pageviews INTEGER;
    v_week_range TEXT;

    -- Waitlist data
    v_total_waitlist INTEGER;
    v_new_waitlist_count INTEGER;
    v_has_new_waitlist BOOLEAN;

    -- Simulations data
    v_simulations_week INTEGER;
    v_simulations_total INTEGER;

    -- Template selection
    v_template_id UUID;
    v_subject TEXT;
    v_variables JSONB;
    v_send_result JSONB;
    v_results JSONB := '[]'::jsonb;
    v_total_sent INTEGER := 0;
BEGIN
    -- 1. BUSCAR DADOS DO ADMIN_ANALYTICS (métricas do app inteiro)
    -- Filtra localhost para dados limpos
    SELECT
        COUNT(DISTINCT visitor_id),
        COUNT(DISTINCT session_id),
        COUNT(CASE WHEN event_type = 'pageview' THEN 1 END)
    INTO v_unique_visitors, v_total_sessions, v_total_pageviews
    FROM admin_analytics
    WHERE created_at >= NOW() - INTERVAL '7 days'
    AND (referrer NOT LIKE '%localhost%' OR referrer IS NULL);

    v_week_range := TO_CHAR(NOW() - INTERVAL '7 days', 'DD Mon') || ' - ' || TO_CHAR(NOW(), 'DD Mon YYYY');

    -- 2. BUSCAR DADOS DA WAITLIST
    SELECT
        COUNT(*),
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END)
    INTO v_total_waitlist, v_new_waitlist_count
    FROM waitlist;

    v_has_new_waitlist := v_new_waitlist_count > 0;

    -- 3. BUSCAR SIMULACOES DA LANDING PAGE
    SELECT
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END),
        COUNT(*)
    INTO v_simulations_week, v_simulations_total
    FROM url_analyzer_rate_limit;

    -- 4. ESCOLHER TEMPLATE
    IF v_has_new_waitlist THEN
        SELECT id INTO v_template_id
        FROM email_templates
        WHERE name = 'weekly_report_with_waitlist'
        AND is_active = true;

        v_subject := 'Liftlio Weekly Report - ' || v_week_range || ' - ' || v_new_waitlist_count || ' New Signups!';
    ELSE
        SELECT id INTO v_template_id
        FROM email_templates
        WHERE name = 'weekly_report_no_waitlist'
        AND is_active = true;

        v_subject := 'Liftlio Weekly Report - ' || v_week_range;
    END IF;

    IF v_template_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Template not found'
        );
    END IF;

    -- 5. MONTAR VARIAVEIS
    v_variables := jsonb_build_object(
        'week_range', v_week_range,
        'unique_visitors', v_unique_visitors::TEXT,
        'total_sessions', v_total_sessions::TEXT,
        'total_pageviews', v_total_pageviews::TEXT,
        'total_waitlist', v_total_waitlist::TEXT,
        'new_waitlist_count', v_new_waitlist_count::TEXT,
        'simulations_week', v_simulations_week::TEXT,
        'simulations_total', v_simulations_total::TEXT
    );

    -- 6. ENVIAR EMAIL PARA TODOS OS OWNERS (Valdair + Steven)
    FOREACH v_email IN ARRAY v_owner_emails
    LOOP
        v_send_result := send_email(
            v_email,
            v_subject,
            NULL,
            NULL,
            v_template_id::TEXT,
            v_variables,
            NULL,
            NULL,
            'simple'
        );

        v_results := v_results || jsonb_build_object(
            'email', v_email,
            'result', v_send_result
        );

        v_total_sent := v_total_sent + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'total_sent', v_total_sent,
        'recipients', v_owner_emails,
        'send_results', v_results,
        'report_data', jsonb_build_object(
            'week_range', v_week_range,
            'unique_visitors', v_unique_visitors,
            'total_sessions', v_total_sessions,
            'total_pageviews', v_total_pageviews,
            'total_waitlist', v_total_waitlist,
            'new_waitlist_count', v_new_waitlist_count,
            'simulations_week', v_simulations_week,
            'simulations_total', v_simulations_total,
            'template_used', CASE WHEN v_has_new_waitlist THEN 'with_waitlist' ELSE 'no_waitlist' END,
            'data_source', 'admin_analytics (app metrics, excluding localhost)'
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Exception: ' || SQLERRM
    );
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION send_weekly_owner_report() TO service_role;

COMMENT ON FUNCTION send_weekly_owner_report IS 'v2: Uses admin_analytics (app metrics) instead of analytics. Sends to both Valdair and Steven. Filters localhost data.';
