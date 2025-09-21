# 📋 Histórico de Migrations Supabase

## Migrations Aplicadas (Total: 147)

Data de sincronização: 2025-09-21

### Junho 2025
- `20250606074817` - add_rag_fields_and_embeddings_table
- `20250606075030` - add_rls_to_rag_embeddings

### Julho 2025
- `20250710-20250714` - Sistema RAG completo (40+ migrations)
- `20250720-20250724` - Otimizações e funções de análise

### Agosto 2025
- `20250801-20250804` - Sistema de email automation
- `20250807` - Track event functions
- `20250812-20250814` - Analytics improvements
- `20250820` - Liftlio cards storage
- `20250823-20250829` - Video cache e engagement fixes

### Setembro 2025
- `20250906` - Temperature system
- `20250918-20250921` - YouTube integration improvements

## Como Sincronizar

```bash
# Para baixar novas migrations do Supabase
npx supabase db pull

# Para aplicar migrations locais no Supabase
npx supabase db push

# Ver status das migrations
npx supabase db status
```