-- =============================================
-- Migration: Fix Missing Columns
-- Date: 2025-10-12
-- Description: Add missing columns that may not exist in production
-- =============================================

-- Add project_id to rag_embeddings if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'rag_embeddings'
        AND column_name = 'project_id'
    ) THEN
        ALTER TABLE public."rag_embeddings"
        ADD COLUMN project_id integer;
    END IF;
END $$;

-- Add project_id to agent_conversations if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'agent_conversations'
        AND column_name = 'project_id'
    ) THEN
        ALTER TABLE public."agent_conversations"
        ADD COLUMN project_id integer;
    END IF;
END $$;

SELECT 'Missing columns added successfully' AS status;