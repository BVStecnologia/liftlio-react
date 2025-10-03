# 🟡 ETAPA 2: Detecção Automática

**Tempo estimado**: 2-3 horas
**Risco**: 🟡 BAIXO
**Impacto**: Sistema 100% automático com aprendizado
**Depende de**: Etapa 1 funcionando

---

## 🎯 OBJETIVO MENTAL

**O que a Etapa 1 faz**: Evita comentar no mesmo canal repetidamente (proteção manual)

**O que a Etapa 2 adiciona**: Sistema aprende sozinho - se canal deletou comentário, nunca mais comenta lá (proteção automática)

---

## 🧠 COMO FUNCIONA (Logicamente)

### A Grande Ideia:

```
Você posta comentário no YouTube
  ↓
Sistema salva o ID do comentário
  ↓
CRON verifica periodicamente (1h, 6h, 24h, 3d, 7d, 14d):
  "Esse comentário ainda existe?"
  ↓
  ├─ SIM → Tudo OK ✅
  │   └─ Atualiza: "verificado em [data]"
  │
  └─ NÃO (deletado) → Canal é PROBLEMA ❌
      ├─ Marca: "comentário deletado"
      ├─ Calcula: "deletado em X horas"
      └─ APLICA BLACKLIST:
          ├─ < 1h = Bot detection (filtro automático YouTube)
          ├─ < 24h = Dono rejeita (deletou rápido)
          └─ 2+ deleções = Padrão (canal não gosta)
```

### Exemplo Real:

```
Dia 1 (10:00): Comentário postado no "Canal Tech BR"
  └─ Salvo: youtube_comment_id = "UgzX3abc..."

Dia 1 (11:00): CRON verifica (1h depois)
  └─ YouTube API: "Comentário existe?" → SIM ✅
  └─ Atualiza: verification_count = 1

Dia 1 (16:00): CRON verifica (6h depois)
  └─ YouTube API: "Comentário existe?" → NÃO ❌
  └─ DETECTADO: Deletado em 6 horas!
  └─ AÇÃO:
      ├─ Marca mensagem: deleted_at = "Dia 1 16:00"
      ├─ Incrementa: Canal Tech BR → comments_deleted_count = 1
      └─ BLACKLIST: auto_disabled_reason = "Comentário deletado em 6h (dono rejeita)"

Próxima vez que monitor rodar:
  └─ can_comment_on_channel("Canal Tech BR", 77)?
      └─ FALSE ❌ (tem auto_disabled_reason)
          └─ NUNCA MAIS comenta lá! 🚫
```

---

## 📐 REGRAS DE BLACKLIST

### Automáticas (Sistema Aplica Sozinho):

| Timing | Regra | Motivo |
|--------|-------|--------|
| **< 1 hora** | BLACKLIST IMEDIATO | YouTube detectou como spam automaticamente |
| **< 24 horas** | BLACKLIST | Dono do canal deletou rápido = rejeita comentários |
| **2+ deleções** | BLACKLIST | Padrão: canal sempre deleta, não adianta insistir |

### Exemplo Visual:

```
Cenário A: Filtro Automático YouTube
[💬 Postado 10:00] → [🗑️ Deletado 10:30] (30min)
  └─ Sistema: "YouTube filtrou como spam"
  └─ Blacklist: "Bot detection - não adianta comentar aqui"

Cenário B: Dono Ativo Rejeita
[💬 Postado 10:00] → [🗑️ Deletado 18:00] (8h)
  └─ Sistema: "Dono viu e rejeitou"
  └─ Blacklist: "Dono ativo rejeita comentários"

Cenário C: Padrão de Rejeição
Canal X: [💬] → [🗑️] (deletado)
Canal X: [💬] → [🗑️] (deletado de novo!)
  └─ Sistema: "2 deleções = padrão"
  └─ Blacklist: "Canal rejeita conteúdo consistentemente"
```

---

## 🛠️ O QUE VAI SER CRIADO

### 1️⃣ Migrations (Adicionar Colunas)

**Em "Mensagens"**:
```sql
- last_verified_at TIMESTAMPTZ     -- Última vez que verificou
- verification_count INTEGER        -- Quantas vezes verificou (max 6)
- still_exists BOOLEAN              -- Comentário ainda existe?
- deleted_at TIMESTAMPTZ           -- Quando foi detectada deleção
```

**Em "Canais do youtube"**:
```sql
- comments_deleted_count INTEGER   -- Contador de deleções
```

**Nota**: `auto_disabled_reason` já foi criada na Etapa 1!

---

### 2️⃣ Função SQL: `verify_comment_and_apply_penalty()`

**Responsabilidade**: Verifica 1 comentário E aplica penalidade se deletado

**Entrada**: `message_id` (BIGINT)

**Saída**: JSONB com resultado

**O que faz**:
1. Busca `youtube_comment_id` da mensagem
2. Busca `canal_id` e `created_at`
3. Chama YouTube API: `GET /comments?id=xxx`
4. UPDATE em "Mensagens":
   - `last_verified_at = NOW()`
   - `verification_count++`
   - `still_exists = TRUE/FALSE`
   - `deleted_at = NOW()` (se deletado)
5. **SE deletado**:
   - Calcula `hours_since_posted`
   - Incrementa `comments_deleted_count` do canal
   - Aplica regras de blacklist:
     - `< 1h` → `auto_disabled_reason = 'Bot detection'`
     - `< 24h` → `auto_disabled_reason = 'Dono rejeita'`
     - `>= 2 deleções` → `auto_disabled_reason = 'Padrão'`
6. Retorna JSON com resultado

**Vantagem**: TUDO em 1 função (verificação + penalidade atômica)

---

### 3️⃣ CRON: `cron_verify_comments()`

**Responsabilidade**: Roda periodicamente e verifica vários comentários

**Quando roda**: A cada 1 hora (configurado no Supabase)

**O que faz**:
1. Busca mensagens que precisam verificação:
   ```
   - 1 hora depois (1ª verificação)
   - 6 horas depois (2ª verificação)
   - 24 horas depois (3ª verificação)
   - 3 dias depois (4ª verificação)
   - 7 dias depois (5ª verificação)
   - 14 dias depois (6ª e última)
   ```
2. Para cada mensagem:
   - Chama `verify_comment_and_apply_penalty(message_id)`
3. Retorna estatísticas:
   ```json
   {
     "verified": 15,
     "deleted": 2,
     "timestamp": "2025-01-03T10:00:00Z"
   }
   ```

**Limitação**: Máximo 50 comentários por execução (não sobrecarregar API)

---

## 📊 CRONOGRAMA DE VERIFICAÇÃO

### Timeline de 1 Comentário:

```
[💬] Comentário postado às 10:00
  ↓
  ├─ 11:00 (1h depois)    → 1ª verificação ✅
  ├─ 16:00 (6h depois)    → 2ª verificação ✅
  ├─ 10:00 +1 dia         → 3ª verificação ✅
  ├─ 10:00 +3 dias        → 4ª verificação ✅
  ├─ 10:00 +7 dias        → 5ª verificação ✅
  └─ 10:00 +14 dias       → 6ª verificação ✅ (ÚLTIMA)

Se deletado em QUALQUER verificação:
  └─ Para de verificar (still_exists = FALSE)
  └─ Canal vai pra blacklist
```

**Por quê 6 verificações?**
- Primeiras horas: Detecta filtro automático YouTube
- Primeiro dia: Detecta dono ativo
- Primeiros dias: Detecta deleção tardia
- 14 dias: Dá tempo suficiente antes de "esquecer"

---

## 🧪 COMO TESTAR

### Teste 1: Aplicar Migrations
```sql
-- Adicionar colunas em Mensagens:
ALTER TABLE "Mensagens"
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS still_exists BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Adicionar coluna em Canais:
ALTER TABLE "Canais do youtube"
ADD COLUMN IF NOT EXISTS comments_deleted_count INTEGER DEFAULT 0;

-- Verificar:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'Mensagens'
  AND column_name IN ('last_verified_at', 'verification_count', 'still_exists', 'deleted_at');
```

**Esperado**: 4 colunas retornadas

---

### Teste 2: Testar Verificação de 1 Comentário
```sql
-- Pegar 1 comentário postado recentemente:
SELECT id, youtube_comment_id, respondido
FROM "Mensagens"
WHERE respondido = TRUE
  AND youtube_comment_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 1;

-- Verificar esse comentário:
SELECT verify_comment_and_apply_penalty(12345); -- usar ID real

-- Resultado esperado:
{
  "message_id": 12345,
  "still_exists": true,
  "hours_old": 5.2,
  "verification_count": 1
}
```

---

### Teste 3: Simular Deleção
```sql
-- 1. Postar comentário de teste no YouTube
-- 2. Salvar ID na tabela
-- 3. DELETAR manualmente no YouTube
-- 4. Rodar verificação:
SELECT verify_comment_and_apply_penalty(12345);

-- Resultado esperado:
{
  "message_id": 12345,
  "still_exists": false,
  "hours_old": 2.5,
  "verification_count": 1
}

-- 5. Verificar que canal foi blacklistado:
SELECT nome, auto_disabled_reason, comments_deleted_count
FROM "Canais do youtube"
WHERE comments_deleted_count > 0;
```

---

### Teste 4: Rodar CRON Manualmente
```sql
SELECT cron_verify_comments();

-- Resultado esperado:
{
  "verified": 8,
  "deleted": 1,
  "timestamp": "2025-01-03T10:30:00Z"
}
```

---

### Teste 5: Verificar Integração com Etapa 1
```sql
-- Canal que teve comentário deletado:
SELECT can_comment_on_channel(123, 77);
-- Esperado: FALSE (blacklisted)

-- Ver detalhes:
SELECT
  nome,
  auto_disabled_reason,
  comments_deleted_count
FROM "Canais do youtube"
WHERE id = 123;
-- Esperado: auto_disabled_reason preenchido
```

---

## ✅ CRITÉRIOS DE SUCESSO

Você pode aprovar a Etapa 2 se:

1. ✅ Migrations aplicadas (colunas criadas)
2. ✅ Função `verify_comment_and_apply_penalty()` criada
3. ✅ Teste manual detecta comentário deletado
4. ✅ Blacklist automático funciona
5. ✅ CRON configurado e rodando
6. ✅ Etapa 1 respeita blacklist da Etapa 2
7. ✅ Sistema completo funcionando fim-a-fim

---

## 🔄 COMO REVERTER (Se Precisar)

1. **Desabilitar CRON**:
   ```sql
   SELECT cron.unschedule('verify-youtube-comments');
   ```

2. **Dropar função**:
   ```sql
   DROP FUNCTION IF EXISTS verify_comment_and_apply_penalty(BIGINT);
   DROP FUNCTION IF EXISTS cron_verify_comments();
   ```

3. **Limpar blacklist** (opcional):
   ```sql
   UPDATE "Canais do youtube"
   SET auto_disabled_reason = NULL,
       comments_deleted_count = 0
   WHERE auto_disabled_reason IS NOT NULL;
   ```

4. **Remover colunas** (opcional, só se quiser limpar tudo):
   ```sql
   ALTER TABLE "Mensagens"
   DROP COLUMN IF EXISTS last_verified_at,
   DROP COLUMN IF EXISTS verification_count,
   DROP COLUMN IF EXISTS still_exists,
   DROP COLUMN IF EXISTS deleted_at;

   ALTER TABLE "Canais do youtube"
   DROP COLUMN IF EXISTS comments_deleted_count;
   ```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

Antes de começar:
- [ ] Etapa 1 funcionando e aprovada
- [ ] `youtube_comment_id` sendo salvo (>90%)
- [ ] Backup do banco

Durante:
- [ ] Aplicar migrations
- [ ] Criar função `verify_comment_and_apply_penalty()`
- [ ] Criar CRON `cron_verify_comments()`
- [ ] Testar verificação manual
- [ ] Testar deleção simulada
- [ ] Configurar CRON no Supabase

Após implementar:
- [ ] Rodar CRON manualmente (sucesso?)
- [ ] Verificar blacklist automático
- [ ] Monitorar por 1 semana
- [ ] Você aprovar → Sistema completo! ✅

---

## 🎬 PRÓXIMO PASSO

**Quando tiver Etapa 1 + 2 funcionando**:
→ Sistema 100% completo ✅
→ Proteção por frequência (manual)
→ Aprendizado automático (blacklist inteligente)
→ Sem bans, sem problemas! 🎉

---

**Arquivos desta etapa** (após implementar):
- `verify_comment_and_apply_penalty.sql`
- `cron_verify_comments.sql`
- `migrations_etapa2.sql`
