-- =============================================
-- Migration: Add scheduled_for to browser_tasks
-- Description: Enables delayed task execution for Daily Presence
-- Created: 2026-01-01
-- =============================================

-- Add scheduled_for column to browser_tasks table
-- Tasks with future scheduled_for will be skipped by browser-dispatch until the time is reached
ALTER TABLE browser_tasks
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

-- Add index for efficient querying of scheduled tasks
CREATE INDEX IF NOT EXISTS idx_browser_tasks_scheduled_for
ON browser_tasks(scheduled_for)
WHERE scheduled_for IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN browser_tasks.scheduled_for IS
'When set, the task will not be dispatched until this timestamp is reached. Used by Daily Presence for random timing throughout the day.';
