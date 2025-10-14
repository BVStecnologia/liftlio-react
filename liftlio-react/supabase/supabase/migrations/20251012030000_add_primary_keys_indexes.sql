-- =============================================
-- Migration: Add Primary Keys and Indexes
-- Date: 2025-10-12
-- Description: Add all primary keys and essential indexes for performance
-- =============================================

-- =============================================
-- PRIMARY KEYS
-- =============================================

-- Add primary keys to all tables (if not exists)
DO $$
BEGIN
    -- Core tables
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Projeto_pkey') THEN
        ALTER TABLE public."Projeto" ADD CONSTRAINT "Projeto_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Integrações_pkey') THEN
        ALTER TABLE public."Integrações" ADD CONSTRAINT "Integrações_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Configurações_pkey') THEN
        ALTER TABLE public."Configurações" ADD CONSTRAINT "Configurações_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notificacoes_pkey') THEN
        ALTER TABLE public."Notificacoes" ADD CONSTRAINT "Notificacoes_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Perfil user_pkey') THEN
        ALTER TABLE public."Perfil user" ADD CONSTRAINT "Perfil user_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Página de busca youtube_pkey') THEN
        ALTER TABLE public."Página de busca youtube" ADD CONSTRAINT "Página de busca youtube_pkey" PRIMARY KEY (id);
    END IF;

    -- YouTube tables
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Canais do youtube_pkey') THEN
        ALTER TABLE public."Canais do youtube" ADD CONSTRAINT "Canais do youtube_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Videos_pkey') THEN
        ALTER TABLE public."Videos" ADD CONSTRAINT "Videos_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Videos_trancricao_pkey') THEN
        ALTER TABLE public."Videos_trancricao" ADD CONSTRAINT "Videos_trancricao_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Scanner de videos do youtube_pkey') THEN
        ALTER TABLE public."Scanner de videos do youtube" ADD CONSTRAINT "Scanner de videos do youtube_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Comentarios_Principais_pkey') THEN
        ALTER TABLE public."Comentarios_Principais" ADD CONSTRAINT "Comentarios_Principais_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Respostas_Comentarios_pkey') THEN
        ALTER TABLE public."Respostas_Comentarios" ADD CONSTRAINT "Respostas_Comentarios_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Menção_pkey') THEN
        ALTER TABLE public."Menção" ADD CONSTRAINT "Menção_pkey" PRIMARY KEY (id);
    END IF;

    -- Messaging tables
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Mensagens_pkey') THEN
        ALTER TABLE public."Mensagens" ADD CONSTRAINT "Mensagens_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Settings messages posts_pkey') THEN
        ALTER TABLE public."Settings messages posts" ADD CONSTRAINT "Settings messages posts_pkey" PRIMARY KEY (id);
    END IF;

    -- Customer tables
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_pkey') THEN
        ALTER TABLE public."customers" ADD CONSTRAINT "customers_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_pkey') THEN
        ALTER TABLE public."subscriptions" ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cards_pkey') THEN
        ALTER TABLE public."cards" ADD CONSTRAINT "cards_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_pkey') THEN
        ALTER TABLE public."payments" ADD CONSTRAINT "payments_pkey" PRIMARY KEY (id);
    END IF;

    -- Analytics and AI tables
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analytics_pkey') THEN
        ALTER TABLE public."analytics" ADD CONSTRAINT "analytics_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rag_embeddings_pkey') THEN
        ALTER TABLE public."rag_embeddings" ADD CONSTRAINT "rag_embeddings_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_conversations_pkey') THEN
        ALTER TABLE public."agent_conversations" ADD CONSTRAINT "agent_conversations_pkey" PRIMARY KEY (id);
    END IF;

    -- System tables
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_tools_pkey') THEN
        ALTER TABLE public."agent_tools" ADD CONSTRAINT "agent_tools_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_logs_pkey') THEN
        ALTER TABLE public."system_logs" ADD CONSTRAINT "system_logs_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'url_analyzer_rate_limit_pkey') THEN
        ALTER TABLE public."url_analyzer_rate_limit" ADD CONSTRAINT "url_analyzer_rate_limit_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'youtube_scan_queue_pkey') THEN
        ALTER TABLE public."youtube_scan_queue" ADD CONSTRAINT "youtube_scan_queue_pkey" PRIMARY KEY (id);
    END IF;

    -- Email tables
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_templates_pkey') THEN
        ALTER TABLE public."email_templates" ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_logs_pkey') THEN
        ALTER TABLE public."email_logs" ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY (id);
    END IF;

    -- Other tables
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'youtube_trends_current_pkey') THEN
        ALTER TABLE public."youtube_trends_current" ADD CONSTRAINT "youtube_trends_current_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_submissions_pkey') THEN
        ALTER TABLE public."contact_submissions" ADD CONSTRAINT "contact_submissions_pkey" PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blocked_submissions_pkey') THEN
        ALTER TABLE public."blocked_submissions" ADD CONSTRAINT "blocked_submissions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Projeto indexes
CREATE INDEX IF NOT EXISTS idx_projeto_user_id ON public."Projeto"("User id");
CREATE INDEX IF NOT EXISTS idx_projeto_status ON public."Projeto"(status);
CREATE INDEX IF NOT EXISTS idx_projeto_created_at ON public."Projeto"(created_at);

-- Integrações indexes
CREATE INDEX IF NOT EXISTS idx_integracoes_projeto_id ON public."Integrações"("PROJETO id");
CREATE INDEX IF NOT EXISTS idx_integracoes_ativo ON public."Integrações"(ativo);
CREATE INDEX IF NOT EXISTS idx_integracoes_tipo ON public."Integrações"("Tipo de integração");

-- Canais do youtube indexes
CREATE INDEX IF NOT EXISTS idx_canais_projeto ON public."Canais do youtube"(projeto);
CREATE INDEX IF NOT EXISTS idx_canais_channel_id ON public."Canais do youtube"(channel_id);
CREATE INDEX IF NOT EXISTS idx_canais_is_active ON public."Canais do youtube"(is_active);
CREATE INDEX IF NOT EXISTS idx_canais_ranking_score ON public."Canais do youtube"(ranking_score);

-- Videos indexes
CREATE INDEX IF NOT EXISTS idx_videos_canal ON public."Videos"(canal);
CREATE INDEX IF NOT EXISTS idx_videos_scanner_id ON public."Videos"(scanner_id);
CREATE INDEX IF NOT EXISTS idx_videos_video_id ON public."Videos"(VIDEO);
CREATE INDEX IF NOT EXISTS idx_videos_monitored ON public."Videos"(monitored);
CREATE INDEX IF NOT EXISTS idx_videos_relevance_score ON public."Videos"(relevance_score);

-- Comentarios_Principais indexes
CREATE INDEX IF NOT EXISTS idx_comentarios_video_id ON public."Comentarios_Principais"(video_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_project_id ON public."Comentarios_Principais"(project_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_led ON public."Comentarios_Principais"(led);
CREATE INDEX IF NOT EXISTS idx_comentarios_analizado ON public."Comentarios_Principais"(comentario_analizado);
CREATE INDEX IF NOT EXISTS idx_comentarios_id_do_comentario ON public."Comentarios_Principais"(id_do_comentario);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_comentarios_search_vector ON public."Comentarios_Principais" USING GIN(search_vector);

-- Respostas_Comentarios indexes
CREATE INDEX IF NOT EXISTS idx_respostas_video_id ON public."Respostas_Comentarios"(video_id);
CREATE INDEX IF NOT EXISTS idx_respostas_parent_comment_id ON public."Respostas_Comentarios"(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_respostas_comment_id ON public."Respostas_Comentarios"(comment_id);

-- Mensagens indexes
CREATE INDEX IF NOT EXISTS idx_mensagens_project_id ON public."Mensagens"(project_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_video ON public."Mensagens"(video);
CREATE INDEX IF NOT EXISTS idx_mensagens_respondido ON public."Mensagens"(respondido);
CREATE INDEX IF NOT EXISTS idx_mensagens_aprove ON public."Mensagens"(aprove);
CREATE INDEX IF NOT EXISTS idx_mensagens_youtube_comment_id ON public."Mensagens"(youtube_comment_id);

-- Settings messages posts indexes
CREATE INDEX IF NOT EXISTS idx_settings_projeto ON public."Settings messages posts"(projeto);
CREATE INDEX IF NOT EXISTS idx_settings_videos ON public."Settings messages posts"(videos);
CREATE INDEX IF NOT EXISTS idx_settings_mensagens ON public."Settings messages posts"(mensagens);
CREATE INDEX IF NOT EXISTS idx_settings_proxima_postagem ON public."Settings messages posts"(proxima_postagem);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_project_id ON public."analytics"(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_visitor_id ON public."analytics"(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public."analytics"(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public."analytics"(event_type);

-- RAG embeddings indexes
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_source_table ON public."rag_embeddings"(source_table);
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_source_id ON public."rag_embeddings"(source_id);

-- Create project_id index only if column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'rag_embeddings'
        AND column_name = 'project_id'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_rag_embeddings_project_id') THEN
            CREATE INDEX idx_rag_embeddings_project_id ON public."rag_embeddings"(project_id);
        END IF;
    END IF;
END $$;

-- Vector similarity index
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_embedding ON public."rag_embeddings" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Agent conversations indexes
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id ON public."agent_conversations"(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_session_id ON public."agent_conversations"(session_id);

-- Create project_id index only if column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'agent_conversations'
        AND column_name = 'project_id'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_agent_conversations_project_id') THEN
            CREATE INDEX idx_agent_conversations_project_id ON public."agent_conversations"(project_id);
        END IF;
    END IF;
END $$;

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public."customers"(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public."customers"(email);
CREATE INDEX IF NOT EXISTS idx_customers_square_customer_id ON public."customers"(square_customer_id);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON public."subscriptions"(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public."subscriptions"(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON public."subscriptions"(next_billing_date);

-- System logs indexes (partitioning would be better for this large table)
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public."system_logs"(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_operation ON public."system_logs"(operation);
CREATE INDEX IF NOT EXISTS idx_system_logs_success ON public."system_logs"(success);

-- YouTube scan queue indexes
CREATE INDEX IF NOT EXISTS idx_youtube_scan_queue_canal_id ON public."youtube_scan_queue"(canal_id);
CREATE INDEX IF NOT EXISTS idx_youtube_scan_queue_projeto_id ON public."youtube_scan_queue"(projeto_id);
CREATE INDEX IF NOT EXISTS idx_youtube_scan_queue_status ON public."youtube_scan_queue"(status);
CREATE INDEX IF NOT EXISTS idx_youtube_scan_queue_priority ON public."youtube_scan_queue"(priority);

-- Email indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON public."email_logs"(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_id ON public."email_logs"(template_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public."email_logs"(created_at);

-- Contact submissions indexes
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON public."contact_submissions"(email);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public."contact_submissions"(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON public."contact_submissions"(created_at);

-- =============================================
-- UNIQUE CONSTRAINTS
-- =============================================

-- Unique constraints for critical fields
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_customers_email ON public."customers"(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_customers_square_id ON public."customers"(square_customer_id) WHERE square_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_canais_channel_id ON public."Canais do youtube"(channel_id) WHERE channel_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_comentarios_id ON public."Comentarios_Principais"(id_do_comentario);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_agent_tools_name ON public."agent_tools"(name);

-- =============================================
-- VERIFY ALL CONSTRAINTS CREATED
-- =============================================

SELECT 'Primary keys and indexes created successfully' AS status;

-- Show summary of constraints
SELECT
    COUNT(*) FILTER (WHERE contype = 'p') as primary_keys,
    COUNT(*) FILTER (WHERE contype = 'u') as unique_constraints,
    COUNT(*) FILTER (WHERE contype = 'f') as foreign_keys,
    COUNT(*) FILTER (WHERE contype = 'c') as check_constraints
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace;