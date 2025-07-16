-- Função para monitorar cobertura do RAG por projeto
-- Mostra o status de processamento de cada tabela
-- Autor: Valdair & Claude
-- Data: 13/01/2025

DROP FUNCTION IF EXISTS monitor_rag_coverage(INTEGER);
DROP FUNCTION IF EXISTS rag_coverage_summary(INTEGER);

CREATE OR REPLACE FUNCTION monitor_rag_coverage(p_project_id INTEGER)
RETURNS TABLE (
  table_name TEXT,
  total_records BIGINT,
  processed_records BIGINT,
  pending_records BIGINT,  
  coverage_percent NUMERIC,
  last_processed TIMESTAMPTZ,
  status TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH rag_status AS (
    SELECT 
      source_table,
      COUNT(DISTINCT source_id) as processed_count,
      MAX(created_at) as last_update
    FROM rag_embeddings
    WHERE project_id = p_project_id
    GROUP BY source_table
  ),
  table_counts AS (
    -- Mensagens
    SELECT 
      'Mensagens' as tbl,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE rag_processed = true) as processed,
      COUNT(*) FILTER (WHERE rag_processed = false OR rag_processed IS NULL) as pending
    FROM "Mensagens"
    WHERE "ProjetoID" = p_project_id  -- Corrigido
    
    UNION ALL
    
    -- Comentários Principais
    SELECT 
      'Comentarios_Principais',
      COUNT(*),
      COUNT(*) FILTER (WHERE rag_processed = true),
      COUNT(*) FILTER (WHERE rag_processed = false OR rag_processed IS NULL)
    FROM "Comentarios_Principais"
    WHERE "ProjetoID" = p_project_id  -- Corrigido
    
    UNION ALL
    
    -- Videos (via scanner)
    SELECT 
      'Videos',
      COUNT(*),
      COUNT(*) FILTER (WHERE v.rag_processed = true),
      COUNT(*) FILTER (WHERE v.rag_processed = false OR v.rag_processed IS NULL)
    FROM "Videos" v
    JOIN "Scanner de videos do youtube" s ON s.id = v.scanner_id
    WHERE s."Projeto_id" = p_project_id
    
    UNION ALL
    
    -- Respostas Comentários
    SELECT 
      'Respostas_Comentarios',
      COUNT(*),
      COUNT(*) FILTER (WHERE rag_processed = true),
      COUNT(*) FILTER (WHERE rag_processed = false OR rag_processed IS NULL)
    FROM "Respostas_Comentarios"
    WHERE "ProjetoID" = p_project_id  -- Corrigido
    
    UNION ALL
    
    -- Settings messages posts
    SELECT 
      'Settings_messages_posts',
      COUNT(*),
      COUNT(*) FILTER (WHERE rag_processed = true),
      COUNT(*) FILTER (WHERE rag_processed = false OR rag_processed IS NULL)
    FROM "Settings messages posts"
    WHERE project_id = p_project_id  -- Este está correto
  )
  SELECT 
    tc.tbl,
    tc.total,
    tc.processed,
    tc.pending,
    CASE 
      WHEN tc.total = 0 THEN 100
      ELSE ROUND((tc.processed::numeric / tc.total) * 100, 2)
    END as coverage_pct,
    rs.last_update,
    CASE 
      WHEN tc.total = 0 THEN '🔵 Sem dados'
      WHEN tc.processed = tc.total THEN '✅ Completo'
      WHEN tc.processed > 0 THEN '⚠️ Parcial (' || tc.processed || '/' || tc.total || ')'
      ELSE '❌ Não processado'
    END as status_text
  FROM table_counts tc
  LEFT JOIN rag_status rs ON tc.tbl = rs.source_table
  ORDER BY tc.tbl;
END;
$$;

-- Criar também uma versão resumida
CREATE OR REPLACE FUNCTION rag_coverage_summary(p_project_id INTEGER)
RETURNS TABLE (
  total_tables INTEGER,
  fully_processed INTEGER,
  partially_processed INTEGER,
  not_processed INTEGER,
  overall_coverage NUMERIC,
  total_embeddings BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH coverage AS (
    SELECT * FROM monitor_rag_coverage(p_project_id)
  )
  SELECT 
    COUNT(*)::INTEGER as total_tables,
    COUNT(*) FILTER (WHERE coverage_percent = 100)::INTEGER as fully_processed,
    COUNT(*) FILTER (WHERE coverage_percent > 0 AND coverage_percent < 100)::INTEGER as partially_processed,
    COUNT(*) FILTER (WHERE coverage_percent = 0)::INTEGER as not_processed,
    ROUND(AVG(coverage_percent), 2) as overall_coverage,
    SUM(processed_records) as total_embeddings
  FROM coverage;
END;
$$;