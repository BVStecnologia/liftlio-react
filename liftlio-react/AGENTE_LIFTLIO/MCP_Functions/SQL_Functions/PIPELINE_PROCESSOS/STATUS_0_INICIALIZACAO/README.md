# 🚀 STATUS 0 → 1: INICIALIZAÇÃO

**Transição**: STATUS 0 → STATUS 1
**Função Principal**: `atualizar_scanner_rodada()`
**Tempo Médio**: < 1 segundo
**Objetivo**: Preparar scanners para iniciar nova rodada de processamento

---

## 📋 VISÃO GERAL

Esta é a primeira etapa do pipeline. Seu objetivo é **resetar o estado dos scanners** para uma nova rodada de busca de vídeos, marcando todos os scanners ativos do projeto com `rodada = 1`.

---

## 🎯 FUNÇÕES NESTE MÓDULO

### 1. `atualizar_scanner_rodada(project_id integer)`
**Tipo**: Main Function
**Retorno**: void
**Responsabilidade**: Marcar scanners ativos com rodada=1

---

## 🔄 FLUXO DETALHADO

```
┌─────────────────────────────────────────────────────────────┐
│                       STATUS 0 → 1                          │
│                                                              │
│  Trigger detecta: status = '0'                              │
│            │                                                 │
│            ▼                                                 │
│  pg_cron agenda:                                            │
│  "SELECT atualizar_scanner_rodada({project_id})"            │
│            │                                                 │
│            ▼                                                 │
│  ┌──────────────────────────────────────────────┐          │
│  │  atualizar_scanner_rodada()                  │          │
│  │  ┌────────────────────────────────────────┐ │          │
│  │  │ 1. Busca scanners ativos do projeto   │ │          │
│  │  │    WHERE "Projeto_id" = project_id     │ │          │
│  │  │    AND ativo = true                    │ │          │
│  │  └────────────────────────────────────────┘ │          │
│  │            │                                  │          │
│  │            ▼                                  │          │
│  │  ┌────────────────────────────────────────┐ │          │
│  │  │ 2. UPDATE rodada = 1                   │ │          │
│  │  │    Em todos os scanners encontrados    │ │          │
│  │  └────────────────────────────────────────┘ │          │
│  │            │                                  │          │
│  │            ▼                                  │          │
│  │  ┌────────────────────────────────────────┐ │          │
│  │  │ 3. UPDATE status = '1'                 │ │          │
│  │  │    No Projeto                          │ │          │
│  │  └────────────────────────────────────────┘ │          │
│  └──────────────────────────────────────────────┘          │
│            │                                                 │
│            ▼                                                 │
│  ✅ Transição completa: STATUS 1                            │
│  ▶  Próxima etapa: process_next_project_scanner()          │
└─────────────────────────────────────────────────────────────┘
```

---

## 💾 TABELAS AFETADAS

### Tabela: `Scanner de videos do youtube`
**Operação**: UPDATE
**Campos Alterados**:
- `rodada` = 1

**Condições**:
- `"Projeto_id"` = project_id
- `ativo` = true

### Tabela: `Projeto`
**Operação**: UPDATE
**Campos Alterados**:
- `status` = '1'

**Condições**:
- `id` = project_id

---

## 🧠 LÓGICA DA FUNÇÃO

```sql
CREATE OR REPLACE FUNCTION atualizar_scanner_rodada(project_id integer)
RETURNS void AS $$
BEGIN
    -- Passo 1: Atualiza rodada dos scanners ativos
    UPDATE "Scanner de videos do youtube"
    SET rodada = 1
    WHERE "Projeto_id" = project_id
    AND ativo = true;

    -- Passo 2: Avança para próximo status
    UPDATE "Projeto"
    SET status = '1'
    WHERE id = project_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 MÉTRICAS ESPERADAS

| Métrica | Valor Típico |
|---------|--------------|
| Tempo de Execução | < 1 segundo |
| Scanners Atualizados | 1-10 scanners |
| Taxa de Sucesso | 100% |
| CPU Usage | Mínimo |
| I/O | Baixo (apenas UPDATEs) |

---

## 🎯 CASOS DE USO

### Caso 1: Projeto com 3 Scanners Ativos
**Input**: project_id = 123
**Scanners no DB**:
- Scanner A (ativo=true, rodada=0)
- Scanner B (ativo=true, rodada=0)
- Scanner C (ativo=false, rodada=0)

**Resultado**:
- Scanner A: rodada=1 ✅
- Scanner B: rodada=1 ✅
- Scanner C: rodada=0 (não modificado, pois ativo=false)
- Projeto 123: status='1' ✅

### Caso 2: Projeto sem Scanners Ativos
**Input**: project_id = 456
**Scanners no DB**: Nenhum com ativo=true

**Resultado**:
- Nenhum scanner atualizado
- Projeto 456: status='1' ✅
- Pipeline avança, mas STATUS 1 não encontrará scanners para processar

---

## 🛡️ PROTEÇÕES IMPLEMENTADAS

### 1. Apenas Scanners Ativos
```sql
WHERE ativo = true
```
Garante que scanners desativados não sejam processados.

### 2. Isolamento por Projeto
```sql
WHERE "Projeto_id" = project_id
```
Impede que scanners de outros projetos sejam afetados.

### 3. Idempotência
Executar múltiplas vezes com mesmo `project_id` não causa problemas:
- Rodada sempre será 1
- Status sempre será '1'

---

## 🔍 TROUBLESHOOTING

### Problema: Pipeline não avança de STATUS 0 para 1
**Sintomas**:
- Status permanece em '0'
- Scanners não têm rodada=1

**Diagnóstico**:
```sql
-- Verificar se função foi executada
SELECT * FROM cron.job_run_details
WHERE command LIKE '%atualizar_scanner_rodada%'
ORDER BY start_time DESC
LIMIT 5;

-- Verificar status atual do projeto
SELECT status FROM "Projeto" WHERE id = {project_id};

-- Verificar scanners do projeto
SELECT id, ativo, rodada FROM "Scanner de videos do youtube"
WHERE "Projeto_id" = {project_id};
```

**Soluções**:
1. Executar manualmente: `SELECT atualizar_scanner_rodada({project_id});`
2. Verificar se pg_cron está rodando: `SELECT * FROM cron.job;`
3. Verificar logs de erro: `SELECT * FROM cron.job_run_details WHERE status = 'failed';`

### Problema: Scanners não são marcados com rodada=1
**Sintomas**:
- Status muda para '1'
- Mas scanners permanecem com rodada=0

**Diagnóstico**:
```sql
-- Verificar scanners ativos
SELECT * FROM "Scanner de videos do youtube"
WHERE "Projeto_id" = {project_id};
```

**Possível Causa**: Todos os scanners estão com `ativo = false`

**Solução**:
```sql
-- Ativar pelo menos um scanner
UPDATE "Scanner de videos do youtube"
SET ativo = true
WHERE "Projeto_id" = {project_id}
AND id = {scanner_id};

-- Executar novamente
SELECT atualizar_scanner_rodada({project_id});
```

---

## 📊 QUERIES DE MONITORAMENTO

### Ver estado dos scanners do projeto
```sql
SELECT
    id,
    "NOME_CANAL",
    ativo,
    rodada,
    "Projeto_id"
FROM "Scanner de videos do youtube"
WHERE "Projeto_id" = {project_id}
ORDER BY ativo DESC, id;
```

### Ver quantos scanners foram atualizados
```sql
SELECT
    COUNT(*) as total_scanners,
    COUNT(*) FILTER (WHERE ativo = true) as scanners_ativos,
    COUNT(*) FILTER (WHERE rodada = 1) as scanners_com_rodada_1
FROM "Scanner de videos do youtube"
WHERE "Projeto_id" = {project_id};
```

### Ver histórico de execução da função
```sql
SELECT
    start_time,
    end_time,
    status,
    return_message
FROM cron.job_run_details
WHERE command LIKE '%atualizar_scanner_rodada(' || {project_id} || ')%'
ORDER BY start_time DESC
LIMIT 10;
```

---

## 🎯 MAPA MENTAL

```
                    ┌─────────────────────┐
                    │   STATUS 0          │
                    │   (Projeto criado)  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ atualizar_scanner_  │
                    │     rodada()        │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
          ┌─────────┐    ┌─────────┐    ┌─────────┐
          │Scanner A│    │Scanner B│    │Scanner C│
          │rodada=1 │    │rodada=1 │    │ativo=❌ │
          └─────────┘    └─────────┘    └─────────┘
                │              │              │
                └──────────────┼──────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  UPDATE Projeto     │
                    │  SET status = '1'   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   STATUS 1          │
                    │   (Inicia scanners) │
                    └─────────────────────┘
```

---

## 📁 ARQUIVOS RELACIONADOS

- **SQL**: `atualizar_scanner_rodada.sql`
- **Disparado Por**: Trigger `schedule_process_project()` quando status='0'
- **Dispara**: `process_next_project_scanner()` no STATUS 1

---

## ✅ CHECKLIST DE SUCESSO

Para considerar STATUS 0→1 bem-sucedido:

- [ ] Função `atualizar_scanner_rodada()` foi executada
- [ ] Todos os scanners ativos têm `rodada = 1`
- [ ] Status do projeto mudou para '1'
- [ ] Nenhum erro no `cron.job_run_details`
- [ ] Próximo job agendado para STATUS 1

---

**Última Atualização**: 2025-01-30
**Versão**: 1.0