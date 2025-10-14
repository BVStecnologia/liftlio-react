-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: Create Required Sequences
-- Date: 2025-10-12
-- Description: Create all sequences needed by tables BEFORE creating tables
-- Note: Must run BEFORE production_schema migration
-- ═══════════════════════════════════════════════════════════════

-- Create sequences if they don't exist
-- Using DO block to handle conditional creation

DO $$
BEGIN
    -- 1. agent_tools_id_seq
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'agent_tools_id_seq') THEN
        CREATE SEQUENCE public.agent_tools_id_seq;
    END IF;

    -- 2. system_logs_id_seq
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'system_logs_id_seq') THEN
        CREATE SEQUENCE public.system_logs_id_seq;
    END IF;

    -- 3. url_analyzer_rate_limit_id_seq
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'url_analyzer_rate_limit_id_seq') THEN
        CREATE SEQUENCE public.url_analyzer_rate_limit_id_seq;
    END IF;

    -- 4. contact_submissions_id_seq
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'contact_submissions_id_seq') THEN
        CREATE SEQUENCE public.contact_submissions_id_seq;
    END IF;

    -- 5. analytics_id_seq
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'analytics_id_seq') THEN
        CREATE SEQUENCE public.analytics_id_seq;
    END IF;

    -- 6. rag_embeddings_id_seq
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'rag_embeddings_id_seq') THEN
        CREATE SEQUENCE public.rag_embeddings_id_seq;
    END IF;

    -- 7. youtube_scan_queue_id_seq
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'youtube_scan_queue_id_seq') THEN
        CREATE SEQUENCE public.youtube_scan_queue_id_seq;
    END IF;
END $$;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Verify sequences were created
SELECT 'Sequences created successfully' AS status;