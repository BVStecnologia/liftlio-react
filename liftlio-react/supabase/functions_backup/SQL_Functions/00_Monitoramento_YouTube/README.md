# 📺 Sistema Completo: Monitoramento YouTube Liftlio

**Última atualização**: 2025-09-30 - Claude Code (Anthropic)
**Versão da estrutura**: 2.0 (Reorganização completa)

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

As **28 funções SQL** foram organizadas em **6 categorias temáticas**, cada uma com seu **README.md detalhado**:

```
00_Monitoramento_YouTube/
│
├── 01_Gestao_Canais/                              [7 funções]
│   ├── README.md                                  ⭐ Documentação completa
│   ├── adicionar_canais_automaticamente.sql
│   ├── atualizar_canais_ativos.sql
│   ├── get_channel_details.sql
│   ├── obter_canal_e_videos.sql
│   ├── obter_canais_nao_registrados.sql
│   ├── obter_dados_projeto_por_canal.sql
│   └── processar_novos_canais_youtube.sql
│
├── 02_Sistema_Monitoramento/                      [4 funções] ⭐ SISTEMA 2
│   ├── README.md
│   ├── create_initial_video_comment_with_claude.sql
│   ├── create_monitoring_message.sql
│   ├── monitor_top_channels_for_project.sql
│   └── process_monitored_videos.sql
│
├── 03_Videos/                                     [4 funções]
│   ├── README.md
│   ├── get_videos_by_channel_id.sql
│   ├── get_videos_by_project_id.sql
│   ├── process_channel_videos.sql
│   └── verificar_novos_videos_youtube.sql
│
├── 04_Analytics/                                  [5 funções]
│   ├── README.md
│   ├── get_comments_and_messages_by_video_id.sql
│   ├── get_project_metrics.sql
│   ├── get_top_content_categories.sql
│   ├── get_weekly_project_performance.sql
│   └── obter_comentarios_postados_por_projeto.sql
│
├── 06_Postagem/                                   [Documentação completa] ⭐
│   └── README.md                                  📘 Fluxo completo de postagem
│       ├─ CRON: cron_processar_todas_postagens_pendentes()
│       ├─ Agendamento: agendar_postagens_diarias()
│       ├─ Processamento: post_scheduled_messages()
│       ├─ API: respond_to_youtube_comment()
│       └─ API: post_youtube_video_comment()
│
├── Edge_Functions/                                [3 funções]
│   ├── README.md
│   ├── call_api_edge_function.sql
│   ├── call_youtube_channel_details.sql
│   └── call_youtube_channel_monitor.sql
│
├── Triggers/                                      [2 triggers]
│   ├── README.md
│   ├── trigger_atualizar_canais_ativos.sql
│   └── trigger_postar_comentario_youtube.sql
│
├── Crons/                                         [Documentação]
│   └── README_CRONS.md
│
├── _Archived/                                     [Fixes temporários]
│   ├── claude_complete.sql
│   ├── fix_project_77_ranking.sql
│   └── testee.sql
│
├── README.md                                      📄 Este arquivo
├── MAPEAMENTO_TIPOS_MENSAGENS.md                  📊 Análise completa dos tipos
└── ANALISE_SISTEMA_DELETED_COMMENTS.md            🔍 Sistema de detecção
```

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

## 📚 NAVEGAÇÃO & DOCUMENTAÇÃO

### Como usar esta estrutura:

| Preciso de...                     | Vá para...                          |
|-----------------------------------|-------------------------------------|
| Entender gestão de canais         | `01_Gestao_Canais/README.md`        |
| Criar comentários iniciais        | `02_Sistema_Monitoramento/README.md`|
| Trabalhar com vídeos              | `03_Videos/README.md`               |
| Ver métricas/analytics            | `04_Analytics/README.md`            |
| **Entender sistema de postagem** ⭐| `06_Postagem/README.md` 📘          |
| OAuth e tokens YouTube            | `../01_YouTube/` ⭐                  |
| Chamar Edge Functions             | `Edge_Functions/README.md`          |
| Trabalhar com triggers            | `Triggers/README.md`                |
| Ver CRON jobs                     | `Crons/README_CRONS.md`             |
| Entender tipos de mensagens       | `MAPEAMENTO_TIPOS_MENSAGENS.md`     |
| Sistema deleted comments          | `ANALISE_SISTEMA_DELETED_COMMENTS.md`|

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

### 1. youtube_comment_id NÃO É SALVO

**Impacto**: Impossível verificar se comentários postados ainda existem

**Solução planejada**:
```sql
ALTER TABLE "Mensagens"
ADD COLUMN youtube_comment_id TEXT,
ADD COLUMN verification_status TEXT DEFAULT 'active',
ADD COLUMN last_verification_at TIMESTAMPTZ;
```

Ver detalhes em: `MAPEAMENTO_TIPOS_MENSAGENS.md` (linha 187)

### 2. Projeto 77 - Ranking NULL

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
