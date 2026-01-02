-- =============================================
-- Migration: Add daily_presence_active to Projeto
-- Description: Adds toggle field for Daily Presence feature
-- Created: 2026-01-01
-- =============================================

-- Add daily_presence_active column to Projeto table
-- This enables/disables the daily YouTube presence feature per project
ALTER TABLE "Projeto"
ADD COLUMN IF NOT EXISTS daily_presence_active BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN "Projeto".daily_presence_active IS
'Enables automatic daily YouTube presence posting. When true, the cron job will create one youtube_presence task per day for this project.';
