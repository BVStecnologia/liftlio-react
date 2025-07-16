-- Função RPC para busca RAG otimizada no backend
-- Criada em: 14/07/2025
-- Versão: 1.0
-- Descrição: Busca híbrida com múltiplas estratégias para melhor precisão

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
DECLARE
  v_keywords text[];
  v_has_temporal boolean := false;
  v_has_scheduled boolean := false;
BEGIN
  -- Extrair keywords do texto se fornecido
  IF p_search_text IS NOT NULL THEN
    -- Keywords importantes do domínio
    v_keywords := string_to_array(
      lower(p_search_text) || ' ' ||
      CASE 
        WHEN p_search_text ~* 'agendad|scheduled|pending' THEN 'scheduled agendada pendente pending proxima_postagem'
        ELSE ''
      END || ' ' ||
      CASE 
        WHEN p_search_text ~* 'hoje|today' THEN '14/07/2025 julho july'
        ELSE ''
      END || ' ' ||
      CASE 
        WHEN p_search_text ~* 'menção|menções|mention' THEN 'postagem realizada posted mensagem'
        ELSE ''
      END,
      ' '
    );
    
    -- Detectar categorias
    v_has_temporal := p_search_text ~* 'hoje|ontem|semana|mês|quando|today|yesterday|week|month|when';
    v_has_scheduled := p_search_text ~* 'agendad|scheduled|pending|proxima|próxima';
  END IF;

  RETURN QUERY
  WITH vector_search AS (
    -- 1. Busca por similaridade vetorial
    SELECT 
      r.content,
      r.source_table,
      r.embedding <=> p_query_embedding as similarity,
      r.metadata,
      r.created_at
    FROM rag_embeddings r
    WHERE r.project_id = p_project_id
      AND r.embedding <=> p_query_embedding < (1 - p_min_similarity)
    ORDER BY r.embedding <=> p_query_embedding
    LIMIT p_limit * 2
  ),
  keyword_search AS (
    -- 2. Busca por keywords (se houver texto)
    SELECT 
      r.content,
      r.source_table,
      0.5 as similarity, -- Similaridade fixa para keyword match
      r.metadata,
      r.created_at
    FROM rag_embeddings r
    WHERE r.project_id = p_project_id
      AND p_search_text IS NOT NULL
      AND (
        -- Busca por qualquer keyword
        EXISTS (
          SELECT 1 FROM unnest(v_keywords) kw 
          WHERE length(kw) > 3 AND r.content ILIKE '%' || kw || '%'
        )
      )
    LIMIT p_limit
  ),
  scheduled_boost AS (
    -- 3. Boost especial para mensagens agendadas
    SELECT 
      'Mensagem agendada para ' || TO_CHAR(s.proxima_postagem, 'DD/MM/YYYY HH24:MI') || 
      COALESCE(': ' || m.mensagem, '') as content,
      'Settings messages posts' as source_table,
      0.9 as similarity, -- Alta relevância
      jsonb_build_object(
        'settings_id', s.id,
        'message_id', s."Mensagens",
        'video_id', s."Videos",
        'scheduled_for', s.proxima_postagem,
        'status', s.status,
        'tipo_msg', s.tipo_msg
      ) as metadata,
      s.created_at
    FROM "Settings messages posts" s
    LEFT JOIN "Mensagens" m ON m.id = s."Mensagens"
    WHERE s."Projeto" = p_project_id
      AND s.proxima_postagem > NOW()
      AND v_has_scheduled
  ),
  all_results AS (
    -- Combinar todos os resultados
    SELECT * FROM vector_search
    UNION
    SELECT * FROM keyword_search
    UNION
    SELECT * FROM scheduled_boost
  ),
  ranked_results AS (
    -- Calcular relevância final
    SELECT DISTINCT ON (content, source_table)
      content,
      source_table,
      MIN(similarity) as similarity,
      metadata,
      -- Calcular score de relevância baseado em múltiplos fatores
      CASE
        -- Boost para conteúdo recente se busca temporal
        WHEN v_has_temporal AND created_at > NOW() - INTERVAL '7 days' THEN MIN(similarity) * 0.8
        -- Boost para Settings messages posts se busca por agendadas
        WHEN v_has_scheduled AND source_table = 'Settings messages posts' THEN MIN(similarity) * 0.7
        -- Boost baseado em categorias
        WHEN p_categories IS NOT NULL AND source_table = ANY(p_categories) THEN MIN(similarity) * 0.85
        ELSE MIN(similarity)
      END as relevance_score,
      MAX(created_at) as created_at
    FROM all_results
    GROUP BY content, source_table, metadata
  )
  SELECT 
    content,
    source_table,
    similarity,
    metadata,
    relevance_score,
    created_at
  FROM ranked_results
  ORDER BY relevance_score ASC, similarity ASC
  LIMIT p_limit;
END;
$$;

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_rag_project_created 
ON rag_embeddings(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_settings_messages_scheduled 
ON "Settings messages posts"("Projeto", proxima_postagem) 
WHERE proxima_postagem IS NOT NULL;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_rag_enhanced TO anon, authenticated, service_role;

COMMENT ON FUNCTION search_rag_enhanced IS 
'Busca RAG otimizada com suporte a múltiplas estratégias:
- Busca vetorial por similaridade
- Busca por keywords
- Boost para conteúdo específico (agendadas, recentes)
- Ranking inteligente baseado em contexto';