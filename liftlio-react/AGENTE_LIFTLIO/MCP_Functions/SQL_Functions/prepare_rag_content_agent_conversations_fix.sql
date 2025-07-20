-- Função: prepare_rag_content_agent_conversations (FIX)
-- Descrição: Prepara conteúdo das conversas do agente para busca RAG
-- Autor: Claude
-- Data: 20/01/2025
-- Status: Aplicada via MCP

-- NOTA: A função já existe no banco mas com formato diferente
-- Esta é a versão melhorada que adiciona contexto completo

CREATE OR REPLACE FUNCTION prepare_rag_content_agent_conversations(p_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_record RECORD;
    v_content TEXT := '';
    v_session_context TEXT := '';
BEGIN
    -- Buscar registro da conversa
    SELECT 
        ac.*,
        u.email as user_email,
        p."Nome" as project_name
    INTO v_record
    FROM agent_conversations ac
    LEFT JOIN auth.users u ON u.id = ac.user_id
    LEFT JOIN "Projeto" p ON p.id = ac.project_id
    WHERE ac.id = p_id;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Construir conteúdo para busca semântica
    v_content := '';
    
    -- Adicionar tipo de mensagem
    IF v_record.message_type = 'user' THEN
        v_content := 'Usuário perguntou: ';
    ELSE
        v_content := 'Assistente respondeu: ';
    END IF;
    
    -- Adicionar mensagem principal
    v_content := v_content || v_record.message;
    
    -- Adicionar contexto da sessão
    IF v_record.session_id IS NOT NULL THEN
        -- Buscar contexto da sessão (primeiras mensagens)
        SELECT string_agg(
            CASE 
                WHEN message_type = 'user' THEN 'Usuário: ' 
                ELSE 'Assistente: ' 
            END || LEFT(message, 100) || '...',
            ' | ' 
            ORDER BY created_at
        ) INTO v_session_context
        FROM (
            SELECT message, message_type, created_at
            FROM agent_conversations
            WHERE session_id = v_record.session_id
            AND id != p_id
            ORDER BY created_at
            LIMIT 3
        ) sub;
        
        IF v_session_context IS NOT NULL THEN
            v_content := v_content || ' [Contexto da conversa: ' || v_session_context || ']';
        END IF;
    END IF;
    
    -- Adicionar metadata importante
    IF v_record.metadata IS NOT NULL THEN
        -- Extrair informações do usuário se existirem
        IF v_record.metadata->>'extracted_info' IS NOT NULL THEN
            DECLARE
                v_extracted jsonb := v_record.metadata->'extracted_info';
            BEGIN
                IF v_extracted->>'userName' IS NOT NULL THEN
                    v_content := v_content || ' [Nome do usuário: ' || (v_extracted->>'userName') || ']';
                END IF;
                IF v_extracted->>'userCompany' IS NOT NULL THEN
                    v_content := v_content || ' [Empresa: ' || (v_extracted->>'userCompany') || ']';
                END IF;
                IF v_extracted->>'keyTopics' IS NOT NULL THEN
                    v_content := v_content || ' [Tópicos: ' || (v_extracted->>'keyTopics') || ']';
                END IF;
            END;
        END IF;
        
        -- Adicionar categorias se existirem
        IF v_record.metadata->>'categories' IS NOT NULL THEN
            v_content := v_content || ' [Categorias: ' || (v_record.metadata->>'categories') || ']';
        END IF;
    END IF;
    
    -- Adicionar informações do projeto
    IF v_record.project_name IS NOT NULL THEN
        v_content := v_content || ' [Projeto: ' || v_record.project_name || ']';
    END IF;
    
    -- Adicionar timestamp
    v_content := v_content || ' [Data: ' || to_char(v_record.created_at, 'DD/MM/YYYY HH24:MI') || ']';
    
    RETURN v_content;
END;
$$;

-- Configuração da tabela
ALTER TABLE agent_conversations 
ADD COLUMN IF NOT EXISTS rag_processed BOOLEAN DEFAULT FALSE;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_agent_conversations_rag 
ON agent_conversations(rag_processed, project_id) 
WHERE rag_processed = false;