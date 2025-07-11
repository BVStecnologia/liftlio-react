# 🚀 Melhores Práticas - Supabase MCP

## 🚨 REGRA OBRIGATÓRIA - SEMPRE SEGUIR

### 📁 Espelhamento de Funções MCP

**TODA** função criada, editada ou deletada via MCP **DEVE** ser salva em:
```
/Users/valdair/Documents/Projetos/Liftlio/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/
```

#### Workflow Obrigatório:
1. **Criar/Editar via MCP** → Edge Function ou SQL Function
2. **Salvar cópia IMEDIATAMENTE** → Na pasta correspondente
3. **Atualizar INDICE_COMPLETO.md** → Com a nova função
4. **Se for sistema completo** → Criar `00_script_completo_nome.sql`

#### Nomenclatura:
- **SQL Functions**: `nome_funcao_descricao.sql`
- **Edge Functions**: `nome-funcao_descricao.ts.bak`
- **Scripts Completos**: `00_script_completo_sistema.sql`

#### Se deletar no Supabase:
- Remover arquivo correspondente da pasta
- Atualizar INDICE_COMPLETO.md
- Adicionar nota de "DEPRECATED" se necessário

---

## 🎯 PRINCÍPIOS DE DESIGN - MENOS É MAIS

### 📊 Quando usar SQL Functions vs Edge Functions

#### Prefira SQL Functions quando:
- ✅ Operações no banco de dados
- ✅ Transformações de dados simples
- ✅ Joins e queries complexas
- ✅ Não precisa de bibliotecas externas
- ✅ Performance é crítica (SQL é MAIS RÁPIDO)

#### Use Edge Functions APENAS quando:
- ⚠️ Precisa chamar APIs externas complexas
- ⚠️ Precisa de bibliotecas npm/deno específicas
- ⚠️ Processamento de arquivos/imagens
- ⚠️ Lógica que SQL não consegue fazer

### 🔥 SQL Functions TAMBÉM podem:

#### Exemplo 1: Chamar API HTTP
```sql
-- Primeiro habilitar extensão HTTP
CREATE EXTENSION IF NOT EXISTS http;

-- Chamar APIs HTTP direto do SQL!
CREATE OR REPLACE FUNCTION get_openai_embedding(text_input TEXT)
RETURNS vector(1536)
LANGUAGE plpgsql
AS $$
DECLARE
    api_response json;
    embedding vector(1536);
BEGIN
    -- Chamar OpenAI API
    SELECT content::json INTO api_response
    FROM http((
        'POST',
        'https://api.openai.com/v1/embeddings',
        ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.openai_key'))],
        'application/json',
        json_build_object(
            'input', text_input,
            'model', 'text-embedding-3-small'
        )::text
    )::http_request);
    
    -- Extrair embedding
    embedding := (api_response->'data'->0->>'embedding')::vector(1536);
    RETURN embedding;
END;
$$;
```

#### Exemplo 2: Performance Comparison
```
SQL Function: ~50-100ms para query complexa
Edge Function: ~200-500ms (overhead de cold start + network)
```

### 📏 Regras de Ouro:
1. **NUNCA** criar funções duplicadas ou similares
2. **SEMPRE** verificar se já existe algo parecido
3. **CONSOLIDAR** funções similares em uma só
4. **REUTILIZAR** código existente
5. **SQL primeiro**, Edge Function só se necessário

### ❌ EVITAR:
```
❌ process-rag-embeddings
❌ process-rag-embeddings-v2  
❌ process-rag-batch
❌ process-rag-minimal
```

### ✅ FAZER:
```
✅ process_rag_embeddings (SQL com parâmetros opcionais)
```

---

## 📋 Checklist Antes de Criar

### 1. Sempre Verificar se Já Existe
```sql
-- Verificar funções
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name LIKE '%nome_funcao%';

-- Verificar tabelas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%nome_tabela%';

-- Verificar colunas
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'nome_tabela';
```

### 2. Sempre Usar Transações para Mudanças Críticas
```sql
BEGIN;
-- suas alterações aqui
-- se algo der errado: ROLLBACK;
COMMIT;
```

---

## 🏗️ Criando Tabelas

### ✅ Faça:
```sql
-- Sempre verificar antes
DROP TABLE IF EXISTS nome_tabela CASCADE;

-- Criar com todas as constraints
CREATE TABLE nome_tabela (
    id BIGSERIAL PRIMARY KEY,
    -- usar UUID para IDs públicos
    public_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    -- sempre ter timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- campos específicos
    nome TEXT NOT NULL,
    email TEXT UNIQUE,
    -- foreign keys com nomes claros
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Sempre criar índices para foreign keys
CREATE INDEX idx_nome_tabela_user_id ON nome_tabela(user_id);

-- Comentários são importantes
COMMENT ON TABLE nome_tabela IS 'Descrição do que a tabela faz';
```

### ❌ Evite:
- Criar tabelas sem `IF NOT EXISTS` ou `DROP IF EXISTS`
- Esquecer de índices em foreign keys
- Não documentar com COMMENT

---

## 🔧 Alterando Tabelas

### ✅ Faça:
```sql
-- Adicionar coluna com valor default para registros existentes
ALTER TABLE tabela 
ADD COLUMN IF NOT EXISTS nova_coluna TEXT DEFAULT 'valor_padrao';

-- Depois remover o default se não for necessário
ALTER TABLE tabela 
ALTER COLUMN nova_coluna DROP DEFAULT;
```

### ❌ Evite:
```sql
-- Isso vai falhar se a coluna já existir
ALTER TABLE tabela ADD COLUMN nova_coluna TEXT;
```

---

## 🔍 Criando Funções SQL

### ✅ Faça:
```sql
-- Sempre dropar antes com CASCADE para remover dependências
DROP FUNCTION IF EXISTS nome_funcao(parametros) CASCADE;

CREATE OR REPLACE FUNCTION nome_funcao(
    param1 TEXT,
    param2 INTEGER DEFAULT 10
)
RETURNS TABLE (
    id BIGINT,
    resultado TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- se precisar privilégios elevados
SET search_path = public -- segurança
AS $$
DECLARE
    -- variáveis locais
    v_count INTEGER;
BEGIN
    -- validações primeiro
    IF param1 IS NULL THEN
        RAISE EXCEPTION 'param1 não pode ser NULL';
    END IF;
    
    -- lógica
    RETURN QUERY
    SELECT t.id, t.nome
    FROM tabela t
    WHERE t.campo = param1
    LIMIT param2;
    
    -- log se necessário
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Retornando % registros', v_count;
END;
$$;

-- Sempre documentar
COMMENT ON FUNCTION nome_funcao IS 'Descrição do que a função faz';

-- Dar permissões se necessário
GRANT EXECUTE ON FUNCTION nome_funcao TO authenticated;
```

---

## 🚀 Edge Functions

### ✅ Faça:
```typescript
// Sempre validar environment variables
const API_KEY = Deno.env.get('API_KEY')
if (!API_KEY) {
  console.error('API_KEY não configurada')
}

// Sempre ter try/catch
serve(async (req) => {
  try {
    // Validar método HTTP
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }
    
    // Validar input
    const { param } = await req.json()
    if (!param) {
      return new Response(
        JSON.stringify({ error: 'param é obrigatório' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Processar...
    
  } catch (error) {
    console.error('Erro:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

---

## 🔐 RLS (Row Level Security)

### ✅ Faça:
```sql
-- Habilitar RLS
ALTER TABLE tabela ENABLE ROW LEVEL SECURITY;

-- Política para SELECT
CREATE POLICY "Usuários veem próprios dados"
ON tabela FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Política para INSERT
CREATE POLICY "Usuários criam próprios dados"
ON tabela FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Sempre testar as policies
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid-aqui';
SELECT * FROM tabela; -- deve retornar apenas dados do usuário
```

---

## 📊 Migrations

### ✅ Faça:
```sql
-- Nome descritivo: YYYYMMDD_descricao.sql
-- Exemplo: 20250110_add_rag_fields_to_videos.sql

-- Sempre começar com comentário
-- Migration: Adicionar campos RAG nas tabelas
-- Data: 2025-01-10
-- Autor: Valdair & Claude

-- Usar transação para migrations críticas
BEGIN;

-- alterações aqui...

COMMIT;
```

---

## 🧪 Testando

### ✅ Sempre Teste:
```sql
-- Testar função
SELECT * FROM nome_funcao('param1', 10);

-- Testar com EXPLAIN para performance
EXPLAIN ANALYZE
SELECT * FROM tabela WHERE campo = 'valor';

-- Verificar se índices estão sendo usados
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE tablename = 'sua_tabela';
```

---

## 🎯 Organização de Arquivos

### ✅ Estrutura Recomendada:
```
AGENTE_LIFTLIO/MCP_Functions/
├── SQL_Functions/
│   ├── 00_script_completo_sistema.sql  # Executar tudo
│   ├── 01_tables_criar_tabelas.sql     # Tabelas
│   ├── 02_functions_logica_negocio.sql # Funções
│   ├── 03_triggers_automacao.sql       # Triggers
│   ├── 04_rls_seguranca.sql           # Policies
│   └── 05_indexes_performance.sql      # Índices
└── Edge_Functions/
    └── nome-funcao_descricao.ts.bak
```

---

## ⚠️ Cuidados Especiais

### 1. **Nunca use CASCADE em produção sem revisar**
```sql
-- Isso pode deletar muita coisa!
DROP TABLE tabela CASCADE; -- ⚠️ CUIDADO
```

### 2. **Sempre faça backup antes de alterações grandes**
```sql
-- Criar backup da tabela
CREATE TABLE tabela_backup AS SELECT * FROM tabela;
```

### 3. **Cuidado com TRUNCATE**
```sql
-- TRUNCATE é mais rápido mas não dispara triggers
TRUNCATE tabela; -- ⚠️ Não tem volta!

-- Prefira DELETE se precisar triggers
DELETE FROM tabela WHERE condição;
```

### 4. **Sempre configurar secrets no Vault**
```bash
# Nunca commitar secrets!
supabase secrets set MINHA_API_KEY=valor-secreto

# No código:
const API_KEY = Deno.env.get('MINHA_API_KEY')
```

---

## 📝 Template para Documentação

### Para cada função/tabela criada:
```markdown
## Nome da Função/Tabela

**Criado em**: DD/MM/YYYY
**Autor**: Seu nome
**Objetivo**: O que faz

### Parâmetros
- param1 (tipo): descrição
- param2 (tipo): descrição

### Retorno
- Estrutura do retorno

### Exemplo de Uso
```sql
-- exemplo aqui
```

### Observações
- Pontos importantes
- Limitações conhecidas
```

---

## 🔄 Workflow Recomendado

1. **Planejar** - O que precisa ser criado?
2. **Verificar** - Já existe algo similar?
3. **Documentar** - Escrever o que vai fazer
4. **Implementar** - Criar com DROP IF EXISTS
5. **Testar** - Executar e validar
6. **Salvar** - Copiar para pasta organizada
7. **Commitar** - Salvar no Git

---

*Mantenha este documento atualizado com novas práticas descobertas!*