# 📡 STATUS 1 → 2: PROCESSAMENTO DE SCANNERS

**Transição**: STATUS 1 → STATUS 2
**Função Principal**: `process_next_project_scanner()`
**Tempo Médio**: 5-15 minutos
**Intervalo**: 30 segundos entre execuções
**Objetivo**: Buscar novos vídeos de todos os canais do YouTube configurados

---

## 📋 VISÃO GERAL

Nesta etapa, o pipeline processa **um scanner por vez**, buscando vídeos novos dos canais do YouTube. Utiliza **Advisory Locks** para garantir processamento único e sequencial.

---

## 🎯 FUNÇÕES NESTE MÓDULO

### 1. `process_next_project_scanner(project_id integer)`
**Tipo**: Main Function
**Retorno**: void
**Responsabilidade**: Processar próximo scanner pendente

### 2. `update_video_id_cache(scanner_id bigint)`
**Tipo**: Helper Function
**Retorno**: void
**Responsabilidade**: Atualizar cache de IDs de vídeos

### 3. `Retornar-Ids-do-youtube` ⚡ Edge Function
**Tipo**: Edge Function (Deno)
**Servidor**: Python YouTube Search Engine v5 (173.249.22.2:8000)
**Responsabilidade**: Buscar e selecionar vídeos usando Claude AI para análise semântica

---

## 🔄 FLUXO DETALHADO

```
┌──────────────────────────────────────────────────────────────────┐
│                         STATUS 1 → 2                             │
│                                                                   │
│  pg_cron executa a cada 30s:                                     │
│  "SELECT process_next_project_scanner({project_id})"             │
│            │                                                      │
│            ▼                                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  process_next_project_scanner()                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 1. Tenta adquirir Advisory Lock                      │ │ │
│  │  │    pg_try_advisory_lock(project_id)                  │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 2. Busca próximo scanner pendente                    │ │ │
│  │  │    WHERE rodada = 1                                   │ │ │
│  │  │    AND "Projeto_id" = project_id                     │ │ │
│  │  │    ORDER BY id LIMIT 1                               │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 3. Chama Edge Function                               │ │ │
│  │  │    get_youtube_channel_videos(                       │ │ │
│  │  │      channel_id,                                      │ │ │
│  │  │      project_id,                                      │ │ │
│  │  │      scanner_id                                       │ │ │
│  │  │    )                                                  │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 4. Edge Function busca vídeos da API YouTube         │ │ │
│  │  │    • Últimos 50 vídeos do canal                      │ │ │
│  │  │    • Filtra vídeos já existentes                     │ │ │
│  │  │    • INSERT na tabela Videos                         │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 5. Atualiza cache de IDs                             │ │ │
│  │  │    update_video_id_cache(scanner_id)                 │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 6. Marca scanner como processado                     │ │ │
│  │  │    UPDATE rodada = 2                                 │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 7. Verifica se há mais scanners                      │ │ │
│  │  │    IF não há → UPDATE status = '2'                   │ │ │
│  │  │    IF há → continua rodando                          │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │            │                                                │ │
│  │            ▼                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 8. Libera Advisory Lock                              │ │ │
│  │  │    pg_advisory_unlock(project_id)                    │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│            │                                                    │
│            ▼                                                    │
│  ✅ Todos os scanners processados                              │
│  ▶  Transição: STATUS 2                                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 💾 TABELAS AFETADAS

### Tabela: `Scanner de videos do youtube`
**Operação**: SELECT + UPDATE
**Campos Lidos**:
- `id`, `"ID_CANAL"`, `"Projeto_id"`, `rodada`

**Campos Alterados**:
- `rodada` = 2 (quando processado)

### Tabela: `Videos`
**Operação**: INSERT
**Campos Preenchidos** (via Edge Function):
- `VIDEO` (ID do YouTube)
- `scanner_id`
- `titulo`
- `descricao`
- `published_at`
- `thumbnail_url`
- Outros metadados do YouTube

### Tabela: `Projeto`
**Operação**: UPDATE
**Campos Alterados**:
- `status` = '2' (quando todos scanners processados)

---

## 🧠 LÓGICA PRINCIPAL

### Função: `process_next_project_scanner()`

```sql
CREATE OR REPLACE FUNCTION process_next_project_scanner(project_id integer)
RETURNS void AS $$
DECLARE
    v_scanner_id BIGINT;
    v_channel_id TEXT;
    lock_acquired BOOLEAN;
BEGIN
    -- 1. Tenta adquirir lock
    SELECT pg_try_advisory_lock(project_id) INTO lock_acquired;

    IF NOT lock_acquired THEN
        RETURN; -- Já está rodando em outra instância
    END IF;

    -- 2. Busca próximo scanner pendente
    SELECT id, "ID_CANAL"
    INTO v_scanner_id, v_channel_id
    FROM "Scanner de videos do youtube"
    WHERE "Projeto_id" = project_id
    AND rodada = 1
    ORDER BY id
    LIMIT 1;

    -- 3. Se não há scanner, avança para próximo status
    IF v_scanner_id IS NULL THEN
        UPDATE "Projeto" SET status = '2' WHERE id = project_id;
        PERFORM pg_advisory_unlock(project_id);
        RETURN;
    END IF;

    -- 4. Chama Edge Function para buscar vídeos
    PERFORM net.http_post(
        url := 'https://[project-ref].supabase.co/functions/v1/get-youtube-channel-videos',
        body := jsonb_build_object(
            'channelId', v_channel_id,
            'projectId', project_id,
            'scannerId', v_scanner_id
        )
    );

    -- 5. Atualiza cache
    PERFORM update_video_id_cache(v_scanner_id);

    -- 6. Marca como processado
    UPDATE "Scanner de videos do youtube"
    SET rodada = 2
    WHERE id = v_scanner_id;

    -- 7. Libera lock
    PERFORM pg_advisory_unlock(project_id);
END;
$$ LANGUAGE plpgsql;
```

---

## 🛡️ PROTEÇÕES IMPLEMENTADAS

### 1. Advisory Locks
```sql
SELECT pg_try_advisory_lock(project_id)
```
**Objetivo**: Impedir processamento simultâneo do mesmo projeto
**Benefício**: Evita duplicação de vídeos e race conditions

### 2. Processamento Sequencial
```sql
ORDER BY id LIMIT 1
```
**Objetivo**: Processar um scanner por vez
**Benefício**: Controle de rate limiting da API YouTube

### 3. Auto-transição de Status
```sql
IF v_scanner_id IS NULL THEN
    UPDATE "Projeto" SET status = '2'
END IF;
```
**Objetivo**: Avançar automaticamente quando não há mais trabalho
**Benefício**: Pipeline autônomo, sem intervenção manual

### 4. Idempotência
- Scanners já processados (rodada=2) são ignorados
- Vídeos duplicados não são inseridos (constraint única)

---

## 📊 MÉTRICAS ESPERADAS

| Métrica | Valor Típico |
|---------|--------------|
| Tempo por Scanner | 30-60 segundos |
| Vídeos Encontrados | 10-50 por canal |
| Taxa de Sucesso | > 95% |
| API Rate Limit | 10,000 units/dia (YouTube) |
| Intervalo entre Scanners | 30 segundos |

---

## 🔍 TROUBLESHOOTING

### Problema: Pipeline travado no STATUS 1
**Sintomas**:
- Status permanece em '1' por mais de 1 hora
- Alguns scanners permanecem com rodada=1

**Diagnóstico**:
```sql
-- Ver scanners pendentes
SELECT id, "NOME_CANAL", rodada
FROM "Scanner de videos do youtube"
WHERE "Projeto_id" = {project_id}
AND rodada = 1;

-- Ver se há lock ativo
SELECT * FROM pg_locks
WHERE locktype = 'advisory'
AND objid = {project_id};

-- Ver últimas execuções
SELECT * FROM cron.job_run_details
WHERE command LIKE '%process_next_project_scanner%'
ORDER BY start_time DESC
LIMIT 5;
```

**Soluções**:
1. **Lock não liberado**:
```sql
SELECT pg_advisory_unlock_all();
```

2. **Scanner com erro**:
```sql
-- Marcar como processado manualmente
UPDATE "Scanner de videos do youtube"
SET rodada = 2
WHERE id = {scanner_id};

-- Ou pular e processar próximo
SELECT process_next_project_scanner({project_id});
```

3. **API YouTube com erro**:
```sql
-- Ver logs da Edge Function
SELECT * FROM edge_logs
WHERE function_name = 'get-youtube-channel-videos'
ORDER BY timestamp DESC
LIMIT 20;
```

### Problema: Vídeos não sendo inseridos
**Sintomas**:
- Scanner marcado como processado (rodada=2)
- Mas nenhum vídeo novo na tabela `Videos`

**Diagnóstico**:
```sql
-- Contar vídeos do scanner
SELECT COUNT(*)
FROM "Videos"
WHERE scanner_id = {scanner_id};

-- Ver resposta da API
SELECT * FROM edge_logs
WHERE function_name = 'get-youtube-channel-videos'
AND request_body->>'scannerId' = '{scanner_id}'
ORDER BY timestamp DESC
LIMIT 1;
```

**Possíveis Causas**:
1. Canal não tem vídeos públicos
2. API YouTube retornou erro 403/401
3. Quota da API excedida
4. Canal ID inválido

### Problema: Scanner processado múltiplas vezes
**Sintomas**:
- Vídeos duplicados na tabela `Videos`
- Scanner com rodada=2 mas processado novamente

**Diagnóstico**:
```sql
-- Ver vídeos duplicados
SELECT "VIDEO", COUNT(*)
FROM "Videos"
WHERE scanner_id = {scanner_id}
GROUP BY "VIDEO"
HAVING COUNT(*) > 1;
```

**Solução**:
```sql
-- Remover duplicatas (manter o mais antigo)
DELETE FROM "Videos" a
USING "Videos" b
WHERE a.id > b.id
AND a."VIDEO" = b."VIDEO"
AND a.scanner_id = {scanner_id};

-- Verificar constraint única
ALTER TABLE "Videos"
ADD CONSTRAINT unique_video_id UNIQUE ("VIDEO");
```

---

## 📊 QUERIES DE MONITORAMENTO

### Ver progresso dos scanners
```sql
SELECT
    COUNT(*) FILTER (WHERE rodada = 1) as pendentes,
    COUNT(*) FILTER (WHERE rodada = 2) as processados,
    COUNT(*) as total
FROM "Scanner de videos do youtube"
WHERE "Projeto_id" = {project_id};
```

### Ver vídeos inseridos por scanner
```sql
SELECT
    s."NOME_CANAL",
    COUNT(v.id) as videos_encontrados
FROM "Scanner de videos do youtube" s
LEFT JOIN "Videos" v ON v.scanner_id = s.id
WHERE s."Projeto_id" = {project_id}
GROUP BY s.id, s."NOME_CANAL"
ORDER BY videos_encontrados DESC;
```

### Ver tempo médio por scanner
```sql
SELECT
    AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as tempo_medio_segundos
FROM cron.job_run_details
WHERE command LIKE '%process_next_project_scanner(' || {project_id} || ')%'
AND status = 'succeeded';
```

---

## 🎯 MAPA MENTAL

```
                    ┌─────────────────────┐
                    │   STATUS 1          │
                    │   (Scanners ativos) │
                    └──────────┬──────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │ process_next_project_scanner() │
              └────────────────┬───────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
    ┌──────────┐         ┌──────────┐        ┌──────────┐
    │Scanner 1 │         │Scanner 2 │        │Scanner 3 │
    │rodada=1  │ ──30s──→│rodada=1  │ ──30s─→│rodada=1  │
    └────┬─────┘         └────┬─────┘        └────┬─────┘
         │                    │                    │
         ▼                    ▼                    ▼
    ┌──────────┐         ┌──────────┐        ┌──────────┐
    │ YouTube  │         │ YouTube  │        │ YouTube  │
    │   API    │         │   API    │        │   API    │
    └────┬─────┘         └────┬─────┘        └────┬─────┘
         │                    │                    │
         ▼                    ▼                    ▼
    ┌──────────┐         ┌──────────┐        ┌──────────┐
    │ Videos   │         │ Videos   │        │ Videos   │
    │ (10-50)  │         │ (10-50)  │        │ (10-50)  │
    └────┬─────┘         └────┬─────┘        └────┬─────┘
         │                    │                    │
         ▼                    ▼                    ▼
    ┌──────────┐         ┌──────────┐        ┌──────────┐
    │rodada=2  │         │rodada=2  │        │rodada=2  │
    └──────────┘         └──────────┘        └──────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  Todos processados  │
                    │  UPDATE status='2'  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   STATUS 2          │
                    │   (Stats & Comments)│
                    └─────────────────────┘
```

---

## 📁 ARQUIVOS RELACIONADOS

### SQL Functions (Numeradas por Ordem de Execução)
- `01_process_next_project_scanner.sql` - Função MÃE (processa scanner)
- `02_update_video_id_cache.sql` - Atualiza cache de IDs

### Edge Functions
- `03_Edge_Function_Retornar-Ids-do-youtube.ts` - Busca vídeos via Python + Claude

### Conexões
- **Disparado Por**: Trigger quando status='1'
- **Dispara**: `update_video_stats()` no STATUS 2

---

## ✅ CHECKLIST DE SUCESSO

Para considerar STATUS 1→2 bem-sucedido:

- [ ] Todos os scanners têm `rodada = 2`
- [ ] Vídeos novos foram inseridos na tabela `Videos`
- [ ] Nenhum scanner ficou travado
- [ ] Status do projeto mudou para '2'
- [ ] Nenhum lock órfão no `pg_locks`
- [ ] Próximo job agendado para STATUS 2

---

**Última Atualização**: 2025-01-30
**Versão**: 1.0