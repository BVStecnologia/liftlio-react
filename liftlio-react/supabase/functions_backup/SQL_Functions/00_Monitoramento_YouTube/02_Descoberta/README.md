# 📁 02_Sistema_Descoberta (JSONB v5)

**Responsabilidade**: Sistema de descoberta e qualificação de vídeos com IA
**Sistema**: Sistema 2 - Descoberta de vídeos + Fila assíncrona
**Última atualização**: 2025-10-24 - Claude Code (Anthropic) - Migração JSONB v5

---

## 🎯 PROPÓSITO

Este sistema descobre vídeos novos em canais monitorados, qualifica com IA (Claude + Python VPS),
e armazena resultados em **formato JSONB estruturado** para processamento posterior.

**ARQUITETURA ASSÍNCRONA (v5)**: Sistema de 2 etapas com fila intermediária:
1. **Descoberta** → Encontra vídeos novos e adiciona na fila
2. **Qualificação** → Processa fila com IA e salva resultados JSONB

---

## 📊 FUNÇÕES DISPONÍVEIS

### ⭐ verificar_novos_videos_youtube.sql (DISCOVERY - Etapa 1)
- **Descrição**: **APENAS DESCOBRE** vídeos novos e adiciona em `videos_para_scann` (fila)
- **Parâmetros**: `lote_tamanho` (default: 15 canais por execução)
- **Retorna**: void
- **Usado por**: CRON a cada 5 minutos
- **Versão**: v2.0 - JSONB v5 compatible
- **Chama**:
  - `can_comment_on_channel()` - Anti-spam (limite 1 comentário/7 dias por canal)
  - `Canal_youtube_dados()` - Edge Function que busca vídeos via YouTube Data API
- **Tabelas afetadas**:
  - `"Canais do youtube"` (UPDATE: `videos_para_scann`, `last_canal_check`)
  - `"Projeto"` (SELECT WHERE Youtube Active = true)
  - `"Customers"` (SELECT para verificar Mentions disponíveis)

**Features JSONB v5:**
- ✅ Deduplicação usando JSONB operators: `jsonb_array_elements(videos_scanreados::jsonb)`
- ✅ Extrai IDs com `string_agg(elem->>'id', ',')` ao invés de regex
- ✅ Compatível com arrays JSONB (não quebra com vírgulas em justificativas)
- ✅ Processamento em lotes para evitar timeout (15 canais/execução)

**Campos atualizados:**
- `videos_para_scann`: Adiciona IDs de vídeos novos separados por vírgula
- `last_canal_check`: Timestamp da última verificação (evita re-verificar antes de 30min)

---

### 🔥 processar_fila_videos.sql (QUALIFICATION - Etapa 2) **NOVA!**
- **Descrição**: **QUALIFICA COM IA** vídeos da fila e salva resultados em JSONB array
- **Parâmetros**: Nenhum (processa 1 canal por execução)
- **Retorna**: void
- **Usado por**: CRON a cada 3 minutos
- **Versão**: v1.0 - JSONB v5 native
- **Chama**:
  - `video-qualifier-wrapper` - Edge Function v5 (retorna JSONB array)
  - Python VPS (173.249.22.2:8001) - Claude Sonnet 4 + análise semântica
- **Tabelas afetadas**:
  - `"Canais do youtube"` (UPDATE: `videos_scanreados`, `processar`, limpa `videos_para_scann`)
  - `debug_processar_fila` (INSERT logs de debug - opcional)

**Features JSONB v5:**
- ✅ Recebe array JSONB da Edge Function: `[{"id": "...", "status": "APPROVED|REJECTED", "motivo": "..."}]`
- ✅ Concatena arrays com operador `||`: `videos_scanreados_atual || videos_array`
- ✅ Filtra aprovados com: `WHERE elem->>'status' = 'APPROVED'`
- ✅ Sistema de logs em 8 pontos críticos (debugging completo)

**Campos atualizados:**
- `videos_scanreados` (JSONB): Adiciona array com TODOS vídeos analisados (histórico completo)
- `processar` (TEXT): Adiciona APENAS IDs aprovados separados por vírgula
- `videos_para_scann`: Limpa após processar (libera fila)

**Exemplo de JSONB salvo:**
```json
[
  {
    "id": "gFpBbvI6NF8",
    "status": "APPROVED",
    "motivo": "Vídeo sobre AI marketing B2B, público alvo enterprise"
  },
  {
    "id": "xyz789abc",
    "status": "REJECTED",
    "motivo": "Conteúdo genérico sobre produtividade; não relacionado a marketing digital"
  }
]
```

---

### 🔵 process_monitored_videos.sql
- **Descrição**: Processa vídeos com `monitored = true`, analisa e cria comentários para High potential
- **Parâmetros**: Nenhum
- **Retorna**: JSONB com contadores (processed, analyzed, commented)
- **Usado por**: CRON jobs
- **Chama**:
  - `update_video_analysis()` - Atualiza análise do vídeo
  - `create_and_save_initial_comment()` - Cria comentário
- **Tabelas afetadas**:
  - `"Videos"` (SELECT WHERE monitored = true, UPDATE lead_potential)
  - `"Mensagens"` (INSERT via create_and_save_initial_comment)

### 🔵 update_video_analysis.sql
- **Descrição**: Atualiza análise de um vídeo específico
- **Parâmetros**:
  - `p_video_id` (BIGINT) - ID do vídeo
- **Retorna**: void
- **Usado por**: `process_monitored_videos()`
- **Tabelas afetadas**:
  - `"Videos"` (UPDATE: lead_potential)

---

## 🔗 FLUXO DE INTERLIGAÇÃO (ARQUITETURA ASSÍNCRONA v5)

```
┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 1: DESCOBERTA (verificar_novos_videos_youtube)          │
│  CRON: */5 * * * * (a cada 5 minutos)                           │
└─────────────────────────────────────────────────────────────────┘
         │
         ├─→ Busca vídeos novos via Canal_youtube_dados() Edge Function
         ├─→ Verifica anti-spam via can_comment_on_channel()
         ├─→ Deduplica usando JSONB operators (extrai IDs de videos_scanreados)
         └─→ Adiciona IDs novos em `videos_para_scann` (fila)

         ↓ (FILA INTERMEDIÁRIA - videos_para_scann)

┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 2: QUALIFICAÇÃO IA (processar_fila_videos)              │
│  CRON: */3 * * * * (a cada 3 minutos)                           │
└─────────────────────────────────────────────────────────────────┘
         │
         ├─→ Pega 1 canal da fila (videos_para_scann)
         ├─→ Chama Edge Function v5: video-qualifier-wrapper
         │     └─→ Python VPS (173.249.22.2:8001)
         │           └─→ Claude Sonnet 4 analisa semântica
         │                 └─→ Retorna JSONB: [{"id", "status", "motivo"}]
         ├─→ Salva JSONB array em `videos_scanreados` (concatena com ||)
         ├─→ Extrai aprovados para `processar` (apenas IDs)
         └─→ Limpa `videos_para_scann` (libera fila)

         ↓ (Campo processar preenchido com IDs aprovados)

┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 3: PROCESSAMENTO (process_monitored_videos)             │
│  CRON: diário ou sob demanda                                    │
└─────────────────────────────────────────────────────────────────┘
         │
         ├─→ Para cada vídeo monitored = true:
         │     ├─→ update_video_analysis() → lead_potential
         │     └─→ Se lead_potential = 'High':
         │           └─→ create_and_save_initial_comment(video_id)
         │                 └─→ create_initial_video_comment_with_claude()
         │                       ├─→ claude_complete() → gera texto
         │                       └─→ INSERT Mensagens (tipo_msg=1)
         ↓
Settings messages posts
  └─→ Agendamento automático (CRON postagem)
```

---

## 📋 CAMPOS CRÍTICOS DA TABELA "Canais do youtube"

| Campo | Tipo | Propósito | Limpeza | Formato JSONB v5 |
|-------|------|-----------|---------|------------------|
| `videos_para_scann` ⭐ **NOVO!** | TEXT | Fila de vídeos aguardando qualificação IA | ✅ Após processar | CSV: "id1,id2,id3" |
| `videos_scanreados` | TEXT | Histórico completo com justificativas (TODOS vídeos analisados) | ❌ Nunca | ✅ JSONB array: `[{"id": "...", "status": "...", "motivo": "..."}]` |
| `processar` | TEXT | IDs aprovados pela IA (apenas vídeos relevantes) | ⚠️ Manual | CSV: "id1,id2,id3" |
| `executed` | TEXT | Histórico de vídeos já inseridos no banco | ❌ Nunca | CSV: "id1,id2,id3" |
| `last_canal_check` | TIMESTAMP | Última verificação de vídeos novos (evita re-check < 30min) | ❌ Atualizado | ISO timestamp |

**Fluxo de dados:**
```
videos_para_scann (descobertos)
  → processar_fila_videos()
    → videos_scanreados (JSONB) + processar (aprovados)
```

**Ver ciclo completo em:**
- `/00_Monitoramento_YouTube/README.md` → Seção "CICLO COMPLETO DE UM VÍDEO"
- `/ASYNC_QUEUE_IMPLEMENTATION_PLAN.md` → Testes completos da migração JSONB v5

---

## 📋 DEPENDÊNCIAS

### Funções SQL necessárias:
- `can_comment_on_channel()` - Anti-spam (limite temporal)
- `process_channel_videos()` - Localização: `../03_Videos/`
- `update_video_analysis()` - Localização: `../PIPELINE_PROCESSOS/STATUS_3_VIDEO_ANALYSIS/`
- `create_and_save_initial_comment()` - Localização: `../04_Mensagens/`
- `claude_complete()` - Localização: `../03_Claude/`
- `limpar_debug_logs()` - Limpeza automática de logs (opcional)

### Edge Functions (Supabase):
- ✅ **Canal_youtube_dados** - Busca vídeos via YouTube Data API
- ✅ **video-qualifier-wrapper** (v5) - Qualifica vídeos com IA
  - Localização: `/supabase/functions/video-qualifier-wrapper/`
  - Versão: JSONB v5 (retorna array estruturado)
  - Deployment: Supabase LIVE + backups em 3 localizações
  - Chama: Python VPS (173.249.22.2:8001) → Claude Sonnet 4

### Serviços Externos:
- **Python VPS** (173.249.22.2:8001)
  - Endpoint: `/qualify-videos`
  - Modelo: Claude Sonnet 4 (claude-sonnet-4-20250514)
  - Retorna: JSON com justificativas detalhadas
  - Código: `/Servidor/Monitormanto de canais/`

### Tabelas do Supabase:
- `"Canais do youtube"` - [SELECT, UPDATE: videos_para_scann, videos_scanreados, processar]
- `"Projeto"` - [SELECT: Youtube Active, keywords, prompt_user]
- `"Customers"` - [SELECT: Mentions disponíveis]
- `"Videos"` - [SELECT, UPDATE: lead_potential, monitored]
- `"Mensagens"` - [INSERT: tipo_msg=1, Comentario_Principais=NULL]
- `debug_processar_fila` - [INSERT: logs de debug] (opcional)

---

## ⚙️ CONFIGURAÇÕES & VARIÁVEIS

- `verificar_novos_videos_youtube()`:
  - `lote_tamanho` (default: 15) - Canais processados por execução
  - Intervalo mínimo: 30 minutos entre verificações do mesmo canal

- `processar_fila_videos()`:
  - Processa: 1 canal por execução (evita timeout)
  - Timeout Edge Function: 60 segundos
  - Logs debug: 8 pontos críticos na tabela `debug_processar_fila`

- `Projeto.qtdmonitoramento` - Quantidade de canais top para monitorar (ex: 5)
- `Videos.monitored` - Flag boolean TRUE para vídeos de canais top
- `Videos.lead_potential` - Valores: 'High', 'Medium', 'Low' (apenas High recebe comentário)
- `Mensagens.tipo_msg` - Valor 1 identifica mensagem de monitoramento

---

## 🚨 REGRAS DE NEGÓCIO

### Sistema de Descoberta (v5):
1. **Fila assíncrona**: Descoberta e qualificação em etapas separadas (evita timeout)
2. **Deduplicação JSONB**: Usa operators ao invés de regex (mais robusto)
3. **Anti-spam**: 30 minutos mínimo entre verificações do mesmo canal
4. **Lotes pequenos**: 15 canais por execução (performance otimizada)
5. **JSONB arrays**: Vírgulas em justificativas não quebram parsing

### Sistema de Monitoramento:
1. **Apenas top X canais**: Usa `rank_position <= qtdmonitoramento`
2. **Apenas vídeos High**: Comentário só é criado se `lead_potential = 'High'`
3. **Sem duplicatas**: Verifica se já existe mensagem antes de criar
4. **Comentário inicial**: `Comentario_Principais = NULL` (não responde ninguém)
5. **tipo_msg = 1**: Identificador de mensagem de monitoramento

---

## 🧪 COMO TESTAR

### Teste da Fila Assíncrona (JSONB v5):

```sql
-- Teste 1: Descobrir vídeos novos (Etapa 1)
SELECT verificar_novos_videos_youtube(5);  -- Processa 5 canais

-- Teste 2: Verificar fila criada
SELECT id, channel_id, videos_para_scann
FROM "Canais do youtube"
WHERE videos_para_scann IS NOT NULL AND videos_para_scann != ''
LIMIT 5;

-- Teste 3: Processar fila com IA (Etapa 2)
SELECT processar_fila_videos();

-- Teste 4: Ver resultados JSONB salvos
SELECT
    id,
    channel_id,
    videos_para_scann,  -- Deve estar NULL (limpo)
    videos_scanreados,  -- JSONB array com justificativas
    processar           -- IDs aprovados
FROM "Canais do youtube"
WHERE id = 1119;  -- Canal de teste (Dan Martell)

-- Teste 5: Ver logs de debug (se habilitado)
SELECT * FROM debug_processar_fila
ORDER BY timestamp DESC
LIMIT 20;

-- Teste 6: Extrair vídeos aprovados do JSONB
SELECT
    c.id,
    c.channel_id,
    elem->>'id' as video_id,
    elem->>'status' as status,
    elem->>'motivo' as motivo
FROM "Canais do youtube" c,
     jsonb_array_elements(c.videos_scanreados::jsonb) as elem
WHERE elem->>'status' = 'APPROVED'
LIMIT 10;

-- Teste 7: Limpar logs de debug (manutenção)
SELECT limpar_debug_logs(7);  -- Remove logs > 7 dias
```

### Testes do Sistema de Monitoramento:

```sql
-- Teste 1: Processar todos vídeos monitorados
SELECT process_monitored_videos();

-- Teste 2: Criar comentário específico
SELECT create_initial_video_comment_with_claude(12345::BIGINT, 77::BIGINT);

-- Teste 3: Verificar vídeos monitorados aguardando comentário
SELECT v.id, v."VIDEO", v.video_title, v.lead_potential
FROM "Videos" v
WHERE v.monitored = true
  AND v.lead_potential = 'High'
  AND NOT EXISTS (SELECT 1 FROM "Mensagens" WHERE video = v.id)
LIMIT 10;

-- Teste 4: Ver mensagens de monitoramento criadas hoje
SELECT m.id, m.mensagem, m.video, m.created_at
FROM "Mensagens" m
WHERE m.tipo_msg = 1
  AND m."Comentario_Principais" IS NULL
  AND m.created_at >= CURRENT_DATE
ORDER BY m.created_at DESC;

-- Teste 5: Estatísticas do sistema de monitoramento
SELECT
    COUNT(*) as total_mensagens,
    COUNT(CASE WHEN m.respondido = true THEN 1 END) as postadas,
    COUNT(CASE WHEN m.respondido = false THEN 1 END) as pendentes,
    COUNT(DISTINCT m.video) as videos_unicos
FROM "Mensagens" m
WHERE m.tipo_msg = 1
  AND m."Comentario_Principais" IS NULL;
```

---

## 📝 CHANGELOG

### 2025-10-24 - Claude Code (Migração JSONB v5) 🎉
- ✅ **MIGRAÇÃO COMPLETA PARA JSONB ARRAYS**
- ✅ Adicionada função `processar_fila_videos()` - Qualificação assíncrona com IA
- ✅ Atualizada `verificar_novos_videos_youtube()` - Deduplicação via JSONB operators
- ✅ Sistema de fila assíncrona (`videos_para_scann`) - Evita timeouts
- ✅ Edge Function v5 deployada (`video-qualifier-wrapper`) - Retorna JSONB array
- ✅ Python service atualizado - Retorna JSON estruturado ao invés de CSV
- ✅ Sistema de logs em 8 pontos críticos - Debug completo
- ✅ 4 testes executados com sucesso - Canal 1119 (Dan Martell)
- ✅ Backups em 3 localizações - Redundância garantida
- **Total de funções**: 5 (+1 nova: processar_fila_videos)
- **Status**: Todas funcionais em LIVE
- **Documentação**: `/ASYNC_QUEUE_IMPLEMENTATION_PLAN.md` com testes detalhados

**Benefícios JSONB v5:**
1. ✅ Vírgulas em justificativas não quebram mais o sistema
2. ✅ Queries estruturadas: `jsonb_array_elements()` para filtrar
3. ✅ Type safety: PostgreSQL valida estrutura JSON
4. ✅ Indexável: GIN indexes para performance futura
5. ✅ Debugging fácil: Estrutura clara e legível

### 2025-09-30 - Claude Code
- Reorganização inicial: movido de raiz para subpasta
- Criação deste README.md
- Total de funções: 4
- Status: Todas funcionais
- Dados reais: 48 mensagens, 56 vídeos monitorados

---

## 🔧 TROUBLESHOOTING

### Problema: Vídeos não aparecem em videos_para_scann
**Solução**: Verificar se canal passou os critérios:
- `Youtube Active = true` no projeto
- `is_active = true` no canal
- `desativado_pelo_user = false`
- `last_canal_check` > 30 minutos atrás

### Problema: processar_fila_videos() não processa nada
**Solução**: Verificar logs na tabela `debug_processar_fila`:
```sql
SELECT * FROM debug_processar_fila
WHERE canal_id = 1119
ORDER BY timestamp DESC;
```

### Problema: JSONB parse error
**Solução**: Verificar se Edge Function v5 está deployada:
- Deve retornar array: `[{"id": "...", "status": "...", "motivo": "..."}]`
- Não deve retornar CSV string

### Problema: Python VPS timeout
**Solução**:
- Verificar VPS online: `curl http://173.249.22.2:8001/health`
- Ver logs: `ssh root@173.249.22.2 'docker logs -f liftlio-video-qualifier-prod'`
- Timeout padrão: 60s (ajustar se necessário)

---

## ⚠️ REGRA OBRIGATÓRIA

**SEMPRE que modificar qualquer função nesta pasta:**

1. ✅ Atualizar este README.md
2. ✅ Atualizar seção "Última atualização"
3. ✅ Adicionar entrada no CHANGELOG
4. ✅ Revisar "FLUXO DE INTERLIGAÇÃO" se mudou
5. ✅ Atualizar "DEPENDÊNCIAS" se mudou
6. ✅ Atualizar "COMO TESTAR" se interface mudou
7. ✅ Testar no LIVE antes de commitar
8. ✅ Atualizar backups em `/functions_backup/`
