# 🚀 Melhores Práticas - Supabase MCP

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
supabase/Funcoes criadas MCP/
├── SQL Functions/
│   ├── 00_script_completo_sistema.sql  # Executar tudo
│   ├── 01_tables_criar_tabelas.sql     # Tabelas
│   ├── 02_functions_logica_negocio.sql # Funções
│   ├── 03_triggers_automacao.sql       # Triggers
│   ├── 04_rls_seguranca.sql           # Policies
│   └── 05_indexes_performance.sql      # Índices
└── Edge Functions/
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