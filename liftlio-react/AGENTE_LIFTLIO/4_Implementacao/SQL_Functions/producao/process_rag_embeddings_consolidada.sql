-- Função consolidada para processar embeddings de qualquer tabela
-- Criada em: 11/01/2025
-- Objetivo: Substituir múltiplas Edge Functions duplicadas por uma única SQL Function

CREATE OR REPLACE FUNCTION process_rag_embeddings(
    p_table_name TEXT,
    p_project_id BIGINT DEFAULT NULL,
    p_limit INTEGER DEFAULT 10,
    p_force_update BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    processed_count INTEGER,
    error_count INTEGER,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sql TEXT;
    v_processed INTEGER := 0;
    v_errors INTEGER := 0;
    v_record RECORD;
    v_content TEXT;
    v_embedding vector(1536);
    v_api_key TEXT;
BEGIN
    -- Buscar API key do Vault
    SELECT decrypted_secret INTO v_api_key
    FROM vault.decrypted_secrets
    WHERE name = 'OPENAI_API_KEY'
    LIMIT 1;
    
    IF v_api_key IS NULL THEN
        RETURN QUERY SELECT 0, 0, 'Error: OPENAI_API_KEY not found in vault'::TEXT;
        RETURN;
    END IF;

    -- Validar tabela
    IF p_table_name NOT IN ('Mensagens', 'Videos_transcricao', 'Comentarios_Principais', 'Projeto') THEN
        RETURN QUERY SELECT 0, 0, format('Error: Table %s not supported', p_table_name)::TEXT;
        RETURN;
    END IF;

    -- Construir query dinamicamente baseada na tabela
    CASE p_table_name
        WHEN 'Mensagens' THEN
            v_sql := format($sql$
                SELECT id, project_id, 
                       prepare_rag_content_mensagens_v2(id) as content
                FROM %I
                WHERE ($1 IS NULL OR project_id = $1)
                AND (rag_processed = FALSE OR $2 = TRUE)
                ORDER BY created_at DESC
                LIMIT $3
            $sql$, p_table_name);
            
        WHEN 'Videos_transcricao' THEN
            v_sql := format($sql$
                SELECT id, project_id,
                       prepare_rag_content_transcricao_v2(id) as content
                FROM %I
                WHERE ($1 IS NULL OR project_id = $1)
                AND (rag_processed = FALSE OR $2 = TRUE)
                ORDER BY created_at DESC
                LIMIT $3
            $sql$, p_table_name);
            
        WHEN 'Comentarios_Principais' THEN
            v_sql := format($sql$
                SELECT id, project_id,
                       prepare_rag_content_comentarios_v2(id) as content
                FROM %I
                WHERE ($1 IS NULL OR project_id = $1)
                AND (rag_processed = FALSE OR $2 = TRUE)
                ORDER BY created_at DESC
                LIMIT $3
            $sql$, p_table_name);
            
        WHEN 'Projeto' THEN
            v_sql := format($sql$
                SELECT id, id as project_id,
                       prepare_rag_content_projeto_v2(id) as content
                FROM %I
                WHERE ($1 IS NULL OR id = $1)
                AND (rag_processed = FALSE OR $2 = TRUE)
                LIMIT $3
            $sql$, p_table_name);
    END CASE;

    -- Processar registros
    FOR v_record IN EXECUTE v_sql USING p_project_id, p_force_update, p_limit
    LOOP
        BEGIN
            v_content := v_record.content;
            
            -- Pular se conteúdo vazio
            IF v_content IS NULL OR length(v_content) < 10 THEN
                CONTINUE;
            END IF;
            
            -- Gerar embedding usando a função auxiliar
            v_embedding := generate_openai_embedding(v_content, v_api_key);
            
            -- Inserir ou atualizar embedding
            INSERT INTO rag_embeddings (
                table_name,
                record_id,
                project_id,
                content,
                embedding,
                metadata
            ) VALUES (
                p_table_name,
                v_record.id,
                v_record.project_id,
                v_content,
                v_embedding,
                jsonb_build_object(
                    'processed_at', now(),
                    'content_length', length(v_content)
                )
            )
            ON CONFLICT (table_name, record_id) 
            DO UPDATE SET
                content = EXCLUDED.content,
                embedding = EXCLUDED.embedding,
                metadata = EXCLUDED.metadata,
                updated_at = now();
            
            -- Marcar como processado
            EXECUTE format('UPDATE %I SET rag_processed = TRUE WHERE id = $1', p_table_name)
            USING v_record.id;
            
            v_processed := v_processed + 1;
            
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            RAISE WARNING 'Error processing record % from %: %', v_record.id, p_table_name, SQLERRM;
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_processed, v_errors, 'Success'::TEXT;
END;
$$;

-- Dar permissões
GRANT EXECUTE ON FUNCTION process_rag_embeddings TO service_role;

-- Comentário
COMMENT ON FUNCTION process_rag_embeddings IS 'Função consolidada para processar embeddings RAG de qualquer tabela suportada';

-- Exemplos de uso:
-- SELECT * FROM process_rag_embeddings('Mensagens', 71, 10);  -- Processar 10 mensagens do projeto 71
-- SELECT * FROM process_rag_embeddings('Videos_transcricao', NULL, 50);  -- Processar 50 vídeos de qualquer projeto
-- SELECT * FROM process_rag_embeddings('Projeto', 58, 1, TRUE);  -- Reprocessar projeto 58