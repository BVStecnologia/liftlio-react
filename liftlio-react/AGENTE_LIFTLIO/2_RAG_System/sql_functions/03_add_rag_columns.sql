-- 🔧 Adicionar colunas de controle RAG em todas as tabelas
-- Permite rastrear quais registros já foram processados
-- Criado via MCP em: 09/01/2025

-- Função genérica para adicionar colunas RAG
CREATE OR REPLACE FUNCTION add_rag_columns_to_table(table_name text)
RETURNS void AS $$
BEGIN
    -- Adicionar coluna rag_processed se não existir
    EXECUTE format('
        ALTER TABLE %I 
        ADD COLUMN IF NOT EXISTS rag_processed BOOLEAN DEFAULT FALSE
    ', table_name);
    
    -- Adicionar coluna rag_processed_at se não existir
    EXECUTE format('
        ALTER TABLE %I 
        ADD COLUMN IF NOT EXISTS rag_processed_at TIMESTAMP WITH TIME ZONE
    ', table_name);
    
    -- Criar índice para queries eficientes
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_%s_rag_processed 
        ON %I(rag_processed) 
        WHERE rag_processed = FALSE
    ', table_name, table_name);
    
    -- Adicionar comentários
    EXECUTE format('
        COMMENT ON COLUMN %I.rag_processed IS ''Indica se o registro foi processado para RAG embeddings''
    ', table_name);
    
    EXECUTE format('
        COMMENT ON COLUMN %I.rag_processed_at IS ''Timestamp de quando foi processado para RAG''
    ', table_name);
    
    RAISE NOTICE 'Colunas RAG adicionadas à tabela %', table_name;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em todas as tabelas configuradas
DO $$
DECLARE
    tabelas text[] := ARRAY[
        'Videos_trancricao',
        'Comentarios_Principais',
        'Mensagens',
        'Videos',
        'Respostas_Comentarios',
        'Scanner de videos',
        'Canais do youtube',
        'Projeto',
        'Integrações',
        'Notificacoes',
        'cards',
        'customers',
        'payments',
        'subscriptions'
    ];
    tabela text;
BEGIN
    FOREACH tabela IN ARRAY tabelas
    LOOP
        PERFORM add_rag_columns_to_table(tabela);
    END LOOP;
END $$;

-- Função para contar registros pendentes de processamento
CREATE OR REPLACE FUNCTION count_pending_rag_records()
RETURNS TABLE (
    table_name text,
    pending_count bigint,
    processed_count bigint,
    total_count bigint
) AS $$
DECLARE
    tabelas text[] := ARRAY[
        'Videos_trancricao',
        'Comentarios_Principais',
        'Mensagens',
        'Videos',
        'Respostas_Comentarios',
        'Scanner de videos',
        'Canais do youtube',
        'Projeto',
        'Integrações',
        'Notificacoes',
        'cards',
        'customers',
        'payments',
        'subscriptions'
    ];
    tabela text;
BEGIN
    FOREACH tabela IN ARRAY tabelas
    LOOP
        RETURN QUERY EXECUTE format('
            SELECT 
                %L as table_name,
                COUNT(*) FILTER (WHERE rag_processed = FALSE OR rag_processed IS NULL) as pending_count,
                COUNT(*) FILTER (WHERE rag_processed = TRUE) as processed_count,
                COUNT(*) as total_count
            FROM %I
        ', tabela, tabela);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Exemplo de uso:
-- SELECT * FROM count_pending_rag_records() ORDER BY pending_count DESC;