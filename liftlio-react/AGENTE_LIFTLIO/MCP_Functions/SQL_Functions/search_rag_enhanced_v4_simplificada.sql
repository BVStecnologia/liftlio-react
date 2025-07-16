-- Versão simplificada da busca RAG - v4 FUNCIONANDO
-- Data: 14/01/2025
-- Corrige erros de UNION e GROUP BY

DROP FUNCTION IF EXISTS search_rag_enhanced(vector,integer,text,text[],integer,double precision);

CREATE OR REPLACE FUNCTION search_rag_enhanced(
  p_query_embedding vector(1536),
  p_project_id integer,
  p_search_text text DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_min_similarity float DEFAULT 0.4
)
RETURNS TABLE (
  content text,
  source_table text,
  similarity float,
  metadata jsonb,
  relevance_score float,
  created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se tem texto de busca com "agendad" ou "scheduled", buscar mensagens agendadas primeiro
  IF p_search_text IS NOT NULL AND p_search_text ~* 'agendad|scheduled' THEN
    RETURN QUERY
    SELECT 
      ('Mensagem agendada para ' || TO_CHAR(s.proxima_postagem, 'DD/MM/YYYY HH24:MI') || 
      COALESCE(': ' || m.mensagem, ''))::text as content,
      'Settings messages posts'::text as source_table,
      0.9::float as similarity,
      jsonb_build_object(
        'settings_id', s.id,
        'message_id', s."Mensagens",
        'video_id', s."Videos",
        'scheduled_for', s.proxima_postagem,
        'status', s.status,
        'tipo_msg', s.tipo_msg
      ) as metadata,
      0.1::float as relevance_score,
      s.created_at
    FROM "Settings messages posts" s
    LEFT JOIN "Mensagens" m ON m.id = s."Mensagens"
    WHERE s."Projeto" = p_project_id
      AND s.proxima_postagem > NOW()
    ORDER BY s.proxima_postagem ASC
    LIMIT 5;
  END IF;

  -- Busca normal no RAG
  RETURN QUERY
  SELECT 
    r.content::text,
    r.source_table::text,
    CASE 
      WHEN p_query_embedding IS NOT NULL AND r.embedding IS NOT NULL 
      THEN (r.embedding <=> p_query_embedding)::float
      ELSE 0.5::float
    END as similarity,
    r.metadata,
    CASE 
      WHEN p_query_embedding IS NOT NULL AND r.embedding IS NOT NULL 
      THEN (r.embedding <=> p_query_embedding)::float
      ELSE 0.5::float
    END as relevance_score,
    r.created_at
  FROM rag_embeddings r
  WHERE r.project_id = p_project_id
    AND (
      -- Busca vetorial se tem embedding
      (p_query_embedding IS NOT NULL AND r.embedding IS NOT NULL 
       AND r.embedding <=> p_query_embedding < (1 - p_min_similarity))
      OR
      -- Busca por texto se fornecido
      (p_search_text IS NOT NULL AND r.content ILIKE '%' || p_search_text || '%')
    )
  ORDER BY 
    CASE 
      WHEN p_query_embedding IS NOT NULL AND r.embedding IS NOT NULL 
      THEN r.embedding <=> p_query_embedding
      ELSE 0.5
    END ASC
  LIMIT p_limit;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_rag_enhanced TO anon, authenticated, service_role;

COMMENT ON FUNCTION search_rag_enhanced IS 
'Busca RAG simplificada - v4 funcionando';