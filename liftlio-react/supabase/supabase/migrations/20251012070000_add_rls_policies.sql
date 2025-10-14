-- =============================================
-- Migration: Add RLS (Row Level Security) Policies
-- Date: 2025-10-12
-- Description: Enable RLS and create security policies for all tables
-- =============================================

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

-- Enable RLS on all user-facing tables
ALTER TABLE public."Projeto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Integrações" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Configurações" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notificacoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Perfil user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Canais do youtube" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Videos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Videos_trancricao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Scanner de videos do youtube" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Comentarios_Principais" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Respostas_Comentarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Menção" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Mensagens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Settings messages posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."cards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."analytics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."rag_embeddings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."agent_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."email_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."email_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."contact_submissions" ENABLE ROW LEVEL SECURITY;

-- System tables - may not need RLS but enabling for consistency
ALTER TABLE public."agent_tools" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."system_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."url_analyzer_rate_limit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."youtube_scan_queue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."youtube_trends_current" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."blocked_submissions" ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTION - Check if user owns project
-- =============================================

CREATE OR REPLACE FUNCTION public.user_owns_project(project_id bigint)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public."Projeto"
        WHERE id = project_id
        AND "User id" = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RLS POLICIES FOR PROJETO TABLE
-- =============================================

-- Users can view their own projects
CREATE POLICY "Users can view own projects" ON public."Projeto"
    FOR SELECT USING ("User id" = auth.uid());

-- Users can insert their own projects
CREATE POLICY "Users can insert own projects" ON public."Projeto"
    FOR INSERT WITH CHECK ("User id" = auth.uid());

-- Users can update their own projects
CREATE POLICY "Users can update own projects" ON public."Projeto"
    FOR UPDATE USING ("User id" = auth.uid())
    WITH CHECK ("User id" = auth.uid());

-- Users can delete their own projects
CREATE POLICY "Users can delete own projects" ON public."Projeto"
    FOR DELETE USING ("User id" = auth.uid());

-- =============================================
-- RLS POLICIES FOR INTEGRAÇÕES TABLE
-- =============================================

-- Users can view integrations for their projects
CREATE POLICY "Users can view own integrations" ON public."Integrações"
    FOR SELECT USING (public.user_owns_project("PROJETO id"));

-- Users can manage integrations for their projects
CREATE POLICY "Users can insert own integrations" ON public."Integrações"
    FOR INSERT WITH CHECK (public.user_owns_project("PROJETO id"));

CREATE POLICY "Users can update own integrations" ON public."Integrações"
    FOR UPDATE USING (public.user_owns_project("PROJETO id"));

CREATE POLICY "Users can delete own integrations" ON public."Integrações"
    FOR DELETE USING (public.user_owns_project("PROJETO id"));

-- =============================================
-- RLS POLICIES FOR CANAIS DO YOUTUBE TABLE
-- =============================================

CREATE POLICY "Users can view own channels" ON public."Canais do youtube"
    FOR SELECT USING (public.user_owns_project(projeto));

CREATE POLICY "Users can insert own channels" ON public."Canais do youtube"
    FOR INSERT WITH CHECK (public.user_owns_project(projeto));

CREATE POLICY "Users can update own channels" ON public."Canais do youtube"
    FOR UPDATE USING (public.user_owns_project(projeto));

CREATE POLICY "Users can delete own channels" ON public."Canais do youtube"
    FOR DELETE USING (public.user_owns_project(projeto));

-- =============================================
-- RLS POLICIES FOR VIDEOS TABLE
-- =============================================

CREATE POLICY "Users can view videos from own channels" ON public."Videos"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public."Canais do youtube" c
            WHERE c.id = canal
            AND public.user_owns_project(c.projeto)
        )
    );

CREATE POLICY "Users can manage videos from own channels" ON public."Videos"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public."Canais do youtube" c
            WHERE c.id = canal
            AND public.user_owns_project(c.projeto)
        )
    );

-- =============================================
-- RLS POLICIES FOR COMENTARIOS_PRINCIPAIS TABLE
-- =============================================

CREATE POLICY "Users can view comments from own projects" ON public."Comentarios_Principais"
    FOR SELECT USING (public.user_owns_project(project_id));

CREATE POLICY "Users can manage comments from own projects" ON public."Comentarios_Principais"
    FOR ALL USING (public.user_owns_project(project_id));

-- =============================================
-- RLS POLICIES FOR MENSAGENS TABLE
-- =============================================

CREATE POLICY "Users can view messages from own projects" ON public."Mensagens"
    FOR SELECT USING (public.user_owns_project(project_id));

CREATE POLICY "Users can manage messages from own projects" ON public."Mensagens"
    FOR ALL USING (public.user_owns_project(project_id));

-- =============================================
-- RLS POLICIES FOR CUSTOMERS TABLE
-- =============================================

-- Users can only see their own customer record
CREATE POLICY "Users can view own customer data" ON public."customers"
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own customer data" ON public."customers"
    FOR UPDATE USING (user_id = auth.uid());

-- Service role can manage all customers
CREATE POLICY "Service role can manage all customers" ON public."customers"
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- RLS POLICIES FOR SUBSCRIPTIONS TABLE
-- =============================================

CREATE POLICY "Users can view own subscriptions" ON public."subscriptions"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public."customers" c
            WHERE c.id = customer_id
            AND c.user_id = auth.uid()
        )
    );

-- Service role can manage all subscriptions
CREATE POLICY "Service role can manage subscriptions" ON public."subscriptions"
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- RLS POLICIES FOR CARDS TABLE
-- =============================================

CREATE POLICY "Users can view own cards" ON public."cards"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public."customers" c
            WHERE c.id = customer_id
            AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own cards" ON public."cards"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public."customers" c
            WHERE c.id = customer_id
            AND c.user_id = auth.uid()
        )
    );

-- =============================================
-- RLS POLICIES FOR PAYMENTS TABLE
-- =============================================

CREATE POLICY "Users can view own payments" ON public."payments"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public."subscriptions" s
            JOIN public."customers" c ON s.customer_id = c.id
            WHERE s.id = subscription_id
            AND c.user_id = auth.uid()
        )
    );

-- =============================================
-- RLS POLICIES FOR ANALYTICS TABLE
-- =============================================

CREATE POLICY "Users can view analytics for own projects" ON public."analytics"
    FOR SELECT USING (public.user_owns_project(project_id));

-- Allow insert from any source (for tracking)
CREATE POLICY "Anyone can insert analytics" ON public."analytics"
    FOR INSERT WITH CHECK (true);

-- =============================================
-- RLS POLICIES FOR AGENT CONVERSATIONS TABLE
-- =============================================

CREATE POLICY "Users can view own conversations" ON public."agent_conversations"
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own conversations" ON public."agent_conversations"
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- =============================================
-- RLS POLICIES FOR RAG EMBEDDINGS TABLE
-- =============================================

CREATE POLICY "Users can view embeddings for own projects" ON public."rag_embeddings"
    FOR SELECT USING (
        project_id IS NULL OR public.user_owns_project(project_id)
    );

-- Service role can manage all embeddings
CREATE POLICY "Service role can manage embeddings" ON public."rag_embeddings"
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- RLS POLICIES FOR PERFIL USER TABLE
-- =============================================

CREATE POLICY "Users can view own profile" ON public."Perfil user"
    FOR SELECT USING ("user" = auth.uid());

CREATE POLICY "Users can update own profile" ON public."Perfil user"
    FOR UPDATE USING ("user" = auth.uid());

CREATE POLICY "Users can insert own profile" ON public."Perfil user"
    FOR INSERT WITH CHECK ("user" = auth.uid());

-- =============================================
-- RLS POLICIES FOR EMAIL LOGS TABLE
-- =============================================

CREATE POLICY "Users can view own email logs" ON public."email_logs"
    FOR SELECT USING (user_id = auth.uid());

-- =============================================
-- RLS POLICIES FOR EMAIL TEMPLATES TABLE
-- =============================================

-- Email templates are public for reading
CREATE POLICY "Anyone can view active email templates" ON public."email_templates"
    FOR SELECT USING (is_active = true);

-- Only service role can manage templates
CREATE POLICY "Service role can manage templates" ON public."email_templates"
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- RLS POLICIES FOR CONTACT SUBMISSIONS TABLE
-- =============================================

-- Anyone can insert contact submissions
CREATE POLICY "Anyone can submit contact form" ON public."contact_submissions"
    FOR INSERT WITH CHECK (true);

-- Only service role can view/manage submissions
CREATE POLICY "Service role can manage contact submissions" ON public."contact_submissions"
    FOR SELECT USING (auth.role() = 'service_role');

-- =============================================
-- RLS POLICIES FOR SYSTEM TABLES (Service Role Only)
-- =============================================

-- These tables should only be accessible by service role
CREATE POLICY "Service role only - agent_tools" ON public."agent_tools"
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only - system_logs" ON public."system_logs"
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only - url_analyzer_rate_limit" ON public."url_analyzer_rate_limit"
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only - youtube_scan_queue" ON public."youtube_scan_queue"
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only - youtube_trends_current" ON public."youtube_trends_current"
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only - blocked_submissions" ON public."blocked_submissions"
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- GRANT PERMISSIONS TO ROLES
-- =============================================

-- Grant usage on all schemas to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant basic permissions to authenticated users on tables they need
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant sequence usage to authenticated users
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =============================================
-- VERIFY RLS IS ENABLED
-- =============================================

SELECT 'RLS policies created successfully' AS status;

-- Show tables with RLS status
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;