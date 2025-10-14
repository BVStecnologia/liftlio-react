-- =============================================
-- Migration: Add Cron Jobs
-- Date: 2025-10-12
-- Description: Set up scheduled jobs for Liftlio platform
-- =============================================

-- =============================================
-- ENABLE PG_CRON EXTENSION
-- =============================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- =============================================
-- HELPER FUNCTIONS FOR CRON JOBS
-- =============================================

-- 1. Function to clean old system logs
CREATE OR REPLACE FUNCTION public.cleanup_old_system_logs()
RETURNS void AS $$
BEGIN
    -- Delete logs older than 30 days, keep important ones
    DELETE FROM public."system_logs"
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND success = true
    AND operation NOT LIKE '%payment%'
    AND operation NOT LIKE '%subscription%';

    -- Log the cleanup
    INSERT INTO public."system_logs" (operation, details, success, created_at)
    VALUES ('CRON_CLEANUP_LOGS', 'Cleaned old system logs', true, NOW());
END;
$$ LANGUAGE plpgsql;

-- 2. Function to analyze pending comments
CREATE OR REPLACE FUNCTION public.analyze_pending_comments()
RETURNS void AS $$
DECLARE
    pending_count INTEGER;
BEGIN
    -- Count pending comments
    SELECT COUNT(*)
    INTO pending_count
    FROM public."Comentarios_Principais"
    WHERE comentario_analizado = false
    AND created_at > NOW() - INTERVAL '7 days';

    -- Log the check
    INSERT INTO public."system_logs" (operation, details, success, created_at)
    VALUES (
        'CRON_ANALYZE_COMMENTS',
        format('Found %s pending comments for analysis', pending_count),
        true,
        NOW()
    );

    -- Mark comments for processing (actual processing done by Edge Functions)
    UPDATE public."Comentarios_Principais"
    SET led = false
    WHERE comentario_analizado = false
    AND created_at > NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- 3. Function to check channel activity
CREATE OR REPLACE FUNCTION public.check_channel_activity()
RETURNS void AS $$
DECLARE
    inactive_channels INTEGER;
BEGIN
    -- Mark channels as inactive if no activity in 30 days
    UPDATE public."Canais do youtube"
    SET is_active = false,
        auto_disabled_reason = 'No activity for 30 days'
    WHERE last_canal_check < NOW() - INTERVAL '30 days'
    AND is_active = true
    AND desativado_pelo_user = false;

    GET DIAGNOSTICS inactive_channels = ROW_COUNT;

    -- Log the check
    INSERT INTO public."system_logs" (operation, details, success, created_at)
    VALUES (
        'CRON_CHECK_CHANNELS',
        format('Marked %s channels as inactive', inactive_channels),
        true,
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Function to process YouTube scan queue
CREATE OR REPLACE FUNCTION public.process_youtube_scan_queue()
RETURNS void AS $$
DECLARE
    processed_count INTEGER := 0;
BEGIN
    -- Reset failed attempts older than 1 hour
    UPDATE public."youtube_scan_queue"
    SET status = 'pending',
        attempts = 0,
        error_message = NULL
    WHERE status = 'failed'
    AND last_attempt < NOW() - INTERVAL '1 hour'
    AND attempts < 3;

    GET DIAGNOSTICS processed_count = ROW_COUNT;

    -- Log the processing
    INSERT INTO public."system_logs" (operation, details, success, created_at)
    VALUES (
        'CRON_YOUTUBE_QUEUE',
        format('Reset %s failed queue items', processed_count),
        true,
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Function to verify posted messages still exist
CREATE OR REPLACE FUNCTION public.verify_posted_messages()
RETURNS void AS $$
DECLARE
    messages_to_check INTEGER;
BEGIN
    -- Mark messages for verification if not checked in 7 days
    UPDATE public."Mensagens"
    SET last_verified_at = NOW(),
        verification_count = COALESCE(verification_count, 0) + 1
    WHERE respondido = true
    AND (last_verified_at IS NULL OR last_verified_at < NOW() - INTERVAL '7 days')
    AND still_exists = true;

    GET DIAGNOSTICS messages_to_check = ROW_COUNT;

    -- Log the verification
    INSERT INTO public."system_logs" (operation, details, success, created_at)
    VALUES (
        'CRON_VERIFY_MESSAGES',
        format('Marked %s messages for verification', messages_to_check),
        true,
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- 6. Function to update analytics aggregates
CREATE OR REPLACE FUNCTION public.update_analytics_aggregates()
RETURNS void AS $$
BEGIN
    -- Mark organic traffic
    UPDATE public."analytics"
    SET is_organic = true
    WHERE is_organic IS NULL
    AND (
        referrer IS NULL
        OR referrer = ''
        OR referrer LIKE '%google%'
        OR referrer LIKE '%bing%'
        OR referrer LIKE '%duckduckgo%'
    );

    -- Log the update
    INSERT INTO public."system_logs" (operation, details, success, created_at)
    VALUES (
        'CRON_ANALYTICS_UPDATE',
        'Updated analytics aggregates',
        true,
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- 7. Function to check subscription renewals
CREATE OR REPLACE FUNCTION public.check_subscription_renewals()
RETURNS void AS $$
DECLARE
    due_subscriptions INTEGER;
BEGIN
    -- Find subscriptions due for renewal
    SELECT COUNT(*)
    INTO due_subscriptions
    FROM public."subscriptions"
    WHERE status = 'active'
    AND next_billing_date <= CURRENT_DATE + INTERVAL '3 days'
    AND next_billing_date >= CURRENT_DATE;

    -- Log upcoming renewals
    IF due_subscriptions > 0 THEN
        INSERT INTO public."system_logs" (operation, details, success, created_at)
        VALUES (
            'CRON_SUBSCRIPTION_CHECK',
            format('%s subscriptions due for renewal in next 3 days', due_subscriptions),
            true,
            NOW()
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to clean old RAG embeddings
CREATE OR REPLACE FUNCTION public.cleanup_old_rag_embeddings()
RETURNS void AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old embeddings for deleted source content
    DELETE FROM public."rag_embeddings" e
    WHERE NOT EXISTS (
        SELECT 1
        FROM public."Comentarios_Principais" c
        WHERE e.source_table = 'Comentarios_Principais'
        AND e.source_id = c.id::text
    )
    AND e.source_table = 'Comentarios_Principais'
    AND e.created_at < NOW() - INTERVAL '90 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Log the cleanup
    INSERT INTO public."system_logs" (operation, details, success, created_at)
    VALUES (
        'CRON_CLEANUP_EMBEDDINGS',
        format('Deleted %s orphaned embeddings', deleted_count),
        true,
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SCHEDULE CRON JOBS
-- =============================================

-- Remove existing jobs if they exist (to avoid duplicates)
SELECT cron.unschedule(jobname) FROM cron.job
WHERE jobname IN (
    'cleanup_logs',
    'analyze_comments',
    'check_channels',
    'process_youtube_queue',
    'verify_messages',
    'update_analytics',
    'check_subscriptions',
    'cleanup_embeddings'
);

-- 1. Clean system logs daily at 2 AM
SELECT cron.schedule(
    'cleanup_logs',
    '0 2 * * *',
    'SELECT public.cleanup_old_system_logs();'
);

-- 2. Analyze pending comments every 30 minutes
SELECT cron.schedule(
    'analyze_comments',
    '*/30 * * * *',
    'SELECT public.analyze_pending_comments();'
);

-- 3. Check channel activity daily at 3 AM
SELECT cron.schedule(
    'check_channels',
    '0 3 * * *',
    'SELECT public.check_channel_activity();'
);

-- 4. Process YouTube scan queue every 15 minutes
SELECT cron.schedule(
    'process_youtube_queue',
    '*/15 * * * *',
    'SELECT public.process_youtube_scan_queue();'
);

-- 5. Verify posted messages weekly on Sunday at 4 AM
SELECT cron.schedule(
    'verify_messages',
    '0 4 * * 0',
    'SELECT public.verify_posted_messages();'
);

-- 6. Update analytics aggregates every hour
SELECT cron.schedule(
    'update_analytics',
    '0 * * * *',
    'SELECT public.update_analytics_aggregates();'
);

-- 7. Check subscription renewals daily at 10 AM
SELECT cron.schedule(
    'check_subscriptions',
    '0 10 * * *',
    'SELECT public.check_subscription_renewals();'
);

-- 8. Clean old RAG embeddings weekly on Sunday at 5 AM
SELECT cron.schedule(
    'cleanup_embeddings',
    '0 5 * * 0',
    'SELECT public.cleanup_old_rag_embeddings();'
);

-- =============================================
-- VERIFY CRON JOBS CREATED
-- =============================================

SELECT 'Cron jobs created successfully' AS status;

-- Show all scheduled jobs
SELECT
    jobid,
    jobname,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active
FROM cron.job
ORDER BY jobname;