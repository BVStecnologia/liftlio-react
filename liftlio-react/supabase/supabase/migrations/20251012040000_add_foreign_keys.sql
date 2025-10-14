-- =============================================
-- Migration: Add Foreign Keys and Constraints
-- Date: 2025-10-12
-- Description: Add all foreign key relationships between tables
-- =============================================

-- =============================================
-- FOREIGN KEYS
-- =============================================

DO $$
BEGIN
    -- Projeto -> Auth.users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_projeto_user_id') THEN
        ALTER TABLE public."Projeto"
        ADD CONSTRAINT fk_projeto_user_id
        FOREIGN KEY ("User id") REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Integrações -> Projeto
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_integracoes_projeto') THEN
        ALTER TABLE public."Integrações"
        ADD CONSTRAINT fk_integracoes_projeto
        FOREIGN KEY ("PROJETO id") REFERENCES public."Projeto"(id) ON DELETE CASCADE;
    END IF;

    -- Configurações -> Projeto
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_configuracoes_projeto') THEN
        ALTER TABLE public."Configurações"
        ADD CONSTRAINT fk_configuracoes_projeto
        FOREIGN KEY (PROJETO) REFERENCES public."Projeto"(id) ON DELETE CASCADE;
    END IF;

    -- Notificacoes -> Projeto
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notificacoes_projeto') THEN
        ALTER TABLE public."Notificacoes"
        ADD CONSTRAINT fk_notificacoes_projeto
        FOREIGN KEY (projeto_id) REFERENCES public."Projeto"(id) ON DELETE CASCADE;
    END IF;

    -- Canais do youtube -> Projeto
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_canais_projeto') THEN
        ALTER TABLE public."Canais do youtube"
        ADD CONSTRAINT fk_canais_projeto
        FOREIGN KEY (Projeto) REFERENCES public."Projeto"(id) ON DELETE CASCADE;
    END IF;

    -- Scanner de videos do youtube -> Projeto
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_scanner_projeto') THEN
        ALTER TABLE public."Scanner de videos do youtube"
        ADD CONSTRAINT fk_scanner_projeto
        FOREIGN KEY (Projeto_id) REFERENCES public."Projeto"(id) ON DELETE CASCADE;
    END IF;

    -- Scanner de videos do youtube -> Videos
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_scanner_videos') THEN
        ALTER TABLE public."Scanner de videos do youtube"
        ADD CONSTRAINT fk_scanner_videos
        FOREIGN KEY (Videos) REFERENCES public."Videos"(id) ON DELETE SET NULL;
    END IF;

    -- Videos -> Scanner
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_videos_scanner') THEN
        ALTER TABLE public."Videos"
        ADD CONSTRAINT fk_videos_scanner
        FOREIGN KEY (scanner_id) REFERENCES public."Scanner de videos do youtube"(id) ON DELETE SET NULL;
    END IF;

    -- Videos -> Canais do youtube
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_videos_canal') THEN
        ALTER TABLE public."Videos"
        ADD CONSTRAINT fk_videos_canal
        FOREIGN KEY (canal) REFERENCES public."Canais do youtube"(id) ON DELETE CASCADE;
    END IF;

    -- Videos_trancricao -> Videos
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transcricao_video') THEN
        ALTER TABLE public."Videos_trancricao"
        ADD CONSTRAINT fk_transcricao_video
        FOREIGN KEY ("table video") REFERENCES public."Videos"(id) ON DELETE CASCADE;
    END IF;

    -- Comentarios_Principais -> Videos
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_comentarios_video') THEN
        ALTER TABLE public."Comentarios_Principais"
        ADD CONSTRAINT fk_comentarios_video
        FOREIGN KEY (video_id) REFERENCES public."Videos"(id) ON DELETE CASCADE;
    END IF;

    -- Comentarios_Principais -> Projeto
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_comentarios_projeto') THEN
        ALTER TABLE public."Comentarios_Principais"
        ADD CONSTRAINT fk_comentarios_projeto
        FOREIGN KEY (project_id) REFERENCES public."Projeto"(id) ON DELETE CASCADE;
    END IF;

    -- Respostas_Comentarios -> Videos
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_respostas_video') THEN
        ALTER TABLE public."Respostas_Comentarios"
        ADD CONSTRAINT fk_respostas_video
        FOREIGN KEY (video_id) REFERENCES public."Videos"(id) ON DELETE CASCADE;
    END IF;

    -- Respostas_Comentarios -> Comentarios_Principais
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_respostas_comentario') THEN
        ALTER TABLE public."Respostas_Comentarios"
        ADD CONSTRAINT fk_respostas_comentario
        FOREIGN KEY (comment_id) REFERENCES public."Comentarios_Principais"(id) ON DELETE CASCADE;
    END IF;

    -- Menção -> Canais do youtube
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mencao_canal') THEN
        ALTER TABLE public."Menção"
        ADD CONSTRAINT fk_mencao_canal
        FOREIGN KEY ("CANAL ID") REFERENCES public."Canais do youtube"(id) ON DELETE CASCADE;
    END IF;

    -- Menção -> Projeto
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mencao_projeto') THEN
        ALTER TABLE public."Menção"
        ADD CONSTRAINT fk_mencao_projeto
        FOREIGN KEY (PROJETO) REFERENCES public."Projeto"(id) ON DELETE CASCADE;
    END IF;

    -- Menção -> Videos
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mencao_video') THEN
        ALTER TABLE public."Menção"
        ADD CONSTRAINT fk_mencao_video
        FOREIGN KEY (video_id_table) REFERENCES public."Videos"(id) ON DELETE CASCADE;
    END IF;

    -- Menção -> Comentarios_Principais
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mencao_comment') THEN
        ALTER TABLE public."Menção"
        ADD CONSTRAINT fk_mencao_comment
        FOREIGN KEY (comment_id) REFERENCES public."Comentarios_Principais"(id) ON DELETE CASCADE;
    END IF;

    -- Mensagens -> Comentarios_Principais
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mensagens_comentario') THEN
        ALTER TABLE public."Mensagens"
        ADD CONSTRAINT fk_mensagens_comentario
        FOREIGN KEY (Comentario_Principais) REFERENCES public."Comentarios_Principais"(id) ON DELETE CASCADE;
    END IF;

    -- Mensagens -> Projeto
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mensagens_projeto') THEN
        ALTER TABLE public."Mensagens"
        ADD CONSTRAINT fk_mensagens_projeto
        FOREIGN KEY (project_id) REFERENCES public."Projeto"(id) ON DELETE CASCADE;
    END IF;

    -- Mensagens -> Videos
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mensagens_video') THEN
        ALTER TABLE public."Mensagens"
        ADD CONSTRAINT fk_mensagens_video
        FOREIGN KEY (video) REFERENCES public."Videos"(id) ON DELETE CASCADE;
    END IF;

    -- Settings messages posts -> Videos
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_settings_videos') THEN
        ALTER TABLE public."Settings messages posts"
        ADD CONSTRAINT fk_settings_videos
        FOREIGN KEY (Videos) REFERENCES public."Videos"(id) ON DELETE CASCADE;
    END IF;

    -- Settings messages posts -> Comentarios_Principais
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_settings_comentarios') THEN
        ALTER TABLE public."Settings messages posts"
        ADD CONSTRAINT fk_settings_comentarios
        FOREIGN KEY (Comentarios_Principal) REFERENCES public."Comentarios_Principais"(id) ON DELETE CASCADE;
    END IF;

    -- Settings messages posts -> Mensagens
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_settings_mensagens') THEN
        ALTER TABLE public."Settings messages posts"
        ADD CONSTRAINT fk_settings_mensagens
        FOREIGN KEY (Mensagens) REFERENCES public."Mensagens"(id) ON DELETE CASCADE;
    END IF;

    -- Settings messages posts -> Projeto
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_settings_projeto') THEN
        ALTER TABLE public."Settings messages posts"
        ADD CONSTRAINT fk_settings_projeto
        FOREIGN KEY (Projeto) REFERENCES public."Projeto"(id) ON DELETE CASCADE;
    END IF;

    -- Analytics -> Projeto
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_analytics_projeto') THEN
        ALTER TABLE public."analytics"
        ADD CONSTRAINT fk_analytics_projeto
        FOREIGN KEY (project_id) REFERENCES public."Projeto"(id) ON DELETE CASCADE;
    END IF;

    -- Customers -> Auth.users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_customers_user') THEN
        ALTER TABLE public."customers"
        ADD CONSTRAINT fk_customers_user
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Subscriptions -> Customers
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_subscriptions_customer') THEN
        ALTER TABLE public."subscriptions"
        ADD CONSTRAINT fk_subscriptions_customer
        FOREIGN KEY (customer_id) REFERENCES public."customers"(id) ON DELETE CASCADE;
    END IF;

    -- Subscriptions -> Cards
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_subscriptions_card') THEN
        ALTER TABLE public."subscriptions"
        ADD CONSTRAINT fk_subscriptions_card
        FOREIGN KEY (card_id) REFERENCES public."cards"(id) ON DELETE SET NULL;
    END IF;

    -- Cards -> Customers
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cards_customer') THEN
        ALTER TABLE public."cards"
        ADD CONSTRAINT fk_cards_customer
        FOREIGN KEY (customer_id) REFERENCES public."customers"(id) ON DELETE CASCADE;
    END IF;

    -- Payments -> Subscriptions
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_subscription') THEN
        ALTER TABLE public."payments"
        ADD CONSTRAINT fk_payments_subscription
        FOREIGN KEY (subscription_id) REFERENCES public."subscriptions"(id) ON DELETE CASCADE;
    END IF;

    -- Agent_conversations -> Auth.users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_agent_conversations_user') THEN
        ALTER TABLE public."agent_conversations"
        ADD CONSTRAINT fk_agent_conversations_user
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Agent_conversations -> Projeto
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_agent_conversations_project') THEN
        ALTER TABLE public."agent_conversations"
        ADD CONSTRAINT fk_agent_conversations_project
        FOREIGN KEY (project_id) REFERENCES public."Projeto"(id) ON DELETE CASCADE;
    END IF;

    -- RAG_embeddings -> Projeto
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_rag_embeddings_project') THEN
        ALTER TABLE public."rag_embeddings"
        ADD CONSTRAINT fk_rag_embeddings_project
        FOREIGN KEY (project_id) REFERENCES public."Projeto"(id) ON DELETE CASCADE;
    END IF;

    -- Email_logs -> Auth.users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_email_logs_user') THEN
        ALTER TABLE public."email_logs"
        ADD CONSTRAINT fk_email_logs_user
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Email_logs -> Email_templates
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_email_logs_template') THEN
        ALTER TABLE public."email_logs"
        ADD CONSTRAINT fk_email_logs_template
        FOREIGN KEY (template_id) REFERENCES public."email_templates"(id) ON DELETE SET NULL;
    END IF;

    -- Email_templates -> Auth.users (created_by, updated_by)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_email_templates_created_by') THEN
        ALTER TABLE public."email_templates"
        ADD CONSTRAINT fk_email_templates_created_by
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_email_templates_updated_by') THEN
        ALTER TABLE public."email_templates"
        ADD CONSTRAINT fk_email_templates_updated_by
        FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Youtube_scan_queue -> Canais do youtube
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_youtube_scan_queue_canal') THEN
        ALTER TABLE public."youtube_scan_queue"
        ADD CONSTRAINT fk_youtube_scan_queue_canal
        FOREIGN KEY (canal_id) REFERENCES public."Canais do youtube"(id) ON DELETE CASCADE;
    END IF;

    -- Youtube_scan_queue -> Projeto
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_youtube_scan_queue_projeto') THEN
        ALTER TABLE public."youtube_scan_queue"
        ADD CONSTRAINT fk_youtube_scan_queue_projeto
        FOREIGN KEY (projeto_id) REFERENCES public."Projeto"(id) ON DELETE CASCADE;
    END IF;

    -- Perfil user -> Auth.users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_perfil_user_auth') THEN
        ALTER TABLE public."Perfil user"
        ADD CONSTRAINT fk_perfil_user_auth
        FOREIGN KEY ("user") REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =============================================
-- CHECK CONSTRAINTS
-- =============================================

-- Add check constraints for data integrity
ALTER TABLE public."analytics" ADD CONSTRAINT check_scroll_depth CHECK (scroll_depth >= 0 AND scroll_depth <= 100);
ALTER TABLE public."analytics" ADD CONSTRAINT check_time_on_page CHECK (time_on_page >= 0);

ALTER TABLE public."subscriptions" ADD CONSTRAINT check_base_amount CHECK (base_amount >= 0);
ALTER TABLE public."subscriptions" ADD CONSTRAINT check_payment_attempts CHECK (payment_attempts >= 0);

ALTER TABLE public."payments" ADD CONSTRAINT check_amount CHECK (amount >= 0);

ALTER TABLE public."cards" ADD CONSTRAINT check_exp_month CHECK (exp_month >= 1 AND exp_month <= 12);
ALTER TABLE public."cards" ADD CONSTRAINT check_exp_year CHECK (exp_year >= 2020 AND exp_year <= 2100);

ALTER TABLE public."youtube_trends_current" ADD CONSTRAINT check_volume CHECK (volume >= 0);
ALTER TABLE public."youtube_trends_current" ADD CONSTRAINT check_scores CHECK (
    quality_score >= 0 AND quality_score <= 1 AND
    sentiment_score >= -1 AND sentiment_score <= 1
);

ALTER TABLE public."contact_submissions" ADD CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- =============================================
-- VERIFY ALL FOREIGN KEYS CREATED
-- =============================================

SELECT 'Foreign keys and constraints created successfully' AS status;

-- Show summary of constraints
SELECT
    COUNT(*) FILTER (WHERE contype = 'p') as primary_keys,
    COUNT(*) FILTER (WHERE contype = 'u') as unique_constraints,
    COUNT(*) FILTER (WHERE contype = 'f') as foreign_keys,
    COUNT(*) FILTER (WHERE contype = 'c') as check_constraints
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace;