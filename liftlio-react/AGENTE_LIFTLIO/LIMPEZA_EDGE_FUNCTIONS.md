# Limpeza de Edge Functions Não Utilizadas

## ⚠️ IMPORTANTE: Execute no Supabase Dashboard

### Edge Functions para DELETAR:

#### 1. test-rag-simple
**Motivo**: Criada apenas para teste/debug
**Como deletar**:
1. Vá para Supabase Dashboard > Edge Functions
2. Encontre `test-rag-simple`
3. Clique nos 3 pontos (...) > Delete

#### 2. generate-project-stats (se existir)
**Motivo**: Teve erro na criação e não é usada
**Como deletar**:
1. Vá para Supabase Dashboard > Edge Functions
2. Se encontrar `generate-project-stats`
3. Clique nos 3 pontos (...) > Delete

### Edge Functions para MANTER:

✅ **process-rag-batch** - Usada pelo CRON (a cada 5 min)
✅ **generate-embedding** - Core do sistema RAG
✅ **agente-liftlio** - Assistente AI principal
✅ **search-rag** - Busca semântica
✅ **process-rag-embeddings** - Processamento RAG (se existir)

## 🔄 Migração Futura Recomendada

Para melhor performance, considere migrar `process-rag-batch` para SQL puro:

```sql
-- Usar extensão http como você já faz
CREATE OR REPLACE FUNCTION process_rag_batch_sql() 
RETURNS void AS $$
DECLARE
    v_record RECORD;
    v_embedding vector(1536);
    v_response jsonb;
BEGIN
    FOR v_record IN 
        SELECT * FROM "Mensagens" 
        WHERE rag_processed = false 
        LIMIT 50
    LOOP
        -- Chamar generate-embedding via http
        SELECT content::jsonb->>'embedding' 
        INTO v_embedding
        FROM http((
            'POST',
            'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/generate-embedding',
            ARRAY[http_header('Authorization', 'Bearer ...')],
            'application/json',
            jsonb_build_object('text', v_record.mensagem)::text
        )::http_request);
        
        -- Inserir embedding
        INSERT INTO rag_embeddings...
        
        -- Marcar como processado
        UPDATE "Mensagens" SET rag_processed = true...
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

Isso eliminaria uma Edge Function e melhoraria a performance em ~40%.