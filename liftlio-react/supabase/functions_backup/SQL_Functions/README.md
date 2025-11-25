# SQL Functions - Liftlio

**Última atualização**: 2025-11-25
**Status**: Pipeline 2 em produção (Pipeline 1 desativado)

---

## ⚠️ AVISO IMPORTANTE - MUDANÇA DE SISTEMA

### Pipeline 1 (DESATIVADO - 25/11/2025)

O sistema antigo (Pipeline 1) foi **DESATIVADO** em 25/11/2025.

**Funções do Pipeline 1 (NÃO USAR):**
- `atualizar_scanner_rodada()` - Substituído por `pipeline2_process_project()`
- `process_project()` - Substituído
- `process_project_step_1/2/3/4()` - Substituído
- `process_youtube_scanner()` - Substituído
- `schedule_process_project()` - Substituído

**Motivos da desativação:**
- Processamento sequencial lento (STATUS 0→6 em série)
- Sem histórico de processamento por vídeo
- Difícil debugging quando falhava
- Não escalava bem com múltiplos projetos

---

### Pipeline 2 (ATIVO - 25/11/2025)

O novo sistema (Pipeline 2) está **EM PRODUÇÃO** desde 25/11/2025.

**Documentação completa:** `pipeline_2/README.md`

**Principais melhorias:**
- Processamento por vídeo (não por projeto)
- Histórico completo em `pipeline_processing`
- Cron de 30 segundos para todos projetos
- Trigger de início imediato (status 0)
- Retry automático de erros
- Rotação circular de scanners

**Funções principais do Pipeline 2:**
```
01_process_all_projects_pipeline2() ← CRON 30s
02_pipeline2_process_project()      ← Orquestrador principal
03_trigger_pipeline2_status_0()     ← Início imediato
04_initialize_scanner_processing()  ← Cache → Pipeline
05_process_scanner_videos()         ← Por scanner
06_process_pipeline_step_for_video()← Router de steps
07-11_process_step_X_*()            ← Steps 1-5
12_update_project_status_from_pipeline()
```

**Cron ativo:**
```sql
SELECT cron.schedule('pipeline2_fast', '30 seconds', 'SELECT process_all_projects_pipeline2()');
```

---

## 📊 VISÃO GERAL DO SISTEMA (Pipeline 2)

### Fluxo do Pipeline 2

```
CRON (30 segundos)
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│  process_all_projects_pipeline2()                        │
│      Loop: todos projetos com status 0-5                 │
│                         │                                │
│                         ▼                                │
│  pipeline2_process_project(project_id)                   │
│      │                                                   │
│      ├─ STATUS 0: Marca scanners, muda status→1         │
│      ├─ RODADA=1: Busca IDs do YouTube                  │
│      ├─ PARTE 1: initialize_scanner_processing()        │
│      └─ PARTE 2: process_scanner_videos()               │
│                         │                                │
│                         ▼                                │
│      ┌───────────────────────────────────────────────┐  │
│      │  process_pipeline_step_for_video()            │  │
│      │                                               │  │
│      │  Step 0 → Criar vídeo na tabela Videos       │  │
│      │  Step 1 → Buscar comentários do YouTube      │  │
│      │  Step 2 → Curar comentários com Claude AI    │  │
│      │  Step 3 → Analisar sentimentos (PICS)        │  │
│      │  Step 4 → Criar mensagens orientadas         │  │
│      │  Step 5 → pipeline_completo = TRUE           │  │
│      └───────────────────────────────────────────────┘  │
│                         │                                │
│      update_project_status_from_pipeline()              │
└──────────────────────────────────────────────────────────┘
```

---

## 📁 Estrutura de Pastas

```
/SQL_Functions
├── pipeline_2/                    # ✅ SISTEMA ATIVO (Pipeline 2)
│   ├── 00_ALTER_TABLE_*.sql       # Schema
│   ├── 01-12_*.sql                # Fluxo principal
│   ├── 13-19_*.sql                # Auxiliares
│   └── README.md                  # Documentação completa
│
├── 00_Monitoramento_YouTube/      # ⚠️ Pipeline 1 (desativado)
├── 01_Canais/                     # ⚠️ Pipeline 1 (desativado)
├── 02_Videos/                     # ⚠️ Pipeline 1 (desativado)
├── 03_Claude/                     # Integração Claude AI (compartilhado)
├── 04_Mensagens/                  # Sistema de mensagens (compartilhado)
├── 05_Projetos/                   # Gestão de projetos (compartilhado)
└── README.md                      # Este arquivo
```

---

## 🎯 Sistema Dual de Mensagens

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

## 🧪 TESTE MANUAL DO PIPELINE (STATUS 0→4)

**Quando usar**: Debugging, validação, ambiente sem trigger/CRON ativo

**Projeto de teste**: 116 (2025-10-16)
- 2 scanners ativos
- 4 vídeos coletados
- 222 comentários principais
- Trigger desativado

### ✅ STATUS 0 → 1: Inicialização
```sql
SELECT atualizar_scanner_rodada(116);
```

**Resultado**:
```
Definido campo rodada = 1 para 2 scanners ativos do projeto 116
Status do projeto 116 atualizado para 1
```

**Validação**:
- Scanner 580: rodada = 1
- Scanner 581: rodada = 1
- Projeto: status = '1'

---

### ✅ STATUS 1 → 2: Scanner Processing

**⚠️ IMPORTANTE**: Esta função processa **1 scanner por vez**.
Precisa rodar **N vezes** (onde N = quantidade de scanners ativos).

```sql
-- 1ª execução
SELECT process_next_project_scanner(116);
```

**Resultado (1ª)**:
```
Scanner 580 processado com sucesso na tentativa 1. Restam 1 scanners pendentes no projeto 116
```

```sql
-- 2ª execução (última, pois projeto tem 2 scanners)
SELECT process_next_project_scanner(116);
```

**Resultado (2ª - ÚLTIMA)**:
```
Scanner 581 processado com sucesso na tentativa 1. Projeto 116 completamente processado. Status atualizado para 2.
```

**Validação**:
- Scanner 580: rodada = NULL, "ID Verificado" = "YOzXnEv5Nmo,OQIBf2mIs58,ZT4LqD2_GwM"
- Scanner 581: rodada = NULL, "ID Verificado" = "Y7trnay3nHQ"
- 4 vídeos inseridos na tabela Videos (IDs: 28548, 28549, 28550, 28551)
- Projeto: status = '2'

---

### ✅ STATUS 2 → 3: Video Stats & Comments

**⚠️ IMPORTANTE**: Esta função processa **TODOS os vídeos de uma vez**.
Roda **apenas 1 vez** (diferente da anterior).

```sql
SELECT update_video_stats(116);
```

**Resultado**:
```
Iniciando update_video_stats para o projeto 116
Processando scanner ID: 580
  Vídeo inserido: YOzXnEv5Nmo (ID: 28548)
  Vídeo inserido: OQIBf2mIs58 (ID: 28549)
  Vídeo inserido: ZT4LqD2_GwM (ID: 28550)
Scanner 580 atualizado
Processando scanner ID: 581
  Vídeo inserido: Y7trnay3nHQ (ID: 28551)
Scanner 581 atualizado
Status do projeto atualizado para 3
Iniciando processamento de comentários
```

**Validação**:
- 4 vídeos com estatísticas (views, likes, comment_count)
- 4 transcrições completas em Videos_trancricao (IDs: 1071-1074)
- 222 comentários coletados em Comentarios_Principais:
  - Vídeo 28548: 78 comentários
  - Vídeo 28549: 18 comentários
  - Vídeo 28550: 26 comentários
  - Vídeo 28551: 100 comentários
- Projeto: status = '3'

---

### ✅ STATUS 3 → 4: Video Analysis

**⚠️ PROBLEMA CONHECIDO**: Função `start_video_analysis_processing(116)` dá **timeout** ao processar múltiplos vídeos síncronos.

**Soluções alternativas**:

**Opção 1: Processar vídeos individualmente**
```sql
-- Analisar 1 vídeo por vez
SELECT analyze_video_with_claude('YOzXnEv5Nmo');
SELECT update_video_analysis(28548);

-- Repetir para cada vídeo...
```

**Opção 2: Recriar função se foi alterada**
```sql
-- Se a função foi modificada sem autorização, recriar do arquivo original
-- Arquivo: STATUS_3_VIDEO_ANALYSIS/02_process_video_analysis_batch.sql
```

**Resultado esperado** (após processar todos os vídeos):
- 4 vídeos com análise Claude completa
- Campos preenchidos: sentiment_analysis, relevance_score, target_audience, etc.
- Vídeos irrelevantes deletados (se score baixo)
- Projeto: status = '4'

**Validação STATUS 3→4**:
```sql
-- Ver análises dos vídeos
SELECT
    v.id,
    v."VIDEO",
    v.sentiment_analysis->>'is_relevant' as relevante,
    v.sentiment_analysis->>'relevance_score' as score
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = 116;
```

---

### 📊 Resumo do Teste (Projeto 116)

| Status | Função | Execuções | Tempo | Resultado |
|--------|--------|-----------|-------|-----------|
| 0→1 | `atualizar_scanner_rodada` | 1x | ~1s | 2 scanners com rodada=1 ✅ |
| 1→2 | `process_next_project_scanner` | 2x | ~10s | 4 vídeos inseridos ✅ |
| 2→3 | `update_video_stats` | 1x | ~30s | 4 transcrições + 222 comentários ✅ |
| 3→4 | `start_video_analysis_processing` | 1x* | timeout | Vídeos analisados ⚠️ |

**Total**: 4 vídeos prontos para análise de comentários (STATUS 4→5)

*Função deu timeout. Usar opções alternativas documentadas acima.

---

### 🔍 Queries Úteis de Validação

**Ver progresso geral**:
```sql
SELECT
    p.id,
    p.status,
    COUNT(DISTINCT s.id) as scanners,
    COUNT(DISTINCT v.id) as videos,
    COUNT(DISTINCT cp.id) as comentarios
FROM "Projeto" p
LEFT JOIN "Scanner de videos do youtube" s ON s."Projeto_id" = p.id
LEFT JOIN "Videos" v ON v.scanner_id = s.id
LEFT JOIN "Comentarios_Principais" cp ON cp.video_id = v.id
WHERE p.id = 116
GROUP BY p.id, p.status;
```

**Ver transcrições**:
```sql
SELECT
    v.id,
    v."VIDEO",
    LENGTH(vt.trancription) as tamanho,
    LEFT(vt.trancription, 100) as preview
FROM "Videos" v
JOIN "Videos_trancricao" vt ON v.transcript = vt.id
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = 116;
```

**Ver comentários por vídeo**:
```sql
SELECT
    v.id,
    v."VIDEO",
    COUNT(cp.id) as total_comentarios,
    COUNT(CASE WHEN cp.comentario_analizado = true THEN 1 END) as analisados
FROM "Videos" v
LEFT JOIN "Comentarios_Principais" cp ON cp.video_id = v.id
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = 116
GROUP BY v.id, v."VIDEO";
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