-- Criar todas as funções prepare_rag_content para cada tabela
-- Criado em: 11/01/2025
-- Descrição: Funções para preparar conteúdo de cada tabela para embeddings RAG

-- 1. Mensagens
CREATE OR REPLACE FUNCTION prepare_rag_content_mensagens(p_id BIGINT)
RETURNS TEXT AS $$
DECLARE
    v_content TEXT;
BEGIN
    SELECT 
        COALESCE('Mensagem: ' || mensagem, '') || 
        CASE 
            WHEN justificativa IS NOT NULL THEN ' | Justificativa: ' || justificativa 
            ELSE '' 
        END ||
        CASE 
            WHEN tipo_msg IS NOT NULL THEN ' | Tipo: ' || tipo_msg 
            ELSE '' 
        END
    INTO v_content
    FROM "Mensagens"
    WHERE id = p_id;
    
    RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- 2. Comentarios_Principais
CREATE OR REPLACE FUNCTION prepare_rag_content_comentarios_principais(p_id BIGINT)
RETURNS TEXT AS $$
DECLARE
    v_content TEXT;
BEGIN
    SELECT 
        COALESCE('Comentário: ' || text_display, '') || 
        CASE 
            WHEN author_name IS NOT NULL THEN ' | Autor: ' || author_name 
            ELSE '' 
        END ||
        CASE 
            WHEN justificativa IS NOT NULL THEN ' | Análise: ' || justificativa 
            ELSE '' 
        END ||
        CASE 
            WHEN like_count > 0 THEN ' | Likes: ' || like_count::TEXT 
            ELSE '' 
        END
    INTO v_content
    FROM "Comentarios_Principais"
    WHERE id = p_id;
    
    RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- 3. Videos
CREATE OR REPLACE FUNCTION prepare_rag_content_videos(p_id BIGINT)
RETURNS TEXT AS $$
DECLARE
    v_content TEXT;
BEGIN
    SELECT 
        COALESCE('Vídeo: ' || video_title, '') || 
        CASE 
            WHEN video_description IS NOT NULL THEN ' | Descrição: ' || LEFT(video_description, 500) 
            ELSE '' 
        END ||
        CASE 
            WHEN canal IS NOT NULL THEN ' | Canal: ' || canal 
            ELSE '' 
        END ||
        CASE 
            WHEN view_count IS NOT NULL THEN ' | Views: ' || view_count::TEXT 
            ELSE '' 
        END ||
        CASE 
            WHEN ai_analysis_summary IS NOT NULL THEN ' | Análise AI: ' || ai_analysis_summary 
            ELSE '' 
        END
    INTO v_content
    FROM "Videos"
    WHERE id = p_id;
    
    RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- 4. Respostas_Comentarios
CREATE OR REPLACE FUNCTION prepare_rag_content_respostas_comentarios(p_id BIGINT)
RETURNS TEXT AS $$
DECLARE
    v_content TEXT;
BEGIN
    SELECT 
        COALESCE('Resposta: ' || text_display, '') || 
        CASE 
            WHEN author_name IS NOT NULL THEN ' | Autor: ' || author_name 
            ELSE '' 
        END ||
        CASE 
            WHEN like_count > 0 THEN ' | Likes: ' || like_count::TEXT 
            ELSE '' 
        END
    INTO v_content
    FROM "Respostas_Comentarios"
    WHERE id = p_id;
    
    RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- 5. Videos_trancricao
CREATE OR REPLACE FUNCTION prepare_rag_content_videos_trancricao(p_id BIGINT)
RETURNS TEXT AS $$
DECLARE
    v_content TEXT;
BEGIN
    SELECT 
        'Transcrição do vídeo ' || video_id || ': ' || 
        LEFT(trancription, 1000) -- Primeiros 1000 caracteres
    INTO v_content
    FROM "Videos_trancricao"
    WHERE id = p_id;
    
    RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- 6. Scanner de videos do youtube
CREATE OR REPLACE FUNCTION prepare_rag_content_scanner(p_id BIGINT)
RETURNS TEXT AS $$
DECLARE
    v_content TEXT;
BEGIN
    SELECT 
        COALESCE('Scanner de palavras-chave: ' || "Keyword", '') || 
        CASE 
            WHEN "Palavras chaves novas" IS NOT NULL THEN ' | Novas: ' || "Palavras chaves novas" 
            ELSE '' 
        END ||
        CASE 
            WHEN "Videos" IS NOT NULL THEN ' | Total vídeos: ' || "Videos"::TEXT 
            ELSE '' 
        END
    INTO v_content
    FROM "Scanner de videos do youtube"
    WHERE id = p_id;
    
    RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- 7. Canais do youtube
CREATE OR REPLACE FUNCTION prepare_rag_content_canais(p_id BIGINT)
RETURNS TEXT AS $$
DECLARE
    v_content TEXT;
BEGIN
    SELECT 
        COALESCE('Canal: ' || "Nome", '') || 
        CASE 
            WHEN description IS NOT NULL THEN ' | Descrição: ' || LEFT(description, 300) 
            ELSE '' 
        END ||
        CASE 
            WHEN subscriber_count IS NOT NULL THEN ' | Inscritos: ' || subscriber_count::TEXT 
            ELSE '' 
        END ||
        CASE 
            WHEN video_count IS NOT NULL THEN ' | Total vídeos: ' || video_count::TEXT 
            ELSE '' 
        END
    INTO v_content
    FROM "Canais do youtube"
    WHERE id = p_id;
    
    RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- 8. Notificacoes
CREATE OR REPLACE FUNCTION prepare_rag_content_notificacoes(p_id BIGINT)
RETURNS TEXT AS $$
DECLARE
    v_content TEXT;
BEGIN
    SELECT 
        COALESCE('Notificação: ' || "Mensagem", '') || 
        CASE 
            WHEN url IS NOT NULL THEN ' | URL: ' || url 
            ELSE '' 
        END ||
        CASE 
            WHEN comando IS NOT NULL THEN ' | Comando: ' || comando 
            ELSE '' 
        END
    INTO v_content
    FROM "Notificacoes"
    WHERE id = p_id;
    
    RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- 9. Integrações
CREATE OR REPLACE FUNCTION prepare_rag_content_integracoes(p_id BIGINT)
RETURNS TEXT AS $$
DECLARE
    v_content TEXT;
BEGIN
    SELECT 
        COALESCE('Integração: ' || "Tipo de integração", '') || 
        CASE 
            WHEN ativo THEN ' | Status: Ativa' 
            ELSE ' | Status: Inativa' 
        END ||
        CASE 
            WHEN "expira em" IS NOT NULL THEN ' | Expira: ' || "expira em"::TEXT 
            ELSE '' 
        END
    INTO v_content
    FROM "Integrações"
    WHERE id = p_id;
    
    RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- 10. Projeto
CREATE OR REPLACE FUNCTION prepare_rag_content_projeto(p_id BIGINT)
RETURNS TEXT AS $$
DECLARE
    v_content TEXT;
BEGIN
    SELECT 
        COALESCE('Projeto: ' || "Project name", '') || 
        CASE 
            WHEN "description service" IS NOT NULL THEN ' | Descrição: ' || "description service" 
            ELSE '' 
        END ||
        CASE 
            WHEN "Keywords" IS NOT NULL THEN ' | Palavras-chave: ' || "Keywords" 
            ELSE '' 
        END ||
        CASE 
            WHEN "Search" IS NOT NULL THEN ' | Busca: ' || "Search" 
            ELSE '' 
        END
    INTO v_content
    FROM "Projeto"
    WHERE id = p_id;
    
    RETURN v_content;
END;
$$ LANGUAGE plpgsql;