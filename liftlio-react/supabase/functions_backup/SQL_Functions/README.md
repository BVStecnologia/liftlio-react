# SQL Functions - Liftlio

**Última atualização**: 2025-01-15
**Total**: 27 SQL Functions + 5 Edge Functions
**Pipeline**: 7 stages (STATUS 0-6) | ~2 minutos total

---

## 📊 VISÃO GERAL DO SISTEMA

### Pipeline Liftlio - Fluxo Completo

```
STATUS 0 → 1: INICIALIZAÇÃO (~1s)
  └─> atualizar_scanner_rodada()

STATUS 1 → 2: SCANNER PROCESSING (~20s)
  └─> process_next_project_scanner()
      └─> update_video_id_cache()
      └─> get_youtube_channel_videos() [Edge Function]

STATUS 2 → 3: VIDEO STATS & COMMENTS (~30s)
  └─> update_video_stats()
  └─> start_video_processing()
      └─> process_videos_batch()
      └─> fetch_and_store_comments_for_video()

STATUS 3 → 4: VIDEO ANALYSIS (~20s)
  └─> start_video_analysis_processing()
      └─> process_video_analysis_batch()
      └─> analyze_video_with_claude() [Edge Function]

STATUS 4 → 5: COMMENT ANALYSIS (~30s)
  └─> start_comment_analysis_processing()
      └─> process_comment_analysis_batch()
      └─> analisar_comentarios_com_claude() [Edge Function]

STATUS 5 → 6: ENGAGEMENT MESSAGES (~20s)
  └─> start_engagement_messages_processing()
      └─> process_engagement_messages_batch()
      └─> process_engagement_comments_with_claude() [Edge Function]
      └─> agendar_postagens_todos_projetos()
```

### 🎯 Sistema Dual de Mensagens

**SISTEMA 1: DESCOBERTA (99.7%)**
- 2.238 mensagens de RESPOSTA a comentários
- Scanner busca vídeos relevantes via keywords
- PICS score identifica leads potenciais
- Cria respostas personalizadas
- `Comentarios_Principal IS NOT NULL`

**SISTEMA 2: MONITORAMENTO (0.3%)**
- 48 mensagens INICIAIS (não responde ninguém)
- Top canais do projeto monitorados
- Comentários engajantes em vídeos "quentes"
- `Comentarios_Principal IS NULL`

**Diferenciador Real**: Campo `Comentarios_Principal` (não `tipo_msg`)
**Tipos de Resposta**: 'engajamento' (570) | 'produto' (40)

### 🛡️ Proteções e Tecnologias

**Mecanismos:**
- Advisory Locks: `pg_try_advisory_lock()`
- Circuit Breaker: Máx 100 exec/hora
- Backoff Exponencial: 7s → 15s → 30s
- Batch Processing: Paralelização otimizada

**Stack:**
- PostgreSQL (PL/pgSQL)
- pg_cron (agendamento)
- Supabase Edge Functions (Deno)
- YouTube Data API v3
- Claude API (Anthropic)

### 📋 Estrutura de Tabelas Principais

**Settings messages posts** (Agendamento)
```
id                      : ID do agendamento
Projeto                 : Projeto dono
Videos                  : Vídeo onde será postado
Comentarios_Principal   : Comentário PAI (⚠️ NULL = inicial, NOT NULL = resposta)
Mensagens              : Mensagem criada pela IA
status                 : 'pending' | 'posted'
postado                : Timestamp da postagem
proxima_postagem       : Agendamento futuro
tipo_msg               : Tipo de agendamento
```

**Mensagens** (Conteúdo)
```
id                     : ID da mensagem
mensagem              : Texto da resposta gerada
respondido            : Se já foi postado
tipo_msg              : Tipo de processamento
tipo_resposta         : 'engajamento' | 'produto'
project_id            : Projeto dono
```

**Comentarios_Principais** (Comentários originais)
```
id                    : ID interno
id_do_comentario      : ID do YouTube (parent comment)
text_display          : Texto original do comentário
author_name           : Autor do comentário
```

**Query Útil: Ver respostas postadas**
```sql
SELECT
    smp.id,
    smp.postado,
    m.mensagem as nossa_resposta,
    m.tipo_resposta,
    cp.text_display as comentario_original,
    cp.id_do_comentario as youtube_parent_id,
    v."VIDEO" as youtube_video_id,
    c.nome as canal
FROM "Settings messages posts" smp
JOIN "Mensagens" m ON smp."Mensagens" = m.id
JOIN "Comentarios_Principais" cp ON smp."Comentarios_Principal" = cp.id
JOIN "Videos" v ON smp."Videos" = v.id
JOIN "Canais do youtube" c ON v."Canais" = c.id
WHERE smp.status = 'posted'
AND smp."Comentarios_Principal" IS NOT NULL
ORDER BY smp.postado DESC;
```

---

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