# 📁 02_Sistema_Monitoramento

**Responsabilidade**: Sistema de comentários iniciais em vídeos "quentes" de canais top
**Sistema**: Sistema 2 - Monitoramento (comentários iniciais, NÃO respostas)
**Última atualização**: 2025-09-30 - Claude Code (Anthropic)

---

## 🎯 PROPÓSITO

Este sistema monitora os TOP X canais de cada projeto e cria **comentários iniciais engajantes**
em vídeos novos com alto potencial de leads (`lead_potential = High`).

**DIFERENTE** do Sistema Descoberta que RESPONDE comentários, este sistema CRIA o primeiro
comentário no vídeo para gerar engajamento inicial.

---

## 📊 FUNÇÕES DISPONÍVEIS

### ⭐ verificar_novos_videos_youtube.sql (FUNÇÃO CRÍTICA DO SISTEMA)
- **Descrição**: **ALIMENTA O CAMPO [processar]** - Monitora canais ativos buscando novos vídeos e filtrando com IA
- **Parâmetros**: Nenhum (processa TODOS projetos com YouTube Active)
- **Retorna**: JSONB com estatísticas detalhadas por canal
- **Usado por**: CRON a cada 45 minutos (`*/45 * * * *`)
- **Chama**:
  - `can_comment_on_channel()` - Anti-spam (limite 1 comentário/7 dias por canal)
  - `monitormanto_de_canal_sql()` - Busca vídeos novos via SQL direto (otimizado!)
  - `call_api_edge_function()` - Qualifica vídeos com IA (video-qualifier-wrapper)
- **Tabelas afetadas**:
  - `"Canais do youtube"` (UPDATE: videos_scanreados, processar)
  - `"Projeto"` (SELECT WHERE Youtube Active = true)
  - `"Customers"` (SELECT para verificar Mentions disponíveis)
- **Sistema de campos:**
  - `videos_scanreados`: Adiciona TODOS vídeos encontrados (histórico completo)
  - `processar`: Adiciona APENAS vídeos APROVADOS pela IA ⭐

**⚡ ARQUITETURA EVENT-DRIVEN:**
```
Esta função ALIMENTA o campo [processar], que automaticamente
dispara o TRIGGER channel_videos_processor para processar vídeos!

Fluxo completo:
1. verificar_novos_videos_youtube() encontra vídeos novos
2. IA aprova vídeos relevantes via call_api_edge_function()
3. UPDATE campo [processar] com IDs aprovados
4. ⚡ TRIGGER channel_videos_processor dispara automaticamente
5. process_channel_videos() insere vídeos na tabela "Videos"
6. Campo [processar] é limpo = ''

POR ISSO NÃO PRECISA DE CRON PARA PROCESSAR! O trigger faz tudo.
```

**Campos críticos da tabela "Canais do youtube":**
| Campo | Propósito | Limpeza |
|-------|-----------|---------|
| `videos_scanreados` | Histórico completo (TODOS vídeos já verificados) | ❌ Nunca |
| `processar` ⭐ | Fila de vídeos APROVADOS aguardando processamento | ✅ Após trigger |
| `executed` | Histórico de vídeos já inseridos no banco | ❌ Nunca |

**Ver ciclo completo em:**
- `/00_Monitoramento_YouTube/README.md` → Seção "CICLO COMPLETO DE UM VÍDEO"

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

### 🔵 create_initial_video_comment_with_claude.sql
- **Descrição**: Cria comentário inicial usando Claude AI (baseado em título, descrição, transcrição)
- **Parâmetros**:
  - `p_video_id` (BIGINT) - ID do vídeo
  - `p_project_id` (BIGINT) - ID do projeto
- **Retorna**: JSONB com `{success, message_id, comment}`
- **Usado por**:
  - `process_monitored_videos()`
  - `create_monitoring_message()`
- **Chama**:
  - `claude_complete()` - Gera texto do comentário
- **Tabelas afetadas**:
  - `"Videos"` (SELECT + JOIN Videos_trancricao)
  - `"Projeto"` (SELECT config)
  - `"Mensagens"` (INSERT com tipo_msg=1)

### 🔵 create_monitoring_message.sql
- **Descrição**: Wrapper que verifica duplicatas e chama create_initial_video_comment_with_claude
- **Parâmetros**:
  - `p_project_id` (INTEGER) - ID do projeto
  - `p_video_youtube_id` (TEXT) - ID do YouTube do vídeo
  - `p_channel_id` (TEXT) - ID do canal
- **Retorna**: JSONB com resultado
- **Usado por**: Sistemas externos, APIs
- **Chama**: `create_initial_video_comment_with_claude()`
- **Tabelas afetadas**:
  - `"Videos"` (SELECT)
  - `"Mensagens"` (SELECT para verificar duplicata)

---

## 🔗 FLUXO DE INTERLIGAÇÃO

```
CRON verificar_novos_videos_youtube() (a cada 45min)
  ├─→ Busca vídeos novos em canais ativos
  ├─→ IA aprova vídeos relevantes
  └─→ Adiciona IDs em campo [processar]
  ↓
⚡ TRIGGER channel_videos_processor (automático)
  └─→ process_channel_videos()
        └─→ INSERT vídeos com monitored = true
  ↓
CRON process_monitored_videos() (diário)
  ├─→ Para cada vídeo monitored = true:
  │     ├─→ update_video_analysis() → lead_potential
  │     └─→ Se lead_potential = 'High':
  │           └─→ create_and_save_initial_comment(video_id)
  │                 └─→ create_initial_video_comment_with_claude()
  │                       ├─→ claude_complete() → gera texto
  │                       └─→ INSERT Mensagens (tipo_msg=1, Comentario_Principais=NULL)
  ↓
Settings messages posts
  └─→ Agendamento automático (CRON postagem)
```

---

## 📋 DEPENDÊNCIAS

### Funções externas necessárias:
- `process_channel_videos()` - Localização: `../03_Videos/`
- `update_video_analysis()` - Localização: `../PIPELINE_PROCESSOS/STATUS_3_VIDEO_ANALYSIS/`
- `create_and_save_initial_comment()` - Localização: `../04_Mensagens/`
- `claude_complete()` - Localização: `../03_Claude/`

### Tabelas do Supabase:
- `"Videos"` - [SELECT, UPDATE: lead_potential, monitored]
- `"Mensagens"` - [INSERT: tipo_msg=1, Comentario_Principais=NULL]
- `"Canais do youtube"` - [SELECT]
- `"Canais do youtube_Projeto"` - [SELECT: rank_position, ranking_score]
- `"Projeto"` - [SELECT: qtdmonitoramento, keywords, prompt_user]
- `"Videos_trancricao"` - [SELECT: transcrição]

### Edge Functions:
- Nenhuma (usa funções SQL diretas)

---

## ⚙️ CONFIGURAÇÕES & VARIÁVEIS

- `Projeto.qtdmonitoramento` - Quantidade de canais top para monitorar (ex: 5)
- `Videos.monitored` - Flag boolean TRUE para vídeos de canais top
- `Videos.lead_potential` - Valores: 'High', 'Medium', 'Low' (apenas High recebe comentário)
- `Mensagens.tipo_msg` - Valor 1 identifica mensagem de monitoramento
- `Canais do youtube_Projeto.rank_position` - Posição do canal no ranking (1 = melhor)

---

## 🚨 REGRAS DE NEGÓCIO

1. **Apenas top X canais**: Usa `rank_position <= qtdmonitoramento`
2. **Apenas vídeos High**: Comentário só é criado se `lead_potential = 'High'`
3. **Sem duplicatas**: Verifica se já existe mensagem antes de criar
4. **Comentário inicial**: `Comentario_Principais = NULL` (não responde ninguém)
5. **tipo_msg = 1**: Identificador de mensagem de monitoramento
6. **Agendamento automático**: Após criação, entra no sistema de agendamento padrão

---

## 🧪 COMO TESTAR

```sql
-- Teste 1: Processar todos vídeos monitorados (qualquer projeto)
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

### 2025-09-30 - Claude Code
- Reorganização inicial: movido de raiz para subpasta
- Criação deste README.md
- Total de funções: 4
- Status: Todas funcionais
- Dados reais: 48 mensagens, 56 vídeos monitorados

---

## ⚠️ REGRA OBRIGATÓRIA

**SEMPRE que modificar qualquer função nesta pasta:**

1. ✅ Atualizar este README.md
2. ✅ Atualizar seção "Última atualização"
3. ✅ Adicionar entrada no CHANGELOG
4. ✅ Revisar "FLUXO DE INTERLIGAÇÃO" se mudou
5. ✅ Atualizar "DEPENDÊNCIAS" se mudou
6. ✅ Atualizar "COMO TESTAR" se interface mudou
