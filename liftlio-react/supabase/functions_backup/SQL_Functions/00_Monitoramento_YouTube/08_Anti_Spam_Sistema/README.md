# 🛡️ Sistema Anti-Spam YouTube - Prevenção de Bans

**Criado**: 2025-01-02
**Última atualização**: 2025-01-03
**Status**: 📝 PLANEJAMENTO
**Versão**: 2.0 (Simplificado)

---

## 🎯 O PROBLEMA

### Contas Banidas pelo YouTube:

```
Projeto 58 (HW): BANIDO ❌
├─ 231 mensagens postadas
├─ 14 comentários NO MESMO CANAL
└─ Causa: Concentração excessiva = parece bot

Projeto 77 (Liftlio): BANIDO ❌
├─ 90 mensagens em 1 dia
├─ 34 comentários NO MESMO CANAL
└─ Causa: Volume + concentração = YouTube detectou
```

**YouTube pensa**: "Esse cara comentou 34 vezes no meu canal? É BOT!"

---

## ✅ A SOLUÇÃO

### Estratégia em 2 Camadas:

```
CAMADA 1: PREVENÇÃO (Etapa 1)
└─ Não comentar no mesmo canal repetidamente
   └─ Canal pequeno (<10k): espera 14 dias
   └─ Canal médio (10-100k): espera 10 dias
   └─ Canal grande (>100k): espera 7 dias

CAMADA 2: APRENDIZADO (Etapa 2)
└─ Detectar quando comentário é deletado
   └─ Se deletado rápido (<1h): BLACKLIST (bot detection)
   └─ Se deletado cedo (<24h): BLACKLIST (dono rejeita)
   └─ Se 2+ deleções: BLACKLIST (padrão)
```

---

## 🗺️ ARQUITETURA DO SISTEMA

### FLUXO ATUAL (Com Anti-Spam integrado):

```
verificar_novos_videos_youtube() (CRON 45min)
  ↓ Verifica canais ativos
  ↓
  ├─ Canal A (comentou ontem)
  │   └─ can_comment_on_channel(A, 77)? ❌ (< 7 dias)
  │       └─ PULA ✅
  │
  ├─ Canal B (comentou há 15 dias, 5k subs)
  │   └─ can_comment_on_channel(B, 77)? ✅ (> 14 dias)
  │       ├─ Busca vídeos novos
  │       ├─ IA qualifica vídeos
  │       └─ Adiciona IDs em campo [processar] ✅
  │
  ├─ Canal C (deletou 3x comentários)
  │   └─ can_comment_on_channel(C, 77)? ❌ (blacklisted)
  │       └─ PULA ✅
  │
  └─ Canal D (user desativou)
      └─ can_comment_on_channel(D, 77)? ❌ (desativado)
          └─ PULA ✅
  ↓
⚡ TRIGGER channel_videos_processor (automático)
  ↓ Processa campo [processar]
  ↓
process_channel_videos()
  ↓ INSERT vídeos com monitored=true
  ↓ (só processa canais aprovados)
  ↓
process_monitored_videos()
  ↓ (cria comentários normalmente)
  ↓
post_youtube_video_comment()
  └─ POSTA no YouTube
      └─ Salva youtube_comment_id ✅

┌─────────────────────────────────────┐
│  SISTEMA BACKGROUND (CRON)          │
├─────────────────────────────────────┤
│ A cada 1 hora:                      │
│ cron_verify_comments()              │
│   ↓                                 │
│   └─ Para cada comentário recente:  │
│       ├─ 1h, 6h, 24h, 3d, 7d, 14d  │
│       └─ verify_comment_and_...()   │
│           ├─ Chama YouTube API      │
│           ├─ Comentário existe? ✅  │
│           └─ Deletado? ❌           │
│               └─ Blacklist canal ⚫ │
└─────────────────────────────────────┘
```

**Resultado**: Comentários espaçados + aprende canais ruins = SEM BAN

---

## 📊 COMPARAÇÃO VISUAL

### ANTES (Sistema Atual):
```
Semana 1:
Canal XYZ: [💬][💬][💬][💬][💬][💬] = 6 comentários
           ↓
YouTube: "É BOT! BAN!" ❌
```

### DEPOIS (Com Anti-Spam):
```
Semana 1:
Canal XYZ: [💬]........................ = 1 comentário
           ↑
           └─ Esperou 7 dias

Semana 2:
Canal XYZ: [💬]........................ = 1 comentário
           ↑
YouTube: "Parece humano normal" ✅
```

---

## 🗂️ ESTRUTURA DE PASTAS

```
08_Anti_Spam_Sistema/
│
├── README.md ← Você está aqui (Visão Geral)
│
├── 01_ETAPAS/
│   ├── README.md                    (Índice das etapas)
│   ├── ETAPA_1_README.md            (Proteção por Frequência)
│   └── ETAPA_2_README.md            (Detecção Automática)
│
├── 02_MIGRATIONS/
│   ├── README.md                    (Como aplicar migrations)
│   ├── etapa1_add_auto_disabled.sql (Se precisar)
│   └── etapa2_add_tracking.sql      (Colunas de verificação)
│
├── 03_FUNCOES/
│   ├── README.md                    (Índice das funções)
│   ├── can_comment_on_channel.sql   (ETAPA 1)
│   ├── verify_comment_and_penalty.sql (ETAPA 2)
│   └── cron_verify_comments.sql     (ETAPA 2)
│
├── 04_TESTES/
│   ├── README.md                    (Como testar)
│   ├── test_etapa1.sql              (Testes Etapa 1)
│   └── test_etapa2.sql              (Testes Etapa 2)
│
├── 05_CRONS/
│   └── README.md                    (Configurar CRON Supabase)
│
└── 06_ANALYTICS/
    ├── README.md                    (Queries úteis)
    ├── deletion_rate_by_channel.sql
    ├── blacklist_report.sql
    └── frequency_analysis.sql
```

---

## 🚀 PLANO DE IMPLEMENTAÇÃO

### 📋 Resumo das 2 Etapas:

| Etapa | Nome | O Que Faz | Tempo | Risco |
|-------|------|-----------|-------|-------|
| **1** | Proteção por Frequência | Evita comentar no mesmo canal repetidamente | 1h | 🟢 ZERO |
| **2** | Detecção Automática | Aprende quais canais deletam comentários | 2-3h | 🟡 BAIXO |

**Total**: 3-4 horas
**Pode parar na Etapa 1** se resolver o problema!

---

## 📝 ETAPA 1: Proteção por Frequência

### 🎯 Objetivo Mental:
"Não deixar o sistema comentar de novo no mesmo canal até passar X dias (baseado no tamanho do canal)"

### 🧠 Lógica:
1. **Antes de processar um canal**, perguntar: "Posso comentar aqui?"
2. **Verificar**:
   - ✅ Última vez que comentei neste canal
   - ✅ Tamanho do canal (inscritos)
   - ✅ Se user desativou manualmente
   - ✅ Se está em blacklist automático
3. **Decidir**:
   - Canal pequeno + comentou há 10 dias = ❌ (precisa 14)
   - Canal grande + comentou há 8 dias = ✅ (precisa 7)

### 🛠️ O Que Criar:

#### **1 Função SQL**:
```
can_comment_on_channel(canal_id, project_id)
  └─ Retorna: TRUE (pode) ou FALSE (não pode)
```

**Responsabilidade**: TODA a inteligência em 1 lugar
**Onde usar**: `verificar_novos_videos_youtube()`

#### **Integração**:
A função `can_comment_on_channel()` já está integrada em `verificar_novos_videos_youtube()`:
```sql
IF NOT can_comment_on_channel(v_channel.id, p_project_id) THEN
  CONTINUE; -- Pula este canal
END IF;
```

### ✅ Resultado Esperado:
- Sistema PARA de comentar no mesmo canal por 7-14 dias
- 80% do problema de ban resolvido
- ZERO risco (só adiciona filtro)

**Detalhes completos**: Ver `01_ETAPAS/ETAPA_1_README.md`

---

## 📝 ETAPA 2: Detecção Automática

### 🎯 Objetivo Mental:
"Sistema aprende sozinho: se canal deletou comentário, nunca mais comenta lá"

### 🧠 Lógica:
1. **CRON roda a cada hora**
2. **Busca comentários** postados há: 1h, 6h, 24h, 3d, 7d, 14d
3. **Para cada um**:
   - Chama YouTube API: "Esse comentário existe?"
   - Se SIM → atualiza verificação
   - Se NÃO (deletado):
     - Marca mensagem como deletada
     - Calcula: deletado em quantas horas?
     - **Aplica blacklist**:
       - < 1h = Bot detection
       - < 24h = Dono rejeita
       - 2+ deleções = Padrão

### 🛠️ O Que Criar:

#### **2 Migrations**:
1. Colunas em "Mensagens" (tracking de verificação)
2. Coluna em "Canais do youtube" (contador de deleções)

#### **1 Função SQL**:
```
verify_comment_and_apply_penalty(message_id)
  ├─ Verifica se comentário existe (YouTube API)
  ├─ Atualiza status da mensagem
  └─ SE deletado: aplica blacklist no canal
```

**Responsabilidade**: Verificação + Penalidade em 1 função

#### **1 CRON**:
```
cron_verify_comments()
  └─ Loop chamando verify_comment_and_apply_penalty()
```

### ✅ Resultado Esperado:
- Sistema detecta deleções automaticamente
- Canais problemáticos vão pra blacklist sozinhos
- Etapa 1 já vai respeitar esse blacklist
- 100% automático após configurar

**Detalhes completos**: Ver `01_ETAPAS/ETAPA_2_README.md`

---

## 🔧 FUNÇÕES CRIADAS (Resumo)

### Etapa 1:
```sql
can_comment_on_channel(canal_id BIGINT, project_id BIGINT)
  → RETURNS BOOLEAN

-- Verifica TUDO:
-- ✅ Última data de comentário
-- ✅ Tamanho do canal (subscriber_count)
-- ✅ Calcula dias necessários (7, 10 ou 14)
-- ✅ Verifica desativado_pelo_user
-- ✅ Verifica auto_disabled_reason
-- Retorna: TRUE = pode comentar / FALSE = pular
```

### Etapa 2:
```sql
verify_comment_and_apply_penalty(message_id BIGINT)
  → RETURNS JSONB

-- Faz TUDO:
-- ✅ Busca youtube_comment_id
-- ✅ Chama YouTube API
-- ✅ UPDATE em Mensagens (status)
-- ✅ SE deletado: aplica regras de blacklist no canal
-- Retorna: JSON com resultado da verificação
```

```sql
cron_verify_comments()
  → RETURNS JSONB

-- Roda no CRON:
-- ✅ Loop nas mensagens (1h, 6h, 24h, 3d, 7d, 14d)
-- ✅ Chama verify_comment_and_apply_penalty()
-- Retorna: JSON com estatísticas
```

---

## 🧪 COMO TESTAR

### Validação Prévia (antes de tudo):
```sql
-- Verificar se youtube_comment_id está sendo salvo:
SELECT
  COUNT(*) as total_postados,
  COUNT(youtube_comment_id) as com_id,
  ROUND(COUNT(youtube_comment_id) * 100.0 / COUNT(*), 1) as percentual
FROM "Mensagens"
WHERE respondido = TRUE
  AND created_at >= NOW() - INTERVAL '7 days';

-- Se percentual < 90%: corrigir post_youtube_video_comment() ANTES
```

### Após Etapa 1:
```sql
-- Testar função diretamente:
SELECT can_comment_on_channel(123, 77); -- TRUE ou FALSE?

-- Ver quais canais podem comentar:
SELECT
  c.nome,
  c.subscriber_count,
  can_comment_on_channel(c.id, 77) as pode_comentar
FROM "Canais do youtube" c
LIMIT 10;

-- Rodar verificação de vídeos novos e ver logs:
-- (Executado automaticamente pelo CRON a cada 45min)
```

### Após Etapa 2:
```sql
-- Testar verificação de 1 comentário:
SELECT verify_comment_and_apply_penalty(12345);

-- Rodar CRON manualmente:
SELECT cron_verify_comments();

-- Ver blacklist automático:
SELECT nome, auto_disabled_reason, comments_deleted_count
FROM "Canais do youtube"
WHERE auto_disabled_reason IS NOT NULL;
```

**Testes completos**: Ver `04_TESTES/README.md`

---

## 📊 MÉTRICAS DE SUCESSO

### Como saber se está funcionando:

```sql
-- 1. Taxa de repetição por canal (deve ser ZERO em < 7 dias):
SELECT
  c.nome,
  COUNT(*) as comentarios,
  MAX(m.created_at) - MIN(m.created_at) as intervalo
FROM "Mensagens" m
JOIN "Videos" v ON m.video = v.id
JOIN "Canais do youtube" c ON v.canal_id = c.id
WHERE m.respondido = TRUE
  AND m.created_at >= NOW() - INTERVAL '30 days'
GROUP BY c.nome
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 2. Taxa de deleção (deve ser < 10%):
SELECT
  COUNT(*) as total_comentarios,
  SUM(CASE WHEN still_exists = FALSE THEN 1 ELSE 0 END) as deletados,
  ROUND(SUM(CASE WHEN still_exists = FALSE THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as taxa_delecao
FROM "Mensagens"
WHERE respondido = TRUE
  AND youtube_comment_id IS NOT NULL;

-- 3. Canais blacklistados:
SELECT COUNT(*) FROM "Canais do youtube"
WHERE auto_disabled_reason IS NOT NULL;
```

**Queries completas**: Ver `06_ANALYTICS/README.md`

---

## 🎯 DECISÃO: QUANDO IMPLEMENTAR CADA ETAPA?

### Cenário 1: "Só quero resolver o ban rápido"
→ **Implemente apenas ETAPA 1** (1 hora)
→ Monitore por 1 semana
→ Se parar de receber bans: PRONTO! ✅

### Cenário 2: "Quero sistema completo e automático"
→ **Implemente ETAPA 1** (1 hora)
→ Teste e aprove
→ **Implemente ETAPA 2** (2-3 horas)
→ Configure CRON
→ Sistema aprende sozinho ✅

---

## 🚨 IMPORTANTE SABER

### O que JÁ existe no banco:
- ✅ `desativado_pelo_user` em "Canais do youtube"
- ✅ `youtube_comment_id` em "Mensagens"
- ✅ `subscriber_count` em "Canais do youtube"

### O que VAI criar:
- 🆕 `auto_disabled_reason` em "Canais do youtube" (Etapa 1)
- 🆕 `comments_deleted_count` em "Canais do youtube" (Etapa 2)
- 🆕 `last_verified_at`, `verification_count`, `still_exists`, `deleted_at` em "Mensagens" (Etapa 2)

### Funções que já têm anti-spam integrado:
- ✅ `verificar_novos_videos_youtube()` - Já chama can_comment_on_channel() (Etapa 1)

### Funções que NÃO vai mexer:
- ✅ `process_monitored_videos()` - Continua igual
- ✅ `process_channel_videos()` - Continua igual
- ✅ `post_youtube_video_comment()` - Continua igual (já salva ID)

---

## 📚 NAVEGAÇÃO

| Quer entender... | Vá para... |
|------------------|------------|
| Como funciona Etapa 1 em detalhes | `01_ETAPAS/ETAPA_1_README.md` |
| Como funciona Etapa 2 em detalhes | `01_ETAPAS/ETAPA_2_README.md` |
| Código das funções SQL | `03_FUNCOES/README.md` |
| Como testar cada etapa | `04_TESTES/README.md` |
| Como aplicar migrations | `02_MIGRATIONS/README.md` |
| Como configurar CRON | `05_CRONS/README.md` |
| Queries de análise | `06_ANALYTICS/README.md` |

---

## 🎬 PRÓXIMO PASSO

**Leia**: `01_ETAPAS/ETAPA_1_README.md` para entender em detalhes como funciona a proteção por frequência.

**Quando estiver pronto**: Me avise e implementamos juntos, etapa por etapa, com você aprovando cada passo.

---

**Última atualização**: 2025-01-03 - Versão 2.0 (Simplificada de 6 → 2 etapas)
