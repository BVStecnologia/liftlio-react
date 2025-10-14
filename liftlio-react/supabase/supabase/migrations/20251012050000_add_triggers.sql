-- =============================================
-- Migration: Add Triggers for Computed Fields
-- Date: 2025-10-12
-- Description: Add triggers for analytics_script and search_vector fields
-- =============================================

-- =============================================
-- 1. ANALYTICS SCRIPT TRIGGER (Projeto table)
-- =============================================

-- Function to update analytics_script
CREATE OR REPLACE FUNCTION public.update_analytics_script()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate analytics script with project ID
    NEW.analytics_script := '<script async src="https://track.liftlio.com/t.js" data-id="' || NEW.id || '"></script>';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS set_analytics_script_on_insert ON public."Projeto";
CREATE TRIGGER set_analytics_script_on_insert
BEFORE INSERT ON public."Projeto"
FOR EACH ROW
WHEN (NEW.analytics_script IS NULL)
EXECUTE FUNCTION public.update_analytics_script();

-- Create trigger for UPDATE (when ID changes, which should be rare)
DROP TRIGGER IF EXISTS update_analytics_script_on_update ON public."Projeto";
CREATE TRIGGER update_analytics_script_on_update
BEFORE UPDATE ON public."Projeto"
FOR EACH ROW
WHEN (OLD.id IS DISTINCT FROM NEW.id)
EXECUTE FUNCTION public.update_analytics_script();

-- Update existing rows that have NULL analytics_script
UPDATE public."Projeto"
SET analytics_script = '<script async src="https://track.liftlio.com/t.js" data-id="' || id || '"></script>'
WHERE analytics_script IS NULL;

-- =============================================
-- 2. SEARCH VECTOR TRIGGER (Comentarios_Principais table)
-- =============================================

-- Function to update search_vector
CREATE OR REPLACE FUNCTION public.update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate tsvector from text_display for Portuguese full-text search
    NEW.search_vector := to_tsvector('portuguese', COALESCE(NEW.text_display, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS update_search_vector_on_insert ON public."Comentarios_Principais";
CREATE TRIGGER update_search_vector_on_insert
BEFORE INSERT ON public."Comentarios_Principais"
FOR EACH ROW
EXECUTE FUNCTION public.update_search_vector();

-- Create trigger for UPDATE of text_display
DROP TRIGGER IF EXISTS update_search_vector_on_update ON public."Comentarios_Principais";
CREATE TRIGGER update_search_vector_on_update
BEFORE UPDATE OF text_display ON public."Comentarios_Principais"
FOR EACH ROW
WHEN (OLD.text_display IS DISTINCT FROM NEW.text_display)
EXECUTE FUNCTION public.update_search_vector();

-- Update existing rows to populate search_vector
UPDATE public."Comentarios_Principais"
SET search_vector = to_tsvector('portuguese', COALESCE(text_display, ''))
WHERE search_vector IS NULL;

-- =============================================
-- 3. UPDATED_AT TRIGGER (for tables that need it)
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to tables that have this column
DO $$
DECLARE
    tbl RECORD;
    trigger_name TEXT;
BEGIN
    -- Find all tables with updated_at column
    FOR tbl IN
        SELECT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND column_name = 'updated_at'
    LOOP
        -- Sanitize table name for trigger name (remove spaces and special chars)
        trigger_name := 'update_' || REPLACE(REPLACE(tbl.table_name, ' ', '_'), '"', '') || '_updated_at';

        -- Create trigger for each table
        EXECUTE format('
            DROP TRIGGER IF EXISTS %I ON public.%I;
            CREATE TRIGGER %I
            BEFORE UPDATE ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
        ', trigger_name, tbl.table_name, trigger_name, tbl.table_name);
    END LOOP;
END $$;

-- =============================================
-- 4. RAG PROCESSING TRIGGER
-- =============================================

-- Function to track when content changes require RAG reprocessing
CREATE OR REPLACE FUNCTION public.mark_for_rag_processing()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark as needing RAG processing when content changes
    NEW.rag_processed := FALSE;
    NEW.rag_processed_at := NULL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add RAG processing triggers to key content tables
CREATE TRIGGER mark_projeto_for_rag
BEFORE UPDATE OF "description service", "Keywords", "Negative keywords" ON public."Projeto"
FOR EACH ROW
WHEN (
    OLD."description service" IS DISTINCT FROM NEW."description service" OR
    OLD."Keywords" IS DISTINCT FROM NEW."Keywords" OR
    OLD."Negative keywords" IS DISTINCT FROM NEW."Negative keywords"
)
EXECUTE FUNCTION public.mark_for_rag_processing();

CREATE TRIGGER mark_videos_for_rag
BEFORE UPDATE OF video_title, video_description, ai_analysis_summary ON public."Videos"
FOR EACH ROW
WHEN (
    OLD.video_title IS DISTINCT FROM NEW.video_title OR
    OLD.video_description IS DISTINCT FROM NEW.video_description OR
    OLD.ai_analysis_summary IS DISTINCT FROM NEW.ai_analysis_summary
)
EXECUTE FUNCTION public.mark_for_rag_processing();

CREATE TRIGGER mark_comentarios_for_rag
BEFORE UPDATE OF text_display, lead_score ON public."Comentarios_Principais"
FOR EACH ROW
WHEN (
    OLD.text_display IS DISTINCT FROM NEW.text_display OR
    OLD.lead_score IS DISTINCT FROM NEW.lead_score
)
EXECUTE FUNCTION public.mark_for_rag_processing();

-- =============================================
-- 5. AUDIT LOGGING TRIGGER (optional but useful)
-- =============================================

-- Function to log important changes to system_logs
CREATE OR REPLACE FUNCTION public.log_important_changes()
RETURNS TRIGGER AS $$
DECLARE
    log_message TEXT;
BEGIN
    -- Build log message based on operation
    CASE TG_OP
        WHEN 'INSERT' THEN
            log_message := format('New %s created with ID %s', TG_TABLE_NAME, NEW.id);
        WHEN 'UPDATE' THEN
            log_message := format('%s updated, ID %s', TG_TABLE_NAME, NEW.id);
        WHEN 'DELETE' THEN
            log_message := format('%s deleted, ID %s', TG_TABLE_NAME, OLD.id);
    END CASE;

    -- Insert into system_logs
    INSERT INTO public."system_logs" (operation, details, success, created_at)
    VALUES (TG_OP || '_' || TG_TABLE_NAME, log_message, true, NOW());

    -- Return appropriate row
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add audit logging to critical tables (optional - comment out if not needed)
/*
CREATE TRIGGER audit_projeto_changes
AFTER INSERT OR UPDATE OR DELETE ON public."Projeto"
FOR EACH ROW EXECUTE FUNCTION public.log_important_changes();

CREATE TRIGGER audit_subscriptions_changes
AFTER INSERT OR UPDATE OR DELETE ON public."subscriptions"
FOR EACH ROW EXECUTE FUNCTION public.log_important_changes();

CREATE TRIGGER audit_payments_changes
AFTER INSERT OR UPDATE OR DELETE ON public."payments"
FOR EACH ROW EXECUTE FUNCTION public.log_important_changes();
*/

-- =============================================
-- 6. AUTO-INCREMENT TRIGGER FOR LEGACY TABLES
-- =============================================

-- Some tables might need auto-increment behavior for id columns
-- This ensures they work even if sequence is not properly set

CREATE OR REPLACE FUNCTION public.set_next_id()
RETURNS TRIGGER AS $$
DECLARE
    max_id BIGINT;
BEGIN
    IF NEW.id IS NULL THEN
        EXECUTE format('SELECT COALESCE(MAX(id), 0) + 1 FROM %I.%I', TG_TABLE_SCHEMA, TG_TABLE_NAME) INTO max_id;
        NEW.id := max_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables that need it (tables without proper sequences)
DO $$
DECLARE
    tbl TEXT;
    trigger_name TEXT;
BEGIN
    -- Tables that might need this trigger
    FOR tbl IN
        SELECT unnest(ARRAY[
            'Projeto',
            'Integrações',
            'Configurações',
            'Notificacoes',
            'Canais do youtube',
            'Videos',
            'Comentarios_Principais',
            'Mensagens'
        ])
    LOOP
        -- Sanitize table name for trigger name
        trigger_name := 'ensure_id_on_' || REPLACE(REPLACE(tbl, ' ', '_'), '"', '');

        EXECUTE format('
            DROP TRIGGER IF EXISTS %I ON public.%I;
            CREATE TRIGGER %I
            BEFORE INSERT ON public.%I
            FOR EACH ROW
            WHEN (NEW.id IS NULL)
            EXECUTE FUNCTION public.set_next_id();
        ', trigger_name, tbl, trigger_name, tbl);
    END LOOP;
END $$;

-- =============================================
-- VERIFY TRIGGERS CREATED
-- =============================================

SELECT 'Triggers created successfully' AS status;

-- Show summary of triggers
SELECT
    trigger_name,
    event_object_table as table_name,
    event_manipulation as trigger_event,
    action_timing as trigger_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;