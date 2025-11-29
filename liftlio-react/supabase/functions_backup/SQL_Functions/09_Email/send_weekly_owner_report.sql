-- =============================================
-- Funcao: send_weekly_owner_report
-- Descricao: Envia relatorio semanal do Liftlio para o owner
-- Criado: 2025-11-29
-- Autor: Claude Code
-- =============================================
-- CRON: Todo domingo as 9h (America/Sao_Paulo)
-- SELECT cron.schedule('weekly_owner_report', '0 9 * * 0', 'SELECT send_weekly_owner_report()');
-- =============================================

DROP FUNCTION IF EXISTS public.send_weekly_owner_report();

CREATE OR REPLACE FUNCTION public.send_weekly_owner_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_owner_emails TEXT[] := ARRAY['valdair3d@gmail.com', 'steven@stevenjwilson.com'];
    v_project_id INTEGER := 117;  -- Projeto Liftlio (tracking proprio site)

    -- Analytics data
    v_unique_visitors INTEGER;
    v_total_sessions INTEGER;
    v_total_pageviews INTEGER;
    v_week_range TEXT;

    -- Waitlist data
    v_total_waitlist INTEGER;
    v_new_waitlist_count INTEGER;
    v_has_new_waitlist BOOLEAN;

    -- Template selection
    v_template_id UUID;
    v_subject TEXT;
    v_variables JSONB;

    -- Result
    v_result JSONB;
    v_email TEXT;
    v_send_result JSONB;
    v_results JSONB := '[]'::jsonb;
BEGIN
    -- =============================================
    -- 1. BUSCAR DADOS DO ANALYTICS (ultimos 7 dias)
    -- =============================================
    SELECT
        COUNT(DISTINCT visitor_id),
        COUNT(DISTINCT session_id),
        COUNT(CASE WHEN event_type = 'pageview' THEN 1 END)
    INTO v_unique_visitors, v_total_sessions, v_total_pageviews
    FROM analytics
    WHERE project_id = v_project_id
    AND created_at >= NOW() - INTERVAL '7 days';

    -- Gerar range da semana
    v_week_range := TO_CHAR(NOW() - INTERVAL '7 days', 'DD Mon') || ' - ' || TO_CHAR(NOW(), 'DD Mon YYYY');

    -- =============================================
    -- 2. BUSCAR DADOS DA WAITLIST
    -- =============================================
    SELECT
        COUNT(*),
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END)
    INTO v_total_waitlist, v_new_waitlist_count
    FROM waitlist;

    v_has_new_waitlist := v_new_waitlist_count > 0;

    -- =============================================
    -- 3. ESCOLHER TEMPLATE CORRETO
    -- =============================================
    IF v_has_new_waitlist THEN
        -- Template COM novos signups (celebracao!)
        SELECT id INTO v_template_id
        FROM email_templates
        WHERE name = 'weekly_report_with_waitlist'
        AND is_active = true;

        v_subject := 'Liftlio Weekly Report - ' || v_week_range || ' - ' || v_new_waitlist_count || ' New Signups!';
    ELSE
        -- Template SEM novos signups (padrao)
        SELECT id INTO v_template_id
        FROM email_templates
        WHERE name = 'weekly_report_no_waitlist'
        AND is_active = true;

        v_subject := 'Liftlio Weekly Report - ' || v_week_range;
    END IF;

    -- Verificar se template existe
    IF v_template_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Template not found: ' || CASE WHEN v_has_new_waitlist THEN 'weekly_report_with_waitlist' ELSE 'weekly_report_no_waitlist' END
        );
    END IF;

    -- =============================================
    -- 4. MONTAR VARIAVEIS DO TEMPLATE
    -- =============================================
    v_variables := jsonb_build_object(
        'week_range', v_week_range,
        'unique_visitors', v_unique_visitors::TEXT,
        'total_sessions', v_total_sessions::TEXT,
        'total_pageviews', v_total_pageviews::TEXT,
        'total_waitlist', v_total_waitlist::TEXT,
        'new_waitlist_count', v_new_waitlist_count::TEXT
    );

    -- =============================================
    -- 5. ENVIAR EMAIL PARA CADA DESTINATARIO
    -- =============================================
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
    END LOOP;

    -- 6. RETORNAR RESULTADO
    RETURN jsonb_build_object(
        'success', true,
        'recipients', v_owner_emails,
        'send_results', v_results,
        'report_data', jsonb_build_object(
            'week_range', v_week_range,
            'unique_visitors', v_unique_visitors,
            'total_sessions', v_total_sessions,
            'total_pageviews', v_total_pageviews,
            'total_waitlist', v_total_waitlist,
            'new_waitlist_count', v_new_waitlist_count,
            'template_used', CASE WHEN v_has_new_waitlist THEN 'with_waitlist' ELSE 'no_waitlist' END
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Exception in send_weekly_owner_report: ' || SQLERRM
    );
END;
$function$;

-- =============================================
-- COMENTARIOS
-- =============================================
-- Esta funcao eh chamada pelo CRON todo domingo as 9h
--
-- FUNCIONAMENTO:
-- 1. Busca metricas do projeto 117 (Liftlio) dos ultimos 7 dias
-- 2. Busca dados da waitlist (total e novos)
-- 3. Escolhe template baseado em ter ou nao novos signups
-- 4. Envia email para valdair3d@gmail.com e steven@stevenjwilson.com
--
-- TEMPLATES USADOS:
-- - weekly_report_no_waitlist: Quando nao teve novos signups
-- - weekly_report_with_waitlist: Quando teve novos signups (celebracao!)
--
-- METRICAS ENVIADAS:
-- - Visitantes unicos
-- - Sessoes
-- - Pageviews
-- - Total waitlist
-- - Novos na waitlist (se houver)
--
-- CRON JOB:
-- SELECT cron.schedule(
--     'weekly_owner_report',
--     '0 12 * * 0',  -- Domingo 12:00 UTC = 9:00 BRT
--     'SELECT send_weekly_owner_report()'
-- );
--
-- TESTE MANUAL:
-- SELECT send_weekly_owner_report();
-- =============================================
