# 🎯 ARQUITETURA COMPLETA DO SISTEMA DE SCANNING DE VÍDEOS DO YOUTUBE

**Data de Análise:** 24/10/2025
**Status:** Documentação detalhada do sistema atual

---

## 📋 ÍNDICE
1. [Visão Geral do Sistema](#visão-geral-do-sistema)
2. [Fluxo de Descoberta de Vídeos Novos](#fluxo-de-descoberta-de-vídeos-novos)
3. [Influência do Campo Postagem_dia](#influência-do-campo-postagem_dia)
4. [Componentes Principais](#componentes-principais)
5. [Análise do Problema Atual](#análise-do-problema-atual)
6. [Solução Proposta](#solução-proposta)

---

## 🔍 VISÃO GERAL DO SISTEMA

### Existem 2 Sistemas de Scanning INDEPENDENTES:

#### 1️⃣ **Sistema de Canais do Youtube** (Discovery de Novos Vídeos)
- **Propósito:** Monitorar canais do YouTube e descobrir vídeos novos
- **Campo de armazenamento:** `videos_para_scann` na tabela `Canais do youtube`
- **Frequência:** A cada 45 minutos (cron job)
- **Função SQL:** `verificar_novos_videos_youtube()`
- **NÃO USA** `Postagem_dia` para determinar quantidade de vídeos

#### 2️⃣ **Sistema de Scanner de Keywords** (Sistema Legado - NÃO USADO)
- **Propósito:** Buscar vídeos por palavras-chave
- **Tabela:** `Scanner de videos do youtube`
- **Status:** **DESATIVADO/LEGADO** - Não está em uso ativo no sistema atual
- **Campo:** `ID cache videos`

---

## 🎬 FLUXO DE DESCOBERTA DE VÍDEOS NOVOS (Sistema Atual)

### 1. **Cron Job Principal**
```sql
-- Roda a cada 45 minutos
SELECT public.verificar_novos_videos_youtube()
```

### 2. **Função: verificar_novos_videos_youtube()**

**Localização:** SQL Function (PostgreSQL)
**Parâmetros:**
- `lote_tamanho INTEGER DEFAULT 50` (quantos canais processar por vez)

**Lógica:**

```sql
-- Seleciona canais para verificar
FOR canal_record IN
    SELECT c.id, c.channel_id, c.videos_scanreados_2, c.videos_para_scann, p.id as projeto_id
    FROM "Canais do youtube" c
    JOIN "Projeto" p ON c."Projeto" = p.id
    WHERE p."Youtube Active" = true
      AND c.is_active = true
      AND c.desativado_pelo_user = false
      AND (c.last_canal_check IS NULL OR c.last_canal_check < NOW() - INTERVAL '30 minutes')
    ORDER BY c.last_canal_check NULLS FIRST
    LIMIT lote_tamanho  -- ⚠️ NOTA: Não usa Postagem_dia aqui!
LOOP
    -- 1. Verifica se customer tem Mentions
    SELECT COALESCE(c."Mentions", 0) INTO v_mentions_disponiveis
    FROM customers c
    JOIN "Projeto" p ON p."User id" = c.user_id
    WHERE p.id = canal_record.projeto_id;

    IF v_mentions_disponiveis IS NULL OR v_mentions_disponiveis <= 0 THEN
        RAISE NOTICE 'Canal ID % pulado - sem Mentions', canal_record.id;
        CONTINUE; -- Pula este canal
    END IF;

    -- 2. Verifica Anti-Spam
    IF NOT can_comment_on_channel(canal_record.channel_id, canal_record.projeto_id) THEN
        RAISE NOTICE 'Canal ID % pulado - Anti-Spam', canal_record.id;
        CONTINUE;
    END IF;

    -- 3. Chama função de monitoramento para buscar vídeos novos
    SELECT monitormanto_de_canal_sql(
        canal_record.channel_id,
        'today',        -- ⚠️ Filtro de tempo: 'today' ou 'week'
        10,             -- ⚠️ max_results: Sempre 10 vídeos por canal
        TRUE            -- simple_response: Retorna apenas IDs
    ) INTO video_ids_result;

    -- 4. Filtra vídeos que já foram processados
    videos_scanreados_check := ',' || COALESCE(canal_record.videos_scanreados_2, '') || ',';

    videos_novos_array := '{}';
    FOREACH video_id IN ARRAY video_ids_array
    LOOP
        -- Se vídeo NÃO está em videos_scanreados_2, adiciona à fila
        IF position(',' || video_id || ',' in videos_scanreados_check) = 0 THEN
            videos_novos_array := array_append(videos_novos_array, video_id);
        END IF;
    END LOOP;

    -- 5. Salva vídeos novos (sem duplicatas)
    IF array_length(videos_novos_array, 1) > 0 THEN
        -- Combina vídeos existentes em videos_para_scann com os novos
        v_all_ids := array_cat(v_existing_ids, videos_novos_array);

        -- Remove duplicatas
        SELECT array_agg(DISTINCT vid ORDER BY vid)
        INTO v_unique_ids
        FROM unnest(v_all_ids) AS vid
        WHERE length(trim(vid)) > 0;

        UPDATE "Canais do youtube"
        SET
            videos_scanreados_2 = CASE
                WHEN videos_scanreados_2 IS NULL OR videos_scanreados_2 = ''
                THEN array_to_string(v_unique_ids, ',')
                ELSE videos_scanreados_2 || ',' || array_to_string(v_unique_ids, ',')
            END,
            videos_para_scann = array_to_string(v_unique_ids, ',')  -- ⭐ CAMPO CRÍTICO
        WHERE id = canal_record.id;
    END IF;
END LOOP;
```

### 3. **Função: monitormanto_de_canal_sql()**

**Localização:** SQL Function (PostgreSQL)
**Parâmetros:**
- `channel_id TEXT` - ID do canal do YouTube
- `time_filter TEXT` - 'today' ou 'week'
- `max_results INTEGER` - Quantos vídeos buscar (padrão: 10)
- `simple_response BOOLEAN` - Se TRUE, retorna apenas IDs

**Lógica:**

```sql
-- 1. Busca informações do canal para obter playlist de uploads
SELECT * FROM http((
    'GET',
    'https://www.googleapis.com/youtube/v3/channels?id={channel_id}&part=contentDetails&key={api_key}',
    ...
)) INTO http_response;

-- Extrai uploads_playlist_id
uploads_playlist_id := channel_response->'items'->0->'contentDetails'->'relatedPlaylists'->>'uploads';

-- 2. Busca vídeos da playlist de uploads (limitado por max_results)
SELECT * FROM http((
    'GET',
    'https://www.googleapis.com/youtube/v3/playlistItems?playlistId={uploads_playlist_id}&part=snippet,contentDetails&maxResults={max_results}&key={api_key}',
    ...
)) INTO http_response;

-- 3. Filtra vídeos por data
IF time_filter = 'today' THEN
    min_date := date_trunc('day', NOW());  -- Apenas hoje
ELSIF time_filter = 'week' THEN
    min_date := NOW() - INTERVAL '7 days';  -- Últimos 7 dias
END IF;

-- 4. Retorna apenas IDs dos vídeos filtrados
RETURN to_jsonb(video_ids);  -- Exemplo: ["id1", "id2", "id3"]
```

---

## 📊 INFLUÊNCIA DO CAMPO `Postagem_dia`

### ❌ **NÃO INFLUENCIA** o Scanning Inicial

O campo `Postagem_dia` da tabela `Projeto`:
- **NÃO** controla quantos vídeos são descobertos
- **NÃO** limita o campo `videos_para_scann`
- **NÃO** afeta a função `verificar_novos_videos_youtube()`

### ✅ **INFLUENCIA** Apenas o Agendamento de Mensagens

O campo `Postagem_dia` é usado **APENAS** em:

#### Função: `agendar_postagens_diarias(projeto_id_param bigint)`

```sql
-- Busca quantas postagens por dia
SELECT
    COALESCE(NULLIF("Postagem_dia", ''), '3')::integer
INTO posts_por_dia
FROM "Projeto"
WHERE id = projeto_id_param;

-- Cria ESSA quantidade de posts por dia
FOR i IN 1..posts_por_dia LOOP
    -- Seleciona mensagens disponíveis
    -- Cria agendamentos em "Settings messages posts"
END LOOP;
```

**Exemplo:**
- **Projeto 117:** `Postagem_dia = "7"`
- **Resultado:** Sistema agenda 7 mensagens por dia
- **MAS:** O campo `videos_para_scann` pode ter 10, 50, 100+ vídeos!

---

## 🧩 COMPONENTES PRINCIPAIS

### 1. **Tabela: Canais do youtube**

```sql
CREATE TABLE "Canais do youtube" (
    id BIGSERIAL PRIMARY KEY,
    channel_id TEXT,                    -- ID do canal no YouTube
    "Projeto" BIGINT,                   -- FK para Projeto
    is_active BOOLEAN DEFAULT true,
    desativado_pelo_user BOOLEAN DEFAULT false,
    last_canal_check TIMESTAMPTZ,       -- Última verificação

    -- ⭐ CAMPOS CRÍTICOS:
    videos_scanreados_2 TEXT,           -- Histórico de TODOS vídeos já processados (CSV)
    videos_para_scann TEXT,             -- ⚠️ Fila de vídeos PENDENTES (CSV)
    "processar" TEXT                    -- Vídeos em processamento (CSV)
);
```

**Exemplo de Dados:**
```
Canal ID: 123
videos_scanreados_2: "id1,id2,id3,id4,id5,id6,id7,id8,id9,id10,id11,id12"
videos_para_scann: "id11,id12"  ← Apenas os 2 últimos ainda não processados
```

### 2. **Tabela: Projeto**

```sql
CREATE TABLE "Projeto" (
    id BIGSERIAL PRIMARY KEY,
    "Project name" TEXT,
    "Postagem_dia" TEXT DEFAULT '3',   -- ⚠️ Usado APENAS para agendamento
    "Youtube Active" BOOLEAN,
    status TEXT,
    "User id" TEXT                     -- FK para customers
);
```

### 3. **Tabela: customers**

```sql
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT,
    email TEXT,
    "Mentions" INTEGER DEFAULT 0       -- ⚠️ Créditos disponíveis
);
```

**Validação de Mentions:**
```sql
-- ANTES de processar canal, verifica se customer tem créditos
SELECT COALESCE(c."Mentions", 0)
FROM customers c
JOIN "Projeto" p ON p."User id" = c.user_id
WHERE p.id = projeto_id;

IF v_mentions_disponiveis <= 0 THEN
    CONTINUE; -- Pula canal
END IF;
```

### 4. **Cron Jobs Ativos**

```sql
-- 1. Discovery de Vídeos Novos (a cada 45 min)
jobid: 71029
jobname: "Monitormanto de Novos Videos Do canal"
schedule: "*/45 * * * *"
command: SELECT public.verificar_novos_videos_youtube()

-- 2. Processamento da Fila (a cada 5 min)
jobid: 158977
jobname: "Processar videos recetes de canais"
schedule: "*/5 * * * *"
command: SELECT public.processar_fila_videos()

-- 3. Análise de Vídeos (a cada 5 min)
jobid: 71038
jobname: "Analiza video vindo do monitoramento e cria mensagem"
schedule: "*/5 * * * *"
command: SELECT public.process_monitored_videos()
```

---

## 🚨 ANÁLISE DO PROBLEMA ATUAL

### Projeto 117 (Liftlio -)

**Status Atual:**
```
"Postagem_dia": "7"
"Youtube Active": true
status: "6"
```

**Problema Identificado:**

1. **Scanning está funcionando corretamente:**
   - ✅ `verificar_novos_videos_youtube()` roda a cada 45 min
   - ✅ Busca 10 vídeos por canal com `monitormanto_de_canal_sql()`
   - ✅ Salva em `videos_para_scann`

2. **MAS `videos_para_scann` está sempre vazio porque:**

   **Hipótese 1:** Processamento muito rápido
   - Cron `processar_fila_videos()` roda a cada 5 min
   - Se processar mais rápido que o discovery, campo fica vazio

   **Hipótese 2:** Vídeos já foram todos processados
   - `videos_scanreados_2` tem histórico completo
   - Vídeos novos só aparecem se canal postar vídeo novo

   **Hipótese 3:** Filtro de tempo muito restritivo
   - `time_filter = 'today'` busca apenas vídeos de HOJE
   - Se canal não postou hoje, retorna vazio

3. **`Postagem_dia = "7"` não ajuda:**
   - Sistema agenda 7 mensagens/dia
   - MAS se não tem vídeos em `videos_para_scann`, não há o que agendar

---

## ✅ SOLUÇÃO PROPOSTA

### **Opção 1: Aumentar Janela de Tempo de Discovery**

**Objetivo:** Buscar vídeos dos últimos 7 dias em vez de apenas hoje

**Modificação:**
```sql
-- Em verificar_novos_videos_youtube()
-- ATUAL:
SELECT monitormanto_de_canal_sql(
    canal_record.channel_id,
    'today',        -- ❌ Muito restritivo
    10,
    TRUE
) INTO video_ids_result;

-- PROPOSTO:
SELECT monitormanto_de_canal_sql(
    canal_record.channel_id,
    'week',         -- ✅ Últimos 7 dias
    10,
    TRUE
) INTO video_ids_result;
```

**Impacto:**
- ✅ Mais vídeos disponíveis para processar
- ✅ Mantém fila `videos_para_scann` sempre com conteúdo
- ⚠️ Pode aumentar carga de processamento inicial

---

### **Opção 2: Aumentar Quantidade de Vídeos por Canal**

**Objetivo:** Buscar 50 vídeos em vez de 10

**Modificação:**
```sql
-- ATUAL:
SELECT monitormanto_de_canal_sql(
    canal_record.channel_id,
    'today',
    10,             -- ❌ Apenas 10 vídeos
    TRUE
) INTO video_ids_result;

-- PROPOSTO:
SELECT monitormanto_de_canal_sql(
    canal_record.channel_id,
    'week',         -- ✅ Janela de 7 dias
    50,             -- ✅ 50 vídeos
    TRUE
) INTO video_ids_result;
```

**Impacto:**
- ✅ Muito mais vídeos na fila
- ✅ Sistema nunca fica sem vídeos para processar
- ⚠️ Mais consumo de API do YouTube
- ⚠️ Mais processamento de mensagens

---

### **Opção 3: Criar Nova Função com Parâmetro Dinâmico** ⭐ **RECOMENDADO**

**Objetivo:** Usar `Postagem_dia` para calcular quantos vídeos buscar

**Nova Função:**
```sql
CREATE OR REPLACE FUNCTION verificar_novos_videos_youtube_v2(
    lote_tamanho INTEGER DEFAULT 50
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    canal_record RECORD;
    v_postagens_dia INTEGER;
    v_max_videos INTEGER;
BEGIN
    FOR canal_record IN
        SELECT
            c.id,
            c.channel_id,
            c.videos_scanreados_2,
            c.videos_para_scann,
            p.id as projeto_id,
            COALESCE(NULLIF(p."Postagem_dia", ''), '3')::integer as postagens_dia
        FROM "Canais do youtube" c
        JOIN "Projeto" p ON c."Projeto" = p.id
        WHERE p."Youtube Active" = true
          AND c.is_active = true
          AND c.desativado_pelo_user = false
    LOOP
        -- Calcular quantidade de vídeos a buscar
        -- Fórmula: postagens_dia * 7 (uma semana de conteúdo)
        v_max_videos := canal_record.postagens_dia * 7;

        -- Mínimo 10, máximo 50
        v_max_videos := GREATEST(10, LEAST(50, v_max_videos));

        RAISE NOTICE 'Canal %: Postagens/dia=%, Buscando % vídeos',
            canal_record.id, canal_record.postagens_dia, v_max_videos;

        -- Buscar vídeos
        SELECT monitormanto_de_canal_sql(
            canal_record.channel_id,
            'week',         -- Última semana
            v_max_videos,   -- ⭐ Dinâmico baseado em Postagem_dia
            TRUE
        ) INTO video_ids_result;

        -- Processar como antes...
    END LOOP;
END;
$$;
```

**Exemplo:**
- `Postagem_dia = "7"` → Busca 49 vídeos (7 * 7)
- `Postagem_dia = "3"` → Busca 21 vídeos (3 * 7)
- `Postagem_dia = "10"` → Busca 50 vídeos (limite máximo)

**Impacto:**
- ✅ Proporcional às necessidades do projeto
- ✅ Economia de recursos para projetos pequenos
- ✅ Mais vídeos para projetos grandes
- ✅ Usa `Postagem_dia` de forma útil

---

## 🎯 RECOMENDAÇÃO FINAL

### **Implementar Opção 3 (Função Dinâmica)**

**Motivos:**
1. **Eficiência:** Cada projeto busca apenas o necessário
2. **Escalabilidade:** Sistema se adapta ao crescimento
3. **Economia:** Projetos pequenos não consomem recursos desnecessários
4. **Lógica:** `Postagem_dia` passa a ter significado real no scanning

**Implementação:**
```sql
-- 1. Criar função v2
CREATE OR REPLACE FUNCTION verificar_novos_videos_youtube_v2(...);

-- 2. Atualizar cron job
UPDATE cron.job
SET command = 'SELECT public.verificar_novos_videos_youtube_v2()'
WHERE jobid = 71029;

-- 3. Testar com projeto 117
SELECT verificar_novos_videos_youtube_v2();

-- 4. Verificar campo videos_para_scann
SELECT id, channel_id, videos_para_scann
FROM "Canais do youtube"
WHERE "Projeto" = 117;
```

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Criar função `verificar_novos_videos_youtube_v2()`
- [ ] Testar função manualmente com projeto 117
- [ ] Verificar se `videos_para_scann` está sendo preenchido
- [ ] Atualizar cron job para usar nova função
- [ ] Monitorar logs por 24h
- [ ] Documentar mudanças no código
- [ ] Criar migration no `/Supabase/supabase/migrations/`
- [ ] Backup da função antiga antes de substituir

---

## 🔗 ARQUIVOS RELACIONADOS

### SQL Functions:
- `verificar_novos_videos_youtube()` - Discovery de vídeos novos
- `monitormanto_de_canal_sql()` - Busca vídeos via YouTube API
- `agendar_postagens_diarias()` - Usa `Postagem_dia`
- `processar_fila_videos()` - Processa vídeos de `videos_para_scann`

### Edge Functions:
- `Canal_youtube_dados` - Busca detalhes de canal
- `Retornar-Ids-do-youtube` - Sistema legado de scanners (não usado)

### Tabelas:
- `Canais do youtube` - Armazena `videos_para_scann`
- `Projeto` - Define `Postagem_dia`
- `customers` - Define `Mentions` (créditos)

---

**Fim da Documentação**
