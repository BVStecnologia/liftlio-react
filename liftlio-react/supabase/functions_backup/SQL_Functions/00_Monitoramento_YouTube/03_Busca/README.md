# 📁 03_Videos

**Responsabilidade**: Queries e processamento de vídeos do YouTube
**Sistema**: Ambos (Descoberta + Monitoramento)
**Última atualização**: 2025-09-30 - Claude Code (Anthropic)

---

## 🎯 PROPÓSITO

Este conjunto de funções gerencia operações relacionadas a vídeos:
- Verificação de vídeos novos
- Queries de consulta por canal/projeto
- Processamento de vídeos de um canal
- Marcação de vídeos para monitoramento

Usado por ambos sistemas (Descoberta busca vídeos relevantes, Monitoramento marca vídeos de top canais).

---

## 📊 FUNÇÕES DISPONÍVEIS

### 🔵 verificar_novos_videos_youtube.sql
- **Descrição**: Verifica vídeos novos em canais registrados via API YouTube
- **Parâmetros**: Pode receber limite de canais a verificar
- **Retorna**: JSONB com estatísticas (novos vídeos encontrados, canais verificados)
- **Usado por**: CRON jobs de descoberta
- **Chama**:
  - Edge Functions YouTube API
  - Funções de inserção de vídeos
- **Tabelas afetadas**:
  - `"Videos"` (INSERT novos vídeos)
  - `"Canais do youtube"` (SELECT, UPDATE última verificação)

### 🔵 get_videos_by_channel_id.sql
- **Descrição**: Retorna lista de vídeos de um canal específico
- **Parâmetros**:
  - `p_channel_id` (TEXT ou BIGINT) - ID do canal
  - `p_limit` (INTEGER opcional) - Limite de resultados
- **Retorna**: TABLE com dados dos vídeos
- **Usado por**: Páginas de canal, dashboards
- **Chama**: Nenhuma função externa
- **Tabelas afetadas**:
  - `"Videos"` (SELECT WHERE Canais = channel_id)

### 🔵 get_videos_by_project_id.sql
- **Descrição**: Retorna todos vídeos associados a um projeto
- **Parâmetros**:
  - `p_project_id` (INTEGER) - ID do projeto
  - Filtros opcionais (monitored, lead_potential)
- **Retorna**: TABLE com dados dos vídeos
- **Usado por**: Dashboards de projeto, analytics
- **Chama**: Nenhuma função externa
- **Tabelas afetadas**:
  - `"Videos"` (SELECT)
  - `"Canais do youtube_Projeto"` (JOIN para filtrar por projeto)

### ⭐ process_channel_videos.sql (CONSUMIDOR DO CAMPO [processar])
- **Descrição**: **PROCESSA CAMPO [processar]** - Insere vídeos aprovados pela IA na tabela "Videos"
- **Parâmetros**:
  - `p_channel_id` (BIGINT) - ID interno do canal (não YouTube ID!)
- **Retorna**: JSONB com estatísticas (vídeos processados, inseridos, erros)
- **Usado por**:
  - ⚡ **TRIGGER channel_videos_processor** (automático!) ⭐
- **Chama**:
  - `call_youtube_edge_function()` - Busca metadados dos vídeos
  - `pg_advisory_lock()` - Lock para evitar processamento duplicado
- **Tabelas afetadas**:
  - `"Canais do youtube"` (SELECT + UPDATE: processar → executed, processar = '')
  - `"Videos"` (INSERT com monitored=true, comentarios_atualizados=true)

**⚡ ARQUITETURA EVENT-DRIVEN:**
```
Esta função é chamada AUTOMATICAMENTE pelo TRIGGER quando
o campo [processar] é atualizado!

Fluxo de execução:
1. Lê campo [processar] do canal (CSV de video IDs)
2. Converte CSV → Array, filtra IDs válidos
3. Aplica pg_advisory_lock (evita duplicação)
4. Chama call_youtube_edge_function() para metadados
5. INSERT vídeos na tabela "Videos" com flags:
   - monitored = true
   - comentarios_atualizados = true
   - Keyword = 'Canal Monitorado'
6. Move IDs de [processar] → [executed]
7. Limpa campo [processar] = ''

⚠️ NÃO PRECISA DE CRON! O trigger faz a chamada automaticamente.
```

**Campos manipulados:**
| Campo | Antes | Depois | Ação |
|-------|-------|--------|------|
| `processar` | `"abc,def,ghi"` | `""` | Limpo após processar |
| `executed` | `"xyz"` | `"xyz,abc,def,ghi"` | IDs movidos para histórico |

**Ver documentação completa:**
- `/00_Monitoramento_YouTube/README.md` → "CICLO COMPLETO DE UM VÍDEO"
- `/07_Automacao/README.md` → "channel_videos_processor"

---

## 🔗 FLUXO DE INTERLIGAÇÃO

```
CRON Descoberta de Vídeos (a cada 45min):
  └─→ verificar_novos_videos_youtube()
        ├─→ Para cada canal:
        │     ├─→ Busca vídeos via API YouTube
        │     ├─→ IA aprova vídeos relevantes
        │     └─→ Adiciona IDs em campo [processar]
        ↓
⚡ TRIGGER channel_videos_processor (automático):
  └─→ process_channel_videos(channel_id)
        ├─→ Busca metadados via YouTube API
        └─→ INSERT vídeos na tabela "Videos"

Queries de consulta (independentes):
├─→ get_videos_by_channel_id(channel_id)
└─→ get_videos_by_project_id(project_id)
```

---

## 📋 DEPENDÊNCIAS

### Funções externas necessárias:
- Edge Functions YouTube API (para buscar novos vídeos)
- Funções de análise de vídeo (opcional, dependendo da implementação)

### Tabelas do Supabase:
- `"Videos"` - [INSERT, SELECT, UPDATE: monitored, dados do vídeo]
- `"Canais do youtube"` - [SELECT, UPDATE: última verificação]
- `"Canais do youtube_Projeto"` - [SELECT: para filtrar por projeto]
- `"Videos_trancricao"` - [Pode ser referenciado em JOINs]

### Edge Functions:
- `youtube-video-search` - Busca vídeos de um canal
- `youtube-video-details` - Busca detalhes completos de um vídeo

---

## ⚙️ CONFIGURAÇÕES & VARIÁVEIS

- `Videos.monitored` - Boolean TRUE indica vídeo de canal top (Sistema Monitoramento)
- `Videos.lead_potential` - 'High', 'Medium', 'Low' após análise
- `Videos.VIDEO` - ID único do vídeo no YouTube
- `Canais do youtube.ultima_verificacao` - Timestamp da última verificação de vídeos

---

## 🚨 REGRAS DE NEGÓCIO

1. **Vídeos únicos**: Não pode haver duplicatas de `VIDEO` (YouTube video ID)
2. **Associação canal**: Vídeo deve estar associado a um canal registrado
3. **monitored = true**: Apenas para vídeos de canais no top X do projeto
4. **Verificação periódica**: Canais ativos são verificados diariamente
5. **Limite de busca**: Por performance, buscar no máximo últimos 50 vídeos por canal

---

## 🧪 COMO TESTAR

```sql
-- Teste 1: Verificar novos vídeos (limite 5 canais)
SELECT verificar_novos_videos_youtube(5);

-- Teste 2: Vídeos de um canal específico
SELECT * FROM get_videos_by_channel_id('UCxxxxxxxxxxxxx', 20);

-- Teste 3: Vídeos de um projeto
SELECT * FROM get_videos_by_project_id(77);

-- Teste 4: Vídeos monitorados de um projeto
SELECT v.id, v."VIDEO", v.video_title, v.monitored, v.lead_potential
FROM "Videos" v
JOIN "Canais do youtube" c ON v."Canais" = c.id
JOIN "Canais do youtube_Projeto" cyp ON cyp."Canais do youtube_id" = c.id
WHERE cyp."Projeto_id" = 77
  AND v.monitored = true
ORDER BY v.created_at DESC;

-- Teste 5: Processar vídeos de um canal (marcar como monitored)
SELECT process_channel_videos('UCxxxxxxxxxxxxx', 77);

-- Teste 6: Estatísticas de vídeos
SELECT
    COUNT(*) as total_videos,
    COUNT(CASE WHEN monitored = true THEN 1 END) as monitored,
    COUNT(CASE WHEN monitored = false OR monitored IS NULL THEN 1 END) as discovered,
    COUNT(CASE WHEN lead_potential = 'High' THEN 1 END) as high_potential
FROM "Videos";
```

---

## 📝 CHANGELOG

### 2025-09-30 - Claude Code
- Reorganização inicial: criação da subpasta
- Criação deste README.md
- Total de funções: 4
- Status: Todas funcionais
- Dados reais: 298 vídeos (56 monitored, 242 discovered)

---

## ⚠️ REGRA OBRIGATÓRIA

**SEMPRE que modificar qualquer função nesta pasta:**

1. ✅ Atualizar este README.md
2. ✅ Atualizar seção "Última atualização"
3. ✅ Adicionar entrada no CHANGELOG
4. ✅ Revisar "FLUXO DE INTERLIGAÇÃO" se mudou
5. ✅ Atualizar "DEPENDÊNCIAS" se mudou
6. ✅ Atualizar "COMO TESTAR" se interface mudou
