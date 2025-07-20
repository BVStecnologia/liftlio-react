-- Script: Processamento Manual de Conversas para RAG
-- Descrição: Processa conversas do agente diretamente para embeddings
-- Autor: Claude
-- Data: 20/01/2025
-- Status: Script para execução manual

-- Função temporária para processar uma conversa
CREATE OR REPLACE FUNCTION process_single_conversation_rag(p_conversation_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_content TEXT;
    v_embedding vector(1536);
    v_project_id INTEGER;
    v_result jsonb;
BEGIN
    -- Buscar dados da conversa
    SELECT 
        prepare_rag_content_agent_conversations(id),
        project_id
    INTO v_content, v_project_id
    FROM agent_conversations
    WHERE id = p_conversation_id;
    
    IF v_content IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Conversa não encontrada');
    END IF;
    
    -- Gerar embedding via função SQL
    v_embedding := generate_openai_embedding(v_content);
    
    IF v_embedding IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Falha ao gerar embedding');
    END IF;
    
    -- Inserir no rag_embeddings
    INSERT INTO rag_embeddings (
        source_table,
        source_id,
        content,
        embedding,
        project_id,
        metadata
    ) VALUES (
        'agent_conversations',
        p_conversation_id::text,
        v_content,
        v_embedding,
        v_project_id,
        jsonb_build_object(
            'processed_at', NOW(),
            'content_length', LENGTH(v_content)
        )
    )
    ON CONFLICT (source_table, source_id, project_id) 
    DO UPDATE SET
        content = EXCLUDED.content,
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();
    
    -- Marcar como processada
    UPDATE agent_conversations
    SET rag_processed = true
    WHERE id = p_conversation_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'conversation_id', p_conversation_id,
        'content_length', LENGTH(v_content)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'conversation_id', p_conversation_id
    );
END;
$$;

-- Processar um batch de conversas
DO $$
DECLARE
    v_record RECORD;
    v_processed INTEGER := 0;
    v_errors INTEGER := 0;
    v_result jsonb;
BEGIN
    RAISE NOTICE 'Iniciando processamento de conversas para RAG...';
    
    -- Processar conversas pendentes
    FOR v_record IN 
        SELECT id, LEFT(message, 50) as preview
        FROM agent_conversations
        WHERE rag_processed = false
        AND project_id = 58
        LIMIT 10  -- Processar 10 por vez
    LOOP
        v_result := process_single_conversation_rag(v_record.id);
        
        IF (v_result->>'success')::boolean THEN
            v_processed := v_processed + 1;
            RAISE NOTICE 'Processada: % - %', v_record.id, v_record.preview;
        ELSE
            v_errors := v_errors + 1;
            RAISE NOTICE 'Erro: % - % - %', v_record.id, v_record.preview, v_result->>'error';
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Processamento concluído: % processadas, % erros', v_processed, v_errors;
END;
$$;

-- Verificar resultados
SELECT 
    'Total conversas' as metric,
    COUNT(*) as value
FROM agent_conversations
WHERE project_id = 58
UNION ALL
SELECT 
    'Conversas processadas',
    COUNT(*)
FROM agent_conversations
WHERE project_id = 58 AND rag_processed = true
UNION ALL
SELECT 
    'Embeddings criados',
    COUNT(*)
FROM rag_embeddings
WHERE source_table = 'agent_conversations'
AND project_id = 58;