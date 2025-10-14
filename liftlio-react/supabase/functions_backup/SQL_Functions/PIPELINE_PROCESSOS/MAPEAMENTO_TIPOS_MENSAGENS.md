# 🗺️ MAPEAMENTO COMPLETO: Sistema de Mensagens Liftlio

**Data**: 2025-09-30
**Autor**: Claude Code (Anthropic)
**Status**: ✅ Análise CORRIGIDA - Dados Reais

---

## 🎯 DESCOBERTA CRÍTICA

O sistema Liftlio possui **DOIS SISTEMAS SEPARADOS** de mensagens:

```
┌────────────────────────────────────────────────────────────────┐
│  SISTEMA 1: DESCOBERTA (Scanner de vídeos relevantes)         │
│  • 2.238 mensagens COM Comentarios_Principal (RESPOSTAS)      │
│  • Responde comentários de leads potenciais                    │
│  • 316 postadas, 1.922 pendentes                               │
│  • 242 vídeos descobertos                                      │
│                                                                 │
│  SISTEMA 2: MONITORAMENTO (Top canais do projeto)             │
│  • 48 mensagens SEM Comentarios_Principal (INICIAIS)          │
│  • Cria comentários iniciais em vídeos "quentes"              │
│  • 43 postadas, 5 pendentes                                    │
│  • 56 vídeos monitorados                                       │
└────────────────────────────────────────────────────────────────┘
```

---

## 📊 ESTATÍSTICAS REAIS

```
SISTEMA DESCOBERTA (Respostas a Comentários):
├─ Total: 2.238 mensagens
├─ Postadas: 316 ✅
├─ Pendentes: 1.922 ⏳
├─ Vídeos únicos: 242
├─ tipo_msg: 2
├─ Comentario_Principais: NOT NULL (sempre tem pai)
└─ Função: Responder leads identificados pelo scanner

SISTEMA MONITORAMENTO (Comentários Iniciais):
├─ Total: 48 mensagens
├─ Postadas: 43 ✅
├─ Pendentes: 5 ⏳
├─ Vídeos únicos: 56
├─ tipo_msg: 1
├─ Comentario_Principais: NULL (não responde ninguém)
└─ Função: Engajar em vídeos novos de canais top
```

---

## 🔄 FLUXOS REAIS DOS DOIS SISTEMAS

### SISTEMA 1: DESCOBERTA (Scanner + Respostas)

```
STATUS 1-2: Scanner busca vídeos novos (por keywords)
  ↓
STATUS 2-3: Coletar TODOS comentários dos vídeos encontrados
  ↓
STATUS 3-4: Analisar vídeos com Claude (relevância)
  ↓
STATUS 4-5: Analisar comentários com PICS score (identificar LEADS)
  ↓
STATUS 5-6: Criar mensagens de RESPOSTA aos leads (Claude)
  ↓
CRON: Agendar e postar respostas aos comentários
```

**Vídeos**: `monitored = false/NULL` (descobertos via scanner)
**Mensagens**: `Comentario_Principais IS NOT NULL` (responde alguém)
**Total**: 2.238 mensagens | 242 vídeos

---

### SISTEMA 2: MONITORAMENTO (Top Canais + Comentários Iniciais)

```
Monitor Top Canais: Detecta vídeo NOVO em canal top X do projeto
  ↓
Análise rápida: Vídeo tem lead_potential = High?
  ↓
Claude: Cria COMENTÁRIO INICIAL engajante (sem responder ninguém)
  ↓
Salva como tipo_msg = 1, sem Comentario_Principais
  ↓
CRON: Agenda e posta comentário inicial no vídeo
```

**Vídeos**: `monitored = true` (canais no top X do projeto)
**Mensagens**: `Comentario_Principais IS NULL` (comentário inicial)
**Total**: 48 mensagens | 56 vídeos

---

## 📋 TIPOS DE MENSAGENS

### NÃO existe "tipo_msg = 1 vs 2" para diferenciar!

O campo `tipo_msg` existe em duas tabelas diferentes:

```sql
-- Settings messages posts: controle de agendamento
tipo_msg = 1: Agendamento tipo 1 (não usado atualmente)
tipo_msg = 2: Agendamento tipo 2 (usado para tudo)

-- Mensagens: tipo de conteúdo
tipo_msg = 1: Mensagem simples
tipo_msg = 2: Mensagem com análise Claude
```

### O VERDADEIRO diferenciador: `tipo_resposta`

```sql
-- Campo: Mensagens.tipo_resposta
'engajamento': Resposta focada em engajamento (570 msgs)
'produto': Resposta focada em produto (40 msgs)
```

---

## 🎯 IDENTIFICANDO MENSAGENS DE MONITORAMENTO

### ✅ Critério CORRETO:

```sql
SELECT
    smp.id,
    smp.status,
    m.tipo_resposta,
    cp.id_do_comentario as youtube_parent_id
FROM "Settings messages posts" smp
JOIN "Mensagens" m ON smp."Mensagens" = m.id
JOIN "Comentarios_Principais" cp ON smp."Comentarios_Principal" = cp.id
WHERE smp."Comentarios_Principal" IS NOT NULL  -- ✅ É uma RESPOSTA
AND smp.status = 'posted'                      -- ✅ Já foi postado
AND v.monitored = FALSE;                       -- ✅ Vídeo descoberto
```

### ❌ Critério ERRADO (análise anterior):

```sql
-- ERRADO: tipo_msg não é o diferenciador!
WHERE smp.tipo_msg = 2  -- ❌ Quase todas são tipo_msg=2
```

---

## 🔍 ESTRUTURA DAS TABELAS

### Settings messages posts
```
id                      : ID do agendamento
Projeto                 : Projeto que criou a mensagem
Videos                  : Vídeo onde foi/será postado (pode ser NULL)
Comentarios_Principal   : Comentário PAI que estamos respondendo (⚠️ CRÍTICO)
Mensagens              : Mensagem criada pela IA
status                 : 'pending' | 'posted'
postado                : Data/hora que foi postado
proxima_postagem       : Agendamento futuro
tipo_msg               : 1 ou 2 (não diferencia monitoramento)
```

### Mensagens
```
id                     : ID da mensagem
mensagem              : Texto da resposta
respondido            : Se já foi postado
tipo_msg              : 1 ou 2 (tipo de processamento)
tipo_resposta         : 'engajamento' | 'produto' ⚠️
project_id            : Projeto dono
```

### Comentarios_Principais
```
id                    : ID interno
id_do_comentario      : ID do YouTube (parent comment)
text_display          : Texto original do comentário
author_name           : Autor do comentário original
```

---

## ⚠️ PROBLEMA CRÍTICO: youtube_comment_id NÃO É SALVO (apenas Sistema Descoberta)

### Aplica-se APENAS ao Sistema 1 (Descoberta/Respostas):

```sql
-- 1. CRON chama
cron_processar_todas_postagens_pendentes()
  ↓
-- 2. Para cada pendente, chama
post_scheduled_messages(p_settings_id)
  ↓
-- 3. Posta no YouTube via HTTP
respond_to_youtube_comment(project_id, parent_comment_id, response_text)
  ↓
-- 4. Retorna JSONB
{
  "success": true,
  "response": {
    "id": "UgxKREhKRE...",  ⚠️ ID DO COMENTÁRIO CRIADO
    "snippet": {...}
  }
}
  ↓
-- 5. ❌ PROBLEMA: ID não é salvo!
UPDATE "Mensagens" SET respondido = true  -- ❌ Não salva o ID retornado!
```

### Consequência:

**É IMPOSSÍVEL verificar se as 316 RESPOSTAS postadas ainda existem**, porque não sabemos o ID deles no YouTube!

**NOTA**: Sistema de Monitoramento (comentários iniciais) também tem o mesmo problema.

---

## ✅ SOLUÇÃO: Salvar youtube_comment_id

### FASE 1: Adicionar campo

```sql
ALTER TABLE "Mensagens"
ADD COLUMN youtube_comment_id TEXT,
ADD COLUMN verification_status TEXT DEFAULT 'active',
ADD COLUMN last_verification_at TIMESTAMPTZ;
```

### FASE 2: Modificar post_scheduled_messages.sql

```sql
-- ✅ CORREÇÃO (linha 62-68)
IF (v_response->>'success')::boolean THEN
    UPDATE "Settings messages posts"
    SET status = 'posted', postado = NOW()
    WHERE id = p_settings_id;

    UPDATE "Mensagens"
    SET respondido = true,
        youtube_comment_id = (v_response->'response'->>'id')::TEXT,  -- ✅ SALVAR ID!
        verification_status = 'active',
        last_verification_at = NOW()
    WHERE id = (SELECT "Mensagens" FROM "Settings messages posts" WHERE id = p_settings_id);
END IF;
```

---

## 🚨 REGRAS DE NEGÓCIO: Deleted Comments Detection

### Quando uma RESPOSTA é deletada pelo dono do canal:

1. **Registrar** em `comment_deletion_log`
2. **Aplicar strike** ao canal (`Canais do youtube`)
3. **Atualizar status**: `Mensagens.verification_status = 'deleted'`
4. **Criar notificação** para o usuário

### Sistema de Strikes:

```
1º strike: Warning (flag de aviso)
2º strike: Suspender canal por 7 dias
3º strike: Suspender canal por 30 dias
4º+ strike: Ban permanente do canal
```

---

## 📈 QUERIES ÚTEIS

### Ver respostas postadas com dados completos:

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

### Contar respostas por tipo:

```sql
SELECT
    m.tipo_resposta,
    COUNT(*) as total,
    COUNT(CASE WHEN smp.status = 'posted' THEN 1 END) as postadas,
    COUNT(CASE WHEN smp.status = 'pending' THEN 1 END) as pendentes
FROM "Settings messages posts" smp
JOIN "Mensagens" m ON smp."Mensagens" = m.id
WHERE smp."Comentarios_Principal" IS NOT NULL
GROUP BY m.tipo_resposta;
```

---

## ✅ CONCLUSÕES

1. **Sistema é 99.7% RESPOSTAS**, não comentários iniciais
2. **Diferenciador** é `Comentarios_Principal IS NOT NULL`, não `tipo_msg`
3. **tipo_resposta** ('engajamento' vs 'produto') é a categorização real
4. **Problema crítico**: `youtube_comment_id` não está sendo salvo
5. **Solução**: Modificar `post_scheduled_messages.sql` para salvar o ID retornado

---

## 📁 ESTRUTURA DE PASTAS E NAVEGAÇÃO

### Reorganização 2025-09-30

As funções SQL foram organizadas em **7 subpastas** temáticas, cada uma com seu **README.md detalhado**:

```
00_Monitoramento_YouTube/
│
├── 01_Gestao_Canais/
│   ├── README.md                                  ⭐ Documentação completa
│   ├── adicionar_canais_automaticamente.sql
│   ├── atualizar_canais_ativos.sql
│   ├── get_channel_details.sql
│   ├── obter_canal_e_videos.sql
│   ├── obter_canais_nao_registrados.sql
│   ├── obter_dados_projeto_por_canal.sql
│   └── processar_novos_canais_youtube.sql
│
├── 02_Sistema_Monitoramento/                      ⭐ Sistema 2 (comentários iniciais)
│   ├── README.md
│   ├── create_initial_video_comment_with_claude.sql
│   ├── create_monitoring_message.sql
│   ├── monitor_top_channels_for_project.sql
│   └── process_monitored_videos.sql
│
├── 03_Videos/
│   ├── README.md
│   ├── get_videos_by_channel_id.sql
│   ├── get_videos_by_project_id.sql
│   ├── process_channel_videos.sql
│   └── verificar_novos_videos_youtube.sql
│
├── 04_Analytics/
│   ├── README.md
│   ├── get_comments_and_messages_by_video_id.sql
│   ├── get_project_metrics.sql
│   ├── get_top_content_categories.sql
│   ├── get_weekly_project_performance.sql
│   └── obter_comentarios_postados_por_projeto.sql
│
├── Edge_Functions/
│   ├── README.md
│   ├── call_api_edge_function.sql
│   ├── call_youtube_channel_details.sql
│   └── call_youtube_channel_monitor.sql
│
├── Triggers/
│   ├── README.md
│   ├── trigger_atualizar_canais_ativos.sql
│   └── trigger_postar_comentario_youtube.sql
│
├── _Archived/                                      ⚠️ Fixes temporários
│   ├── claude_complete.sql
│   └── fix_project_77_ranking.sql
│
├── MAPEAMENTO_TIPOS_MENSAGENS.md                  📄 Este arquivo
└── ANALISE_SISTEMA_DELETED_COMMENTS.md
```

### 🎯 Como Navegar:

1. **Entender um sistema completo**: Leia o `README.md` da subpasta
2. **Ver fluxo de interligação**: Seção "FLUXO DE INTERLIGAÇÃO" de cada README
3. **Testar funções**: Seção "COMO TESTAR" tem queries prontas
4. **Verificar dependências**: Seção "DEPENDÊNCIAS" lista funções/tabelas relacionadas

### ⚠️ REGRA CRÍTICA:

**SEMPRE que modificar qualquer função SQL:**
1. ✅ Atualizar o `README.md` da subpasta
2. ✅ Atualizar "Última atualização" no README
3. ✅ Adicionar entrada no "CHANGELOG"
4. ✅ Revisar "FLUXO DE INTERLIGAÇÃO" se aplicável
5. ✅ Atualizar "DEPENDÊNCIAS" se aplicável

---

**Próximo passo**: Implementar Sprint 1 com a correção do bug de salvamento do ID.
