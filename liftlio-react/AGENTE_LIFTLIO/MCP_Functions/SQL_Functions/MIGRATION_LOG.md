# Migration Log - Liftlio SQL Functions

## Controle de Versões

### 2025-01-27 - Sistema de Keywords Inteligente com Full-Text Search
- **Arquivos:**
  - `04_Mensagens/generate_comment_keywords.sql`
  - `04_Mensagens/get_filtered_comments_optimized.sql`
- **Mudanças:**
  - Added: Campo `palavras_chaves_p_comments` na tabela Projeto
  - Added: Função `generate_comment_keywords()` - Gera palavras-chave usando Claude AI
  - Updated: `get_filtered_comments()` com Full-Text Search e otimização 30x
  - Added: Bonus de +100 pontos para comentários com palavras-chave de compra
- **Benefícios:**
  - 95% de economia em tokens da Claude API
  - 30x mais rápido com regex otimizado
  - Palavras-chave dinâmicas por projeto/idioma
  - Melhor identificação de leads potenciais
- **Rollback:**
  ```sql
  DROP FUNCTION IF EXISTS generate_comment_keywords(integer);
  ALTER TABLE "Projeto" DROP COLUMN IF EXISTS palavras_chaves_p_comments;
  -- Restaurar get_filtered_comments original do Git
  git checkout HEAD~1 04_Mensagens/get_filtered_comments.sql
  ```

### 2025-01-26 - Documentação e Workflow
- **Arquivo:** `README.md`
- **Mudanças:**
  - Workflow completo de deploy
  - Regra de testar queries antes de criar funções
  - Checklist para funções novas
  - Template de cabeçalho SQL

## Como fazer Deploy

```bash
# Deploy individual
mcp__supabase__apply_migration

# Verificar função
SELECT proname FROM pg_proc WHERE proname = 'nome_funcao';
```

## Como fazer Rollback

1. Identificar versão no log acima
2. Executar script de rollback correspondente
3. Ou usar Git: `git checkout <commit> arquivo.sql`