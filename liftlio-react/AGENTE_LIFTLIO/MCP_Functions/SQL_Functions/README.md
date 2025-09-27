# SQL Functions - Liftlio

## 🚀 Workflow de Deploy

### Deploy de Função Nova
```bash
# 1. TESTAR QUERIES PRIMEIRO (NOVO!)
# Teste cada SELECT/UPDATE/DELETE isoladamente
SELECT * FROM "Tabela" WHERE condição;  # Funciona?
SELECT COUNT(*) FROM "Tabela";          # Retorna dados?

# 2. Criar arquivo local
vim 04_Mensagens/minha_funcao.sql

# 3. Deploy via MCP
mcp__supabase__apply_migration

# 4. Testar no Supabase real
SELECT minha_funcao(parametros);

# 5. Se OK → Commit
git add .
git commit -m "feat: descrição"
git push
```

### Deploy de Função Modificada
```bash
# 1. Backup da versão atual (automático via Git)
# 2. Editar arquivo local
# 3. Deploy e testar
# 4. Commit se OK
```

### Rollback se Necessário
```bash
# Opção 1: Reverter no Git
git checkout HEAD~1 04_Mensagens/minha_funcao.sql
# Re-deploy a versão antiga

# Opção 2: Ver histórico
git log --oneline 04_Mensagens/minha_funcao.sql
git checkout <commit_hash> 04_Mensagens/minha_funcao.sql
```

## 📁 Estrutura

```
/SQL_Functions
├── 00_Monitoramento_YouTube/   # Funções de monitoramento
├── 01_Canais/                  # Gestão de canais
├── 02_Videos/                  # Análise de vídeos
├── 03_Claude/                  # Integração Claude AI
├── 04_Mensagens/               # Sistema de mensagens
├── 05_Projetos/                # Gestão de projetos
└── README.md                   # Este arquivo
```

## ⚠️ Regras Importantes

1. **SEMPRE testar queries isoladas ANTES de criar a função**
2. **SEMPRE usar DROP FUNCTION IF EXISTS**
3. **SEMPRE salvar localmente ANTES de deploy**
4. **SEMPRE testar após deploy**
5. **SEMPRE commitar se funcionar**
6. **NUNCA deixar funções duplicadas no banco**
7. **SEMPRE documentar no cabeçalho do arquivo SQL**

## 🔄 Versionamento

- Versionamento via Git (não precisa numerar arquivos)
- Cada commit = uma versão
- Rollback fácil via Git

## 🧪 Testes

### Pré-Deploy (OBRIGATÓRIO)
```sql
-- 1. Testar cada query que será usada na função
SELECT column_name FROM information_schema.columns
WHERE table_name = 'MinhaTabela';  -- Confirma estrutura

SELECT COUNT(*) FROM "MinhaTabela";  -- Tem dados?

-- 2. Testar lógica principal
SELECT * FROM "Tabela1" t1
JOIN "Tabela2" t2 ON t2.id = t1.id
WHERE t1.campo = 'valor';  -- Query funciona?
```

### Pós-Deploy
```sql
-- Teste em transação segura
BEGIN;
  SELECT minha_funcao(param1, param2);
  -- Verificar resultado
ROLLBACK;  -- Ou COMMIT se OK
```

### Por que direto em produção?
- Dados reais disponíveis
- APIs configuradas (Claude, HTTP)
- Extensões instaladas (pgvector, etc)
- Rollback via Git se necessário

## ✅ Checklist para Função Nova

- [ ] Testei cada SELECT isoladamente
- [ ] Testei cada JOIN funciona
- [ ] Verifiquei nomes de tabelas/colunas
- [ ] Adicionei DROP FUNCTION IF EXISTS
- [ ] Documentei no cabeçalho do arquivo
- [ ] Salvei arquivo localmente
- [ ] Deploy via MCP funcionou
- [ ] Teste pós-deploy OK
- [ ] Git commit realizado

## 📝 Template de Cabeçalho SQL

```sql
-- =============================================
-- Função: nome_da_funcao
-- Descrição: O que ela faz
-- Criado: YYYY-MM-DD
-- Atualizado: Mudanças importantes
-- =============================================

DROP FUNCTION IF EXISTS nome_da_funcao(parametros);

CREATE OR REPLACE FUNCTION nome_da_funcao(...)
```

## 🔥 Exemplo Prático

```sql
-- ERRADO: Criar função sem testar queries
CREATE FUNCTION get_data() AS $$
  SELECT * FROM "Tabela_Inexistente";  -- Vai dar erro!
$$

-- CERTO: Testar primeiro
-- 1. Teste a query
SELECT * FROM "Videos" WHERE id = 1;  -- OK, funciona!

-- 2. Depois crie a função
DROP FUNCTION IF EXISTS get_video_data(bigint);
CREATE OR REPLACE FUNCTION get_video_data(p_id bigint)...
```