# 📺 Sistema Completo: Monitoramento YouTube Liftlio

**Última atualização**: 2025-10-23 - Claude Code (Anthropic)
**Versão da estrutura**: 3.0 (Pipeline Completo Implementado)

---

## 🎯 VISÃO GERAL

Este diretório contém **TODO o sistema de interação com YouTube** do Liftlio, incluindo:
- Descoberta e gestão de canais
- Monitoramento de vídeos
- Criação de comentários (iniciais e respostas)
- Analytics e métricas
- ~~Integrações OAuth~~ → Movido para `../01_YouTube/`

### 📝 Nota sobre Funções Genéricas

Algumas funções aqui são **queries genéricas** (ex: `get_videos_by_channel_id`, `obter_canal_e_videos`) que podem ser usadas por **qualquer sistema** do Liftlio, não apenas monitoramento. Elas estão organizadas aqui por conveniência, mas servem como **utilitários compartilhados** para:
- Sistema Descoberta (Scanner)
- Sistema Monitoramento (comentários iniciais)
- Frontend (dashboards e listagens)
- Analytics e relatórios

---

## 🗂️ ESTRUTURA DE PASTAS

Sistema organizado em **módulos funcionais**, cada um com sua **responsabilidade específica**:

```
00_Monitoramento_YouTube/
│
├── 01_Canais/                                     ⭐ Gestão de canais
│   ├── README.md
│   ├── adicionar_canais_automaticamente.sql
│   ├── atualizar_canais_ativos.sql                  CRON: 6h
│   ├── get_channel_details.sql
│   ├── obter_canal_e_videos.sql
│   ├── obter_canais_nao_registrados.sql
│   ├── obter_dados_projeto_por_canal.sql
│   └── processar_novos_canais_youtube.sql
│
├── 02_Descoberta/                                 🔍 Descoberta de vídeos
│   ├── README.md
│   ├── process_channel_videos.sql
│   ├── process_monitored_videos.sql
│   └── verificar_novos_videos_youtube.sql           CRON: 45min
│
├── 03_Busca/                                      🔎 Queries utilitárias
│   ├── get_comments_and_messages_by_video_id.sql
│   ├── get_videos_by_channel_id.sql
│   ├── get_videos_by_project_id.sql
│   └── obter_comentarios_postados_por_projeto.sql
│
├── 04_Metricas/                                   📊 Analytics
│   ├── get_project_metrics.sql
│   ├── get_top_content_categories.sql
│   ├── get_weekly_project_performance.sql
│   └── update_channel_metrics.sql
│
├── 05_Comentarios/                                💬 Criação de mensagens
│   ├── create_initial_video_comment_with_claude.sql
│   └── create_monitoring_message.sql
│
├── 06_Chamadas_Externas/                          🌐 Edge Functions
│   ├── call_api_edge_function.sql
│   ├── call_youtube_channel_details.sql
│   └── call_youtube_channel_monitor.sql
│
├── 07_Automacao/                                  ⚙️ Triggers
│   ├── trigger_atualizar_canais_ativos.sql
│   └── trigger_postar_comentario_youtube.sql
│
├── 08_Anti_Spam_Sistema/                          🛡️ Proteção anti-spam
│   ├── can_comment_on_channel.sql                   ⭐ Verificação por canal
│   ├── can_comment_on_video.sql
│   ├── record_comment_attempt.sql
│   └── README.md
│
├── Crons/                                         ⏰ Jobs agendados
│   └── README_CRONS.md
│
├── _Archived/                                     📦 Arquivados
│   ├── claude_complete.sql
│   ├── fix_project_77_ranking.sql
│   └── testee.sql
│
├── README.md                                      📄 Este arquivo
├── PIPELINE_CRONS_YOUTUBE.md                       📋 Documentação CRONs
└── MAPEAMENTO_TIPOS_MENSAGENS.md                   📊 Análise completa dos tipos
```

---

## 🔄 PIPELINE COMPLETO DE MONITORAMENTO

### Arquitetura do Sistema

O sistema opera através de **arquitetura event-driven** usando triggers PostgreSQL:

```
┌─────────────────────────────────────────────────────────────┐
│  CRON: verificar_novos_videos_youtube() (A cada 45min)      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  VERIFICAÇÕES OBRIGATÓRIAS                                  │
├─────────────────────────────────────────────────────────────┤
│  1. YouTube Active = TRUE                                   │
│  2. integracao_valida = TRUE                                │
│  3. Mentions disponíveis > 0                                │
│  4. can_comment_on_channel() = TRUE (anti-spam)             │
│     └─ Se qualquer = FALSE → SKIP canal                     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  DESCOBERTA: Buscar vídeos novos                            │
├─────────────────────────────────────────────────────────────┤
│  • monitormanto_de_canal_sql() - Busca vídeos via SQL       │
│  • Adiciona TODOS IDs em [videos_scanreados]                │
│  • IA qualifica com call_api_edge_function()                │
│  • Adiciona APROVADOS em campo [processar] ⭐               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  ⚡ TRIGGER: channel_videos_processor (AUTOMÁTICO!)         │
├─────────────────────────────────────────────────────────────┤
│  Dispara quando campo [processar] é atualizado              │
│                                                              │
│  → Chama process_channel_videos()                           │
│     • Busca metadados via YouTube API                       │
│     • INSERT vídeos com monitored=true                      │
│     • Move IDs: [processar] → [executed]                    │
│     • Limpa [processar] = ''                                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  CRON: process_monitored_videos() (Diário)                  │
├─────────────────────────────────────────────────────────────┤
│  • Analisa vídeos monitored=true com Claude AI              │
│  • Identifica lead_potential = High                         │
│  • Cria mensagens iniciais (comentários)                    │
│  • Agenda postagens                                         │
└─────────────────────────────────────────────────────────────┘
```

### Funções-Chave do Sistema

#### 1. `verificar_novos_videos_youtube()`
**Localização**: `02_Descoberta/verificar_novos_videos_youtube.sql`
**CRON**: A cada 45 minutos
**Função**: Alimenta o campo [processar] com vídeos aprovados pela IA

**⚡ IMPORTANTE**: Esta função NÃO insere vídeos no banco! Ela apenas:
1. Descobre vídeos novos via monitormanto_de_canal_sql()
2. Qualifica com IA via call_api_edge_function()
3. Adiciona IDs aprovados no campo [processar]
4. O TRIGGER faz o resto automaticamente!

#### 2. `process_channel_videos(channel_id)`
**Localização**: `03_Busca/process_channel_videos.sql`
**Chamado por**: ⚡ TRIGGER channel_videos_processor (automático!)
**Função**: Processa o campo [processar] e insere vídeos no banco

**Proteções**:
- `pg_advisory_lock()` evita processamento duplicado
- Move IDs processados para campo [executed]
- Limpa campo [processar] após processar

### Integração entre CRONs

```
CRON verificar_novos_videos_youtube() (45min)
            │
            ▼
      Alimenta [processar]
            │
            ▼
⚡ TRIGGER channel_videos_processor (IMEDIATO!)
            │
            ▼
      INSERT vídeos no banco
            │
            ▼
CRON atualizar_canais_ativos() (6h)
            │
            ▼
CRON process_monitored_videos() (diário)
```

**⚠️ POR QUE NÃO HÁ CRON PARA PROCESSAR [processar]?**
Porque o TRIGGER faz isso AUTOMATICAMENTE! Assim que verificar_novos_videos_youtube() atualiza o campo [processar], o trigger dispara e processa imediatamente.

---

## 🔄 DOIS SISTEMAS PARALELOS

### SISTEMA 1: DESCOBERTA (Scanner + Respostas)

```
Scanner → Busca vídeos novos (keywords)
  ↓
Coleta TODOS comentários
  ↓
Análise PICS: Identifica LEADS
  ↓
Claude: Cria RESPOSTA personalizada
  ↓
Agenda postagem da RESPOSTA
```

**Características**:
- 2.238 mensagens (316 postadas, 1.922 pendentes)
- `Comentario_Principais IS NOT NULL` (sempre tem pai)
- Vídeos: `monitored = false/NULL`
- 242 vídeos descobertos
- **Pasta**: Funções espalhadas em PIPELINE_PROCESSOS/

---

### SISTEMA 2: MONITORAMENTO (Top Canais + Comentários Iniciais)

```
Monitor Top Canais → Detecta vídeo NOVO
  ↓
Análise: lead_potential = High?
  ↓
Claude: Cria COMENTÁRIO INICIAL
  ↓
Agenda postagem
```

**Características**:
- 48 mensagens (43 postadas, 5 pendentes)
- `Comentario_Principais IS NULL` (comentário inicial)
- Vídeos: `monitored = true`
- 56 vídeos monitorados
- **Pasta**: `02_Sistema_Monitoramento/` ⭐

---

## ⚡ CICLO COMPLETO DE UM VÍDEO (Event-Driven Architecture)

### 🎬 Timeline Detalhada: Da Descoberta ao Banco de Dados

**SISTEMA PRINCIPAL: Trigger Automático (Não precisa de Cron!)**

```
T+0min: Cron verificar_novos_videos_youtube() executa (a cada 45min)
  ↓
T+1min: Encontra vídeo "abc123" no canal via monitormanto_de_canal_sql()
  ↓
T+1min: Adiciona "abc123" em campo [videos_scanreados]
  |      (histórico completo de TODOS vídeos já verificados)
  ↓
T+2min: IA analisa vídeo via call_api_edge_function()
  |      Edge Function: video-qualifier-wrapper
  |      Retorna: Lista de vídeos APROVADOS ou "NOT"
  ↓
T+3min: Adiciona "abc123" em campo [processar]
  |      (fila de vídeos APROVADOS aguardando processamento)
  ↓
T+3min: ⚡ UPDATE dispara TRIGGER channel_videos_processor automaticamente
  ↓
T+3min: trigger_process_channel_videos() executa
  |      Detecta mudança no campo [processar]
  ↓
T+4min: process_channel_videos() processa em background
  |      - Converte CSV → Array de IDs
  |      - Filtra IDs válidos (remove 'NOT', 'AND', vazios)
  |      - Aplica pg_advisory_lock (evita duplicação)
  ↓
T+5min: Chama call_youtube_edge_function() para buscar metadados
  |      Edge Function: call-youtube-edge-function
  |      Retorna: Título, descrição, canal, thumbnails, etc.
  ↓
T+6min: INSERT vídeo na tabela "Videos" com flags:
  |      - monitored = true
  |      - comentarios_atualizados = true
  |      - Keyword = 'Canal Monitorado'
  ↓
T+6min: Move "abc123" de [processar] → [executed]
  |      (histórico de vídeos já inseridos no banco)
  ↓
T+6min: Limpa campo [processar] = ''
  |      (fila volta a vazia, pronta para próximos vídeos)
  ↓
✅ Vídeo disponível no banco de dados!

Tempo total: ~6 minutos desde descoberta até banco
```

---

### 🔑 CAMPOS CRÍTICOS DA TABELA "Canais do youtube"

| Campo | Tipo | Propósito | Limpeza | Exemplo |
|-------|------|-----------|---------|---------|
| **videos_scanreados** | TEXT | Histórico completo de TODOS vídeos já verificados | ❌ Nunca limpo | `"abc,def,ghi,jkl,mno"` |
| **processar** ⭐ | TEXT | Fila de vídeos APROVADOS aguardando processamento | ✅ Limpo após trigger | `"def,ghi"` → `""` |
| **executed** | TEXT | Histórico de vídeos já inseridos no banco | ❌ Nunca limpo | `"def,ghi"` |

**Relacionamento:**
```
videos_scanreados (ALL) ⊃ processar (QUEUE) ⊃ executed (DONE)
```

**Exemplo prático:**
```sql
-- Estado ANTES do trigger
videos_scanreados: "video1,video2,video3,video4,video5"  -- Todos descobertos
processar:         "video2,video4"                        -- Aprovados pela IA
executed:          ""                                     -- Nenhum processado ainda

-- Estado DEPOIS do trigger processar
videos_scanreados: "video1,video2,video3,video4,video5"  -- Inalterado (histórico)
processar:         ""                                     -- ✅ LIMPO (fila vazia)
executed:          "video2,video4"                        -- ✅ MOVIDO (processados)
```

---

### 🎯 POR QUE NÃO PRECISA DE CRON PARA PROCESSAR?

**Arquitetura Event-Driven (Orientada a Eventos):**

```sql
-- ❌ ERRADO: Criar cron para processar campo [processar]
-- Não precisa! O trigger faz isso automaticamente.

-- ✅ CORRETO: Sistema atual com trigger
CREATE TRIGGER channel_videos_processor
  AFTER INSERT OR UPDATE ON "Canais do youtube"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_process_channel_videos();
```

**Vantagens do Trigger vs Cron:**
- ✅ Processamento **IMEDIATO** (não espera próximo cron)
- ✅ **Desacoplamento** entre descoberta e inserção
- ✅ **Fila visível** (campo pode ser inspecionado manualmente)
- ✅ **Automático** (zero manutenção)
- ✅ **Eficiente** (só processa quando há mudanças)

**Quando o Trigger NÃO dispara:**
- Campo `processar` está vazio (`""` ou `NULL`)
- Valor não mudou (mesmo ID já estava lá)
- Operação é DELETE (trigger só observa INSERT/UPDATE)

---

### 🔄 FLUXO COMPLETO COM PRÓXIMAS ETAPAS

```
1️⃣ DESCOBERTA (Cron 45min)
   verificar_novos_videos_youtube()
   ↓
   Campo [processar] preenchido

2️⃣ PROCESSAMENTO AUTOMÁTICO (Trigger)
   channel_videos_processor
   ↓
   Vídeos inseridos na tabela "Videos"

3️⃣ ANÁLISE DE QUALIDADE (Cron 5min)
   process_monitored_videos()
   ↓
   - Atualiza lead_potential (High/Medium/Low)
   - Cria comentários para vídeos High

4️⃣ POSTAGEM (Sistema independente)
   Agenda postagens via Settings messages posts
   ↓
   Comentários postados no YouTube
```

**Tempo total do fluxo completo:** ~11 minutos (descoberta → comentário postado)

---

## 📚 NAVEGAÇÃO & DOCUMENTAÇÃO

### Como usar esta estrutura:

| Preciso de...                       | Vá para...                              |
|-------------------------------------|-----------------------------------------|
| **Entender pipeline completo** ⭐    | `03_Pipeline/README.md` 📘              |
| Gestão de canais e ranking          | `01_Canais/README.md`                   |
| Descoberta de vídeos                 | `02_Descoberta/README.md`               |
| Queries de busca                     | `03_Busca/`                             |
| Métricas e analytics                 | `04_Metricas/README.md`                 |
| Criação de comentários               | `05_Comentarios/`                       |
| Chamadas externas (Edge Functions)   | `06_Chamadas_Externas/README.md`        |
| Triggers e automações                | `07_Automacao/README.md`                |
| Sistema Anti-Spam                    | `08_Anti_Spam_Sistema/README.md`        |
| Ver CRON jobs                        | `PIPELINE_CRONS_YOUTUBE.md`             |
| Entender tipos de mensagens          | `MAPEAMENTO_TIPOS_MENSAGENS.md`         |
| OAuth e tokens YouTube               | `../01_YouTube/` ⭐                      |

---

## 🔍 CONCEITOS-CHAVE

### Tipos de Mensagem (tipo_msg)

**Na tabela `Mensagens`**:
- `tipo_msg = 1`: Mensagem simples
- `tipo_msg = 2`: Mensagem com análise Claude

**Na tabela `Settings messages posts`**:
- `tipo_msg = 1`: Agendamento tipo 1 (não usado)
- `tipo_msg = 2`: Agendamento tipo 2 (padrão)

⚠️ **IMPORTANTE**: `tipo_msg` NÃO diferencia descoberta vs monitoramento!

### O VERDADEIRO Diferenciador

```sql
-- SISTEMA 1 (Descoberta/Respostas):
WHERE "Comentario_Principais" IS NOT NULL  -- Responde alguém
  AND v.monitored = FALSE                  -- Vídeo descoberto

-- SISTEMA 2 (Monitoramento/Iniciais):
WHERE "Comentario_Principais" IS NULL      -- Comentário inicial
  AND v.monitored = TRUE                   -- Vídeo monitorado
```

### Tipo de Resposta (tipo_resposta)

```sql
'engajamento': Resposta focada em engajamento (maioria)
'produto': Resposta focada em produto/venda
```

---

## 🚨 SISTEMA DE RANKING DE CANAIS

### Campos Importantes:

| Campo           | Descrição                          | Valores    |
|-----------------|------------------------------------|------------|
| ranking_score   | Pontuação de relevância            | 0-100      |
| rank_position   | Posição no ranking (1 = melhor)    | 1-N        |
| qtdmonitoramento| Qtd de canais top para monitorar   | Padrão: 30 |

### Fluxo de Ranking:

1. **Descoberta**: Canais encontrados via comentários → `Canais descobertos`
2. **Registro**: `adicionar_canais_automaticamente()` → Registra oficialmente
3. **Ranking**: `processar_novos_canais_youtube()` → Calcula score e position
4. **Monitoramento**: Top X canais (baseado em `rank_position <= qtdmonitoramento`)

---

## 📊 ESTATÍSTICAS ATUAIS

```
SISTEMA DESCOBERTA (Respostas):
├─ Total: 2.238 mensagens
├─ Postadas: 316 ✅
├─ Pendentes: 1.922 ⏳
└─ Vídeos: 242

SISTEMA MONITORAMENTO (Iniciais):
├─ Total: 48 mensagens
├─ Postadas: 43 ✅
├─ Pendentes: 5 ⏳
└─ Vídeos: 56
```

---

## ⚠️ PROBLEMAS CONHECIDOS

### 1. Campo "processar" Vazio (CRÍTICO)

**Sintoma**: Pipeline roda com sucesso, mas nenhuma mensagem é criada
**Causa raiz**: Edge Function `video-qualifier-wrapper` está rejeitando 100% dos vídeos

**Diagnóstico**:
```sql
-- Verificar campo "processar" para projeto específico
SELECT
    c."Nome" as canal,
    c.videos_scanreados,
    c.processar,
    jsonb_array_length(c.videos_scanreados) as total_vids,
    CASE
        WHEN c.processar IS NULL THEN 0
        ELSE jsonb_array_length(c.processar)
    END as vids_aprovados
FROM "Canais do youtube" c
WHERE c."Projeto" = 117
  AND c.is_active = true;
```

**Evidências**:
- ✅ `verificar_novos_videos_youtube()` CRON rodando corretamente (45min)
- ✅ Vídeos sendo descobertos e inseridos na tabela Videos
- ✅ Campo `videos_scanreados` sendo populado
- ❌ Edge Function retornando "NOT" (rejeita todos)
- ❌ Campo `processar` permanece vazio
- ❌ Nenhuma mensagem criada

**Próximos passos para investigação**:
1. Verificar logs da Edge Function `video-qualifier-wrapper`
2. Testar critérios de qualificação de vídeos
3. Ajustar parâmetros de lead_potential
4. Verificar se Claude AI está rejeitando por algum padrão específico

### 2. youtube_comment_id NÃO É SALVO

**Impacto**: Impossível verificar se comentários postados ainda existem

**Solução planejada**:
```sql
ALTER TABLE "Mensagens"
ADD COLUMN youtube_comment_id TEXT,
ADD COLUMN verification_status TEXT DEFAULT 'active',
ADD COLUMN last_verification_at TIMESTAMPTZ;
```

Ver detalhes em: `MAPEAMENTO_TIPOS_MENSAGENS.md` (linha 187)

### 3. Projeto 77 - Ranking NULL

**Problema**: 145 canais com `ranking_score = NULL`
**Solução**: `_Archived/fix_project_77_ranking.sql`

---

## 🧪 QUERIES ÚTEIS

### Verificar mensagens de monitoramento:

```sql
SELECT
    m.id,
    m.mensagem,
    v.video_title,
    m.respondido,
    m.created_at
FROM "Mensagens" m
JOIN "Videos" v ON m.video = v.id
WHERE m."Comentario_Principais" IS NULL
  AND v.monitored = TRUE
ORDER BY m.created_at DESC
LIMIT 10;
```

### Ver top canais monitorados:

```sql
SELECT
    c.nome,
    cyp.rank_position,
    cyp.ranking_score,
    p.qtdmonitoramento
FROM "Canais do youtube" c
JOIN "Canais do youtube_Projeto" cyp ON c.id = cyp."Canais do youtube"
JOIN "Projeto" p ON cyp."Projeto" = p.id
WHERE cyp.rank_position <= p.qtdmonitoramento
ORDER BY cyp.rank_position
LIMIT 20;
```

### Estatísticas por sistema:

```sql
-- Sistema Descoberta (Respostas)
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN respondido = true THEN 1 END) as postadas,
    COUNT(CASE WHEN respondido = false THEN 1 END) as pendentes
FROM "Mensagens"
WHERE "Comentario_Principais" IS NOT NULL;

-- Sistema Monitoramento (Iniciais)
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN respondido = true THEN 1 END) as postadas,
    COUNT(CASE WHEN respondido = false THEN 1 END) as pendentes
FROM "Mensagens"
WHERE "Comentario_Principais" IS NULL
  AND video IS NOT NULL;
```

---

## 📋 REGRAS DE DESENVOLVIMENTO

### ⚠️ OBRIGATÓRIO ao modificar funções:

1. ✅ **Atualizar README.md da subpasta**
2. ✅ **Atualizar "Última atualização"**
3. ✅ **Adicionar entrada no CHANGELOG**
4. ✅ **Revisar "FLUXO DE INTERLIGAÇÃO"** (se aplicável)
5. ✅ **Atualizar "DEPENDÊNCIAS"** (se aplicável)

### Padrão de código:

```sql
-- =============================================
-- Função: nome_da_funcao
-- Descrição: O que ela faz
-- Criado: 2025-09-30
-- Atualizado: Mudanças importantes
-- =============================================

DROP FUNCTION IF EXISTS nome_da_funcao(parametros);

CREATE OR REPLACE FUNCTION nome_da_funcao(...)
RETURNS tipo
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- código
END;
$$;
```

### Sincronização Supabase ↔ Local:

1. **Criar no Supabase** → Salvar em arquivo local IMEDIATAMENTE
2. **Editar no Supabase** → Atualizar arquivo local
3. **Deletar do Supabase** → Mover arquivo para `_Archived/`

---

## 🔗 LINKS ÚTEIS

- **Dashboard Supabase**: [https://supabase.com/dashboard/project/suqjifkhmekcdflwowiw](https://supabase.com/dashboard/project/suqjifkhmekcdflwowiw)
- **SQL Editor**: Database → SQL Editor
- **Edge Functions**: Edge Functions
- **Logs**: Logs & Analytics

---

## 📝 CHANGELOG PRINCIPAL

### 2026-01-01 - Fix get_project_metrics v3
- ✅ Refatorada função `get_project_metrics` para usar tabela Videos
- ✅ Corrigido bug "Today: 70" que contava vídeos antigos sem analyzed_at
- ✅ Agora conta vídeos created_at = hoje (correto)
- ✅ Atualizado label frontend: "Posts analyzed today" → "Approved today"
- ✅ Campos novos do sistema: videos_scanreados_2, videos_para_scann, executed

### 2025-09-30 - Reorganização v2.0
- ✅ Criada estrutura de 6 subpastas temáticas
- ✅ Movidas 28 funções SQL para categorias apropriadas
- ✅ Criados 6 READMEs detalhados (um por subpasta)
- ✅ Arquivados 3 arquivos temporários em `_Archived/`
- ✅ Atualizado MAPEAMENTO_TIPOS_MENSAGENS.md
- ✅ Corrigidos dados: 2.238 descoberta + 48 monitoramento
- ✅ Movidas 3 funções de OAuth para `../01_YouTube/` (nível superior)

### Versões anteriores
- Ver CHANGELOG de cada subpasta para histórico detalhado

---

## 🎯 PRÓXIMOS PASSOS

1. Implementar salvamento de `youtube_comment_id`
2. Sistema de verificação de deleted comments
3. Sistema de strikes para canais
4. Dashboard de analytics em tempo real

---

**Para mais detalhes, consulte os READMEs específicos de cada subpasta!**
