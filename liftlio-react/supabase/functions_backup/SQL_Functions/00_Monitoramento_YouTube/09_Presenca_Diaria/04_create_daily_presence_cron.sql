-- =============================================
-- Cron Job: daily-presence-tasks
-- Description: Runs daily at 6:00 AM UTC to create presence tasks
-- Created: 2026-01-01
-- =============================================

-- Remove existing cron if exists
SELECT cron.unschedule('daily-presence-tasks');

-- Schedule the daily presence task creation
-- Runs at 6:00 AM UTC every day
SELECT cron.schedule(
    'daily-presence-tasks',
    '0 6 * * *',
    $$SELECT create_daily_presence_tasks();$$
);

-- Verify cron was created
SELECT * FROM cron.job WHERE jobname = 'daily-presence-tasks';
