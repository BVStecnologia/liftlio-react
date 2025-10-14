# 📁 Triggers

**Responsabilidade**: Triggers automáticos do PostgreSQL para eventos de tabelas
**Sistema**: Infraestrutura (automações reativas)
**Última atualização**: 2025-09-30 - Claude Code (Anthropic)

---

## 🎯 PROPÓSITO

Triggers são **funções automáticas** executadas em resposta a eventos (INSERT, UPDATE, DELETE):
- Automações reativas baseadas em mudanças de dados
- Validações complexas antes de salvar
- Propagação de mudanças entre tabelas
- Logging e auditoria

**IMPORTANTE**: Triggers executam AUTOMATICAMENTE, sem chamada explícita.

---

## 📊 TRIGGERS DISPONÍVEIS

### 🔵 trigger_atualizar_canais_ativos.sql
- **Descrição**: Atualiza flag `ativo` de canais baseado em atividade recente
- **Evento**: AFTER INSERT OR UPDATE ON `"Videos"`
- **Condição**: Quando novo vídeo é adicionado a um canal
- **Ação**:
  - Se canal estava inativo → marca como ativo
  - Atualiza timestamp de última atividade
- **Tabelas afetadas**:
  - `"Canais do youtube"` (UPDATE: ativo = true, ultima_atividade)
- **Função trigger**: `atualizar_canais_ativos()`

**Lógica**:
```sql
IF NEW video inserted AND canal.ativo = false THEN
    UPDATE "Canais do youtube"
    SET ativo = true, ultima_atividade = NOW()
    WHERE id = NEW."Canais";
END IF;
```

---

### 🔵 trigger_postar_comentario_youtube.sql
- **Descrição**: ⚠️ **DESABILITADO** - Postava comentários automaticamente (perigoso!)
- **Evento**: AFTER INSERT OR UPDATE ON `"Mensagens"` (quando habilitado)
- **Condição**: Quando mensagem é marcada como aprovada
- **Ação**:
  - Chamava Edge Function para postar no YouTube
  - **PROBLEMA**: Automação sem controle de agendamento
- **Status**: **DESABILITADO** - Usar sistema de agendamento via CRON
- **Tabelas afetadas**:
  - `"Mensagens"` (não mais)

**Motivo da desabilitação**:
- Falta de controle de rate limiting
- Sem respeito a horários de postagem
- Sem tratamento de erros adequado
- Substituído por: `cron_processar_todas_postagens_pendentes()`

---

### 🔵 testee.sql
- **Descrição**: ⚠️ Arquivo de teste (deve ser removido)
- **Status**: Não é um trigger real, apenas arquivo de teste
- **Ação recomendada**: Mover para `_Archived/` ou deletar

---

## 🔗 FLUXO DE INTERLIGAÇÃO

```
INSERT INTO "Videos" (novo vídeo descoberto)
  ↓
TRIGGER: trigger_atualizar_canais_ativos
  ↓
  IF canal estava inativo:
    └─→ UPDATE "Canais do youtube" SET ativo = true
  ↓
(fim do trigger, resto do processamento continua)

─────────────────────────────────────────────

[DESABILITADO] INSERT INTO "Mensagens" (nova mensagem)
  ↓
[DESABILITADO] TRIGGER: trigger_postar_comentario_youtube
  ↓
[SUBSTITUÍDO POR] CRON: cron_processar_todas_postagens_pendentes()
  └─→ Controle adequado de agendamento
```

---

## 📋 DEPENDÊNCIAS

### Funções externas necessárias:
- `atualizar_canais_ativos()` - Função PL/pgSQL chamada pelo trigger
- Outras funções de validação (se existirem)

### Tabelas do Supabase:
- `"Videos"` - [Trigger ON INSERT/UPDATE]
- `"Canais do youtube"` - [UPDATE via trigger]
- `"Mensagens"` - [Tinha trigger, agora desabilitado]

### Edge Functions:
- Nenhuma (triggers antigos chamavam, mas foram desabilitados)

---

## ⚙️ CONFIGURAÇÕES & VARIÁVEIS

- **Performance**: Triggers devem ser RÁPIDOS (< 100ms)
- **Locking**: Cuidado com deadlocks em triggers que fazem UPDATEs
- **Recursão**: Evitar triggers que disparam outros triggers
- **NEW/OLD**: `NEW` = registro novo, `OLD` = registro antes da mudança

---

## 🚨 REGRAS DE NEGÓCIO

1. **Triggers devem ser idempotentes**: Executar 2x não deve quebrar
2. **Sem operações pesadas**: Triggers bloqueiam a transação
3. **Tratamento de erro**: RAISE EXCEPTION cancela toda transação
4. **Logging mínimo**: Evitar RAISE NOTICE excessivo
5. **Desabilitar quando desnecessário**: Triggers inativos devem ser removidos

---

## 🧪 COMO TESTAR

```sql
-- Teste 1: Verificar triggers ativos
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%youtube%'
ORDER BY trigger_name;

-- Teste 2: Testar trigger de atualização de canal
-- Inserir vídeo em canal inativo e ver se reativa
INSERT INTO "Videos" (
    "VIDEO", "Canais", video_title, created_at
) VALUES (
    'TEST_VIDEO_ID',
    (SELECT id FROM "Canais do youtube" WHERE ativo = false LIMIT 1),
    'Teste de trigger',
    NOW()
);

-- Verificar se canal foi reativado:
SELECT id, "Nome", ativo, ultima_atividade
FROM "Canais do youtube"
WHERE id = [canal_do_teste]
  AND ativo = true;  -- Deve ser true agora

-- Teste 3: Desabilitar trigger temporariamente
ALTER TABLE "Videos" DISABLE TRIGGER trigger_atualizar_canais_ativos;
-- Fazer operações sem trigger
ALTER TABLE "Videos" ENABLE TRIGGER trigger_atualizar_canais_ativos;

-- Teste 4: Ver logs de execução de triggers (se habilitado)
SELECT * FROM pg_stat_user_functions
WHERE funcname LIKE '%canal%'
ORDER BY calls DESC;
```

---

## 🐛 TROUBLESHOOTING

### Trigger não executa
```sql
-- Verificar se está habilitado:
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_atualizar_canais_ativos';

-- 'O' = enabled, 'D' = disabled
```

### Trigger causando lentidão
```sql
-- Adicionar timing log na função do trigger:
CREATE OR REPLACE FUNCTION atualizar_canais_ativos()
RETURNS TRIGGER AS $$
DECLARE
    v_start TIMESTAMP := clock_timestamp();
BEGIN
    -- lógica do trigger

    RAISE NOTICE 'Trigger executado em % ms',
        EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Deadlock em trigger
```sql
-- Solução: Usar LOCK com timeout
SET lock_timeout = '2s';

-- Ou redesenhar para não precisar de locks pesados
```

---

## 📝 CHANGELOG

### 2025-09-30 - Claude Code
- Reorganização inicial: já existia subpasta Triggers/
- Criação deste README.md
- Total de triggers: 1 ativo + 1 desabilitado + 1 arquivo de teste
- Status:
  - ✅ `trigger_atualizar_canais_ativos` - Funcional
  - ❌ `trigger_postar_comentario_youtube` - Desabilitado
  - ⚠️ `testee.sql` - Arquivo de teste para remover

### Recomendações:
1. Mover `testee.sql` para `_Archived/`
2. Remover completamente `trigger_postar_comentario_youtube` do DB
3. Documentar função `atualizar_canais_ativos()` (se não existir doc)

---

## ⚠️ REGRA OBRIGATÓRIA

**SEMPRE que modificar qualquer trigger nesta pasta:**

1. ✅ Atualizar este README.md
2. ✅ Atualizar seção "Última atualização"
3. ✅ Adicionar entrada no CHANGELOG
4. ✅ **TESTAR EM STAGING PRIMEIRO** (triggers são perigosos!)
5. ✅ Documentar performance (timing)
6. ✅ Verificar se não causa deadlocks
7. ✅ Considerar alternativas (CRON, funções explícitas)
8. ✅ Se desabilitar trigger, documentar motivo
