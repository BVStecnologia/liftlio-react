# 🔧 PLANO DE DEBUGGING: STATUS 4 Comment Analysis Loop

**Data de Criação**: 2025-10-15
**Problema**: Loop infinito em `analisar_comentarios_com_claude` consumindo API Claude sem atualizar comentários
**Impacto**: Custo financeiro (Claude API) + Tempo perdido + Pipeline travado
**Criticidade**: 🔴 ALTA

---

## 📋 ÍNDICE

1. [Análise Profunda do Problema](#análise-profunda-do-problema)
2. [Root Cause Analysis](#root-cause-analysis)
3. [Sistema de Checkpoints](#sistema-de-checkpoints)
4. [Preparação: Desativar Trigger](#fase-0-preparação)
5. [Criar Projeto de Teste](#fase-05-criar-projeto-de-teste)
6. [Execução Manual até STATUS 4](#fase-1-execução-manual)
7. [Teste Isolado da Função Problemática](#fase-2-teste-isolado)
8. [Implementação de Travas de Segurança](#fase-3-travas-de-segurança)
9. [Campo de Erros na Tabela Projeto](#fase-4-sistema-de-erros)
10. [Reativação Segura do Trigger](#fase-5-reativação)
11. [Queries de Monitoramento](#queries-de-monitoramento)
12. [Rollback Plan](#rollback-plan)

---

## 🔐 PROTOCOLO DE SEGURANÇA E FERRAMENTAS

### Ferramentas Disponíveis

✅ **Agente Supabase MCP**: Acesso completo ao banco de dados via MCP (Model Context Protocol)
- Executa queries SQL
- Aplica migrations
- Gerencia funções e triggers
- Acessa logs e métricas

✅ **Navegador MCP (Playwright)**: Painel Supabase já autenticado
- Acesso visual ao dashboard
- Validação de mudanças
- Inspeção de dados em tempo real

✅ **Arquivos Locais**: `/Users/valdair/Documents/Projetos/Liftlio/liftlio-react/supabase/functions_backup/SQL_Functions/PIPELINE_PROCESSOS`
- Source of truth para código
- Sincronização bidirecional com Supabase
- Controle de versão manual

### ⚠️ REGRAS OBRIGATÓRIAS DE SEGURANÇA

#### 🔴 REGRA #1: DROP FUNCTION IF EXISTS (SEMPRE!)
```sql
-- ✅ CORRETO - SEMPRE fazer assim
DROP FUNCTION IF EXISTS nome_da_funcao(parametros);
CREATE OR REPLACE FUNCTION nome_da_funcao(...)
```
**Por quê?** Evita funções duplicadas que causam loops infinitos e comportamento imprevisível.

#### 🔴 REGRA #2: Sincronização Local ↔ Supabase
**Fluxo obrigatório**:
1. Modificar função no Supabase via MCP
2. **IMEDIATAMENTE** atualizar arquivo local correspondente
3. Validar que ambos estão idênticos
4. Documentar mudança no checkpoint

**Arquivos que DEVEM ser sincronizados**:
- `STATUS_4_COMMENT_ANALYSIS/*.sql`
- `STATUS_3_VIDEO_ANALYSIS/*.sql` (se houver mudanças)
- `00_TRIGGER_PRINCIPAL/*.sql` (se houver mudanças)

#### 🔴 REGRA #3: ZERO Commits Git Sem Aprovação
- ❌ **NUNCA** rodar `git add`, `git commit`, `git push`
- ✅ **SEMPRE** aguardar aprovação explícita do Valdair
- ✅ **TESTAR MÚLTIPLAS VEZES** antes de considerar pronto para commit

**Por quê?** Código deve ser testado exaustivamente antes de entrar no repositório.

#### 🔴 REGRA #4: Prevenção de Loops Infinitos
**Antes de modificar qualquer função**:
1. Verificar se já existe versão antiga
2. Usar `DROP FUNCTION IF EXISTS` com assinatura completa
3. Validar que trigger NÃO vai disparar automaticamente
4. Testar em ambiente controlado (trigger desativado)

**Funções críticas que podem causar loops**:
- `process_comment_analysis_batch()`
- `atualizar_comentarios_analisados()`
- `analisar_comentarios_com_claude()`
- `claude_complete()`

#### 🔴 REGRA #5: Validação Antes de Aplicar
**Checklist para TODA modificação de função**:
- [ ] Trigger está desativado? (durante testes)
- [ ] Jobs órfãos foram removidos?
- [ ] Função antiga foi dropada?
- [ ] Arquivo local foi atualizado?
- [ ] Query de validação foi executada?
- [ ] Checkpoint foi documentado?

### 🛡️ Proteções Implementadas Neste Plano

1. **Trigger Desativado**: Evita execução automática durante debugging
2. **Checkpoints Incrementais**: Permite retomar de onde parou
3. **Queries de Validação**: Confirma que mudança foi aplicada corretamente
4. **Circuit Breakers**: Para pipeline após 3 erros consecutivos
5. **Logging Estruturado**: Rastreabilidade completa de erros

### 📝 Workflow de Modificação Segura

```
┌─────────────────────────────────────────────────────────┐
│                WORKFLOW SEGURO DE MODIFICAÇÃO            │
│                                                          │
│  1. Ler função atual (local + Supabase)                 │
│     └─→ Comparar versões                                │
│                                                          │
│  2. Criar backup                                         │
│     └─→ Copiar para arquivo .backup.sql                 │
│                                                          │
│  3. Preparar modificação                                 │
│     └─→ DROP FUNCTION IF EXISTS + CREATE OR REPLACE     │
│                                                          │
│  4. Aplicar no Supabase via MCP                          │
│     └─→ Executar query SQL                              │
│                                                          │
│  5. Validar aplicação                                    │
│     └─→ Query de validação (verificar definição)        │
│                                                          │
│  6. Sincronizar arquivo local                           │
│     └─→ Atualizar .sql local com versão exata           │
│                                                          │
│  7. Documentar checkpoint                                │
│     └─→ Marcar como COMPLETO com timestamp              │
│                                                          │
│  8. Testar isoladamente                                  │
│     └─→ Executar função manualmente e verificar output  │
│                                                          │
│  9. Aguardar aprovação para commit                       │
│     └─→ NÃO commitar sem OK do Valdair                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🧠 ANÁLISE PROFUNDA DO PROBLEMA

### Comportamento Esperado vs Observado

**ESPERADO:**
```
1. process_comment_analysis_batch() chama atualizar_comentarios_analisados()
2. atualizar_comentarios_analisados() chama analisar_comentarios_com_claude()
3. analisar_comentarios_com_claude() chama claude_complete()
4. Claude retorna JSON válido
5. Comentários são marcados como comentario_analizado = TRUE
6. contar_comentarios_analisados() retorna 0 não analisados
7. process_comment_analysis_batch() remove job e avança para STATUS 5
```

**OBSERVADO (BUG):**
```
1. process_comment_analysis_batch() chama atualizar_comentarios_analisados()
2. atualizar_comentarios_analisados() chama analisar_comentarios_com_claude()
3. analisar_comentarios_com_claude() chama claude_complete()
4. ❌ Claude FALHA (timeout/rate limit/JSON inválido)
5. ❌ atualizar_comentarios_analisados() retorna STRING de erro
6. ❌ process_comment_analysis_batch() IGNORA o erro retornado
7. ❌ contar_comentarios_analisados() AINDA retorna comentários não analisados
8. ❌ process_comment_analysis_batch() agenda PRÓXIMA execução
9. 🔄 LOOP INFINITO - Volta ao passo 1 consumindo API Claude
```

### Diagrama do Loop Infinito

```
┌────────────────────────────────────────────────────────────────┐
│                    LOOP INFINITO IDENTIFICADO                  │
│                                                                 │
│  process_comment_analysis_batch()                              │
│         │                                                       │
│         ├─→ contar_comentarios_analisados() → 1500 pendentes   │
│         │                                                       │
│         ├─→ SELECT atualizar_comentarios_analisados()          │
│         │        │                                              │
│         │        ├─→ analisar_comentarios_com_claude()         │
│         │        │        │                                     │
│         │        │        ├─→ claude_complete()                │
│         │        │        │        │                            │
│         │        │        │        ├─→ ⚠️ TIMEOUT (300s)       │
│         │        │        │        └─→ RETURN NULL             │
│         │        │        │                                     │
│         │        │        └─→ RETURN 'Erro: ...' (TEXT)        │
│         │        │                                              │
│         │        └─→ RETURN 'Erro ao converter...' (TEXT)      │
│         │                                                       │
│         ├─→ v_resultado = 'Erro: ...'                          │
│         │   ⚠️ MAS NÃO VERIFICA SE É ERRO!                     │
│         │                                                       │
│         ├─→ RAISE NOTICE (apenas log)                          │
│         │                                                       │
│         ├─→ contar_comentarios_analisados() → AINDA 1500!      │
│         │   (comentários NÃO foram atualizados)                │
│         │                                                       │
│         └─→ cron.schedule() → AGENDA PRÓXIMA EXECUÇÃO          │
│                  │                                              │
│                  └─────────┐                                    │
│                            │                                    │
│         ┌──────────────────┘                                    │
│         │                                                       │
│         ▼                                                       │
│  🔄 VOLTA AO INÍCIO (após 5 segundos)                          │
│                                                                 │
│  RESULTADO:                                                     │
│  • Consome API Claude sem parar                                │
│  • Comentários NUNCA são marcados como analisados              │
│  • Pipeline TRAVADO no STATUS 4                                │
│  • Custo financeiro crescente                                  │
└────────────────────────────────────────────────────────────────┘
```

---

## 🎯 ROOT CAUSE ANALYSIS

### Causa Raiz #1: Falta de Validação do Retorno

**Arquivo**: `02_process_comment_analysis_batch.sql`
**Linhas**: 23-25

```sql
-- CÓDIGO ATUAL (PROBLEMÁTICO)
SELECT atualizar_comentarios_analisados(project_id) INTO v_resultado;

RAISE NOTICE 'Processed batch for project ID: %. Result: %', project_id, v_resultado;

-- Agenda próxima execução SEM verificar se v_resultado indica erro
PERFORM cron.schedule(...);
```

**Problema**:
- `atualizar_comentarios_analisados()` retorna TEXT
- Pode retornar "Processados: 15, Atualizados: 15" (sucesso)
- Pode retornar "Erro ao converter o resultado para JSONB..." (falha)
- Mas `process_comment_analysis_batch()` **NUNCA verifica** qual foi o retorno!

**Impacto**:
- ✅ Se sucesso: Comentários atualizados, contador diminui, tudo ok
- ❌ Se erro: Comentários NÃO atualizados, contador igual, loop infinito

---

### Causa Raiz #2: Claude API Timeout Silencioso

**Arquivo**: `06_claude_complete.sql`
**Linhas**: 35, 48, 99-104

```sql
-- CONFIGURAÇÃO DE TIMEOUT
timeout_ms integer DEFAULT 30000  -- 30 segundos

-- Mas analisar_comentarios_com_claude chama com:
timeout_ms := 300000  -- 300 segundos (5 minutos!)

-- EXCEÇÃO GENÉRICA
EXCEPTION WHEN others THEN
    PERFORM http_reset_curlopt();
    RAISE NOTICE 'An error occurred: %', SQLERRM;
    RETURN NULL;  -- ⚠️ RETORNA NULL SEM DISTINÇÃO DE ERRO!
END;
```

**Problema**:
- Timeout de 300s é MUITO alto
- Se Claude demora >300s, retorna NULL
- Se Claude retorna erro HTTP 429 (rate limit), retorna NULL
- Se Claude retorna erro HTTP 500 (internal error), retorna NULL
- **TODOS OS ERROS SÃO TRATADOS IGUALMENTE**: RETURN NULL

**Impacto**:
- Impossível distinguir entre:
  - Timeout (precisa retry com mais tempo)
  - Rate limit (precisa esperar)
  - Erro interno Claude (precisa retry imediato)
  - JSON inválido (bug no prompt)

---

### Causa Raiz #3: Parsing JSON Frágil

**Arquivo**: `04_atualizar_comentarios_analisados.sql`
**Linhas**: 33-47

```sql
-- Limpeza de markdown
v_resultado_claude := regexp_replace(v_resultado_claude, '^\s*```json\s*', '', 'g');
v_resultado_claude := regexp_replace(v_resultado_claude, '\s*```\s*$', '', 'g');
v_resultado_claude := trim(both E'\n\r\t ' from v_resultado_claude);
v_resultado_claude := regexp_replace(v_resultado_claude, '^\uFEFF', '');

-- Conversão para JSONB
BEGIN
    v_json_resultado := v_resultado_claude::JSONB;
EXCEPTION WHEN OTHERS THEN
    RETURN 'Erro ao converter o resultado para JSONB. Primeiros 500 chars: ' ||
           left(v_resultado_claude, 500) || '... [truncado]. Erro: ' || SQLERRM;
END;
```

**Problema**:
- Claude às vezes retorna: `"Aqui está a análise:\n\n```json\n[{...}]\n```"`
- Regex pode falhar em remover markdown se formato mudar
- BOM character só remove `\uFEFF`, mas existem outros (ex: `\uFFFE`)
- Se conversão falha, **RETORNA STRING de erro mas função CONTINUA**

**Impacto**:
- JSON mal formatado → Erro → String retornada → Loop infinito

---

### Causa Raiz #4: Contador de Comentários Não Decrementa em Erro

**Arquivo**: `03_contar_comentarios_analisados.sql`
**Linhas**: 26-33

```sql
SELECT COUNT(*)
INTO v_nao_analisados
FROM public."Comentarios_Principais" cp
...
WHERE svdy."Projeto_id" = p_project_id
AND (cp.comentario_analizado IS NULL OR cp.comentario_analizado = FALSE);
```

**Problema**:
- Se `atualizar_comentarios_analisados()` falha, comentários ficam com `comentario_analizado = FALSE`
- `contar_comentarios_analisados()` retorna o MESMO número
- `process_comment_analysis_batch()` vê que ainda há comentários → agenda de novo

**Impacto**:
- Loop infinito pois contador nunca chega a zero

---

### Causa Raiz #5: Falta de Dead Letter Queue

**Nenhum arquivo implementa DLQ**

**Problema**:
- Não há mecanismo para marcar comentários como "falha permanente"
- Não há limite de tentativas por comentário
- Não há log de erros estruturado

**Impacto**:
- Comentários problemáticos são reprocessados infinitamente
- Impossível identificar quais comentários causam problemas
- Impossível pular comentários ruins

---

## 🐛 BUGS DESCOBERTOS DURANTE EXECUÇÃO DO PLANO

**Data da Descoberta**: 2025-10-16
**Projeto de Teste**: ID 115 (keyword: "SaaS")
**Executor**: Claude Code + Valdair

### BUG CRÍTICO #1: Trigger `delete_low_score_comments` Deleta Comentários Durante UPDATE

**Arquivo Afetado**: Trigger na tabela `Comentarios_Principais`
**Impacto**: 🔴 CRÍTICO - Impede atualização de comentários analisados

**Descrição Completa**:
```sql
-- Definição do trigger problemático
CREATE OR REPLACE FUNCTION public.delete_low_score_comments()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Se o lead_score for atualizado e for menor que 7, exclui o comentário
    IF NEW.lead_score IS NOT NULL AND
       NEW.lead_score ~ '^[0-9]+' AND  -- Verifica se é um número
       NEW.lead_score::INTEGER < 7 THEN

        -- Registra a exclusão em log (opcional)
        RAISE NOTICE 'Excluindo comentário ID % com lead_score %', NEW.id, NEW.lead_score;

        -- Exclui o comentário imediatamente
        DELETE FROM public."Comentarios_Principais" WHERE id = NEW.id;

        -- Como estamos excluindo o registro, retornamos NULL
        RETURN NULL;
    END IF;

    -- Se não excluímos, permitimos que a operação original continue
    RETURN NEW;
END;
$function$
```

**Como foi descoberto**:
1. CHECKPOINT 2.5: Testamos `atualizar_comentarios_analisados(115)` primeira vez
2. Resultado: "Processados: 1, Atualizados: 1" ✅
3. Testamos segunda vez: "Processados: 1, Atualizados: 1" ✅
4. Ao verificar comentários, descobrimos que comentário ID 1751744 **DESAPARECEU**
5. Investigação revelou trigger que deleta automaticamente comentários com score < 7 durante UPDATE

**Evidências**:
```sql
-- Query que mostrou comentário desaparecido
SELECT id, text_display, comentario_analizado, lead_score
FROM "Comentarios_Principais"
WHERE id IN (1751744, 1751745, 1751746);
-- Resultado: Apenas 1751745 e 1751746 existiam (1751744 foi deletado)
```

**Impacto Real**:
- ❌ Comentários com score < 7 são **DELETADOS** em vez de serem marcados como não-lead
- ❌ `atualizar_comentarios_analisados()` reporta sucesso mas comentários não existem mais
- ❌ Contador de comentários diminui artificialmente
- ❌ Perda permanente de dados de análise
- ❌ Impossibilita debug do loop infinito

**Solução Temporária Aplicada**:
```sql
-- Desabilitar trigger durante testes
ALTER TABLE "Comentarios_Principais"
DISABLE TRIGGER delete_low_score_comments_trigger;
```

**Solução Permanente Recomendada**:
```sql
-- REMOVER trigger completamente OU
DROP TRIGGER IF EXISTS delete_low_score_comments_trigger ON "Comentarios_Principais";

-- Alternativamente, modificar para apenas marcar como "deletado" em vez de deletar:
ALTER TABLE "Comentarios_Principais"
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

CREATE OR REPLACE FUNCTION public.soft_delete_low_score_comments()
RETURNS trigger AS $function$
BEGIN
    IF NEW.lead_score IS NOT NULL AND
       NEW.lead_score::INTEGER < 7 THEN
        NEW.deleted_at := NOW();  -- Soft delete
    END IF;
    RETURN NEW;
END;
$function$ LANGUAGE plpgsql;
```

---

### BUG CRÍTICO #2: Função Chama Claude Sem Validar Se Há Dados (CAUSA RAIZ DO LOOP INFINITO)

**Arquivo Afetado**: `05_analisar_comentarios_com_claude.sql`
**Linhas Problemáticas**: 102-160, 179-192
**Impacto**: 🔴 CRÍTICO - Causa loop infinito consumindo API Claude

**Descrição Completa**:

A função `analisar_comentarios_com_claude()` executa este fluxo:

```sql
-- Linhas 102-160: Loop FOR que busca comentários não-analisados
FOR video_data IN (
    WITH videos_do_projeto AS (
        SELECT DISTINCT cp.video_id
        FROM public."Comentarios_Principais" cp
        ...
        WHERE s."Projeto_id" = p_project_id
        AND (cp.comentario_analizado IS NULL OR cp.comentario_analizado = FALSE)
        LIMIT 1
    )
    SELECT v.id, v.video_title, ...
    FROM videos_do_projeto vdp
    ...
) LOOP
    -- Constrói prompt_claude com dados do vídeo e comentários
    ...
END LOOP;

-- Linha 179: Chama Claude SEMPRE, mesmo se loop não executou!
SELECT claude_complete(
    prompt_claude,  -- ⚠️ Pode estar INCOMPLETO/VAZIO!
    ...
) INTO resultado_claude;

RETURN resultado_claude;
```

**Problema**:
1. Se **NÃO houver comentários não-analisados**, a query `videos_do_projeto` retorna **VAZIO**
2. Loop `FOR video_data IN (...)` **NÃO EXECUTA** nenhuma iteração
3. Variável `prompt_claude` fica **APENAS com instruções gerais**, sem dados de vídeo/comentários
4. Função chama `claude_complete()` **SEM VALIDAÇÃO**, enviando prompt incompleto
5. Claude **ALUCINA dados fictícios** (vídeos/comentários que não existem)
6. `atualizar_comentarios_analisados()` tenta processar comentários inventados
7. Como IDs não existem, não atualiza nada (0 updates)
8. **LOOP INFINITO** - próxima execução repete todo o ciclo

**Como foi descoberto**:
1. Testamos `atualizar_comentarios_analisados(115)` 3 vezes com sucesso
2. Todos os 3 comentários foram marcados como analisados
3. Testamos 4ª vez para verificar loop
4. Resultado inesperado: "Processados: 5, Atualizados: 0, Não atualizados: 5"
5. Investigação mostrou que Claude retornou 5 comentários de vídeo `YfKCHSv7HFw` que **NÃO EXISTE** no projeto 115

**Evidências Coletadas**:

```sql
-- 1. Consulta interna da função retornou VAZIO (sem comentários para processar)
WITH videos_do_projeto AS (...)
SELECT v.id, ... FROM videos_do_projeto vdp ...;
-- Resultado: [] (vazio)

-- 2. Mas Claude retornou dados inventados:
SELECT analisar_comentarios_com_claude(115);
-- Resultado (parcial):
[
  {
    "comentario_id": "UgxWLxCvVPvOYFPAqBN4AaABAg",  -- YouTube ID inexistente!
    "video_id": "YfKCHSv7HFw",                     -- Vídeo inexistente!
    "lead": true,
    "lead_score": 8,
    ...
  },
  ... (mais 4 comentários inventados)
]

-- 3. Confirmamos que vídeo não existe no banco:
SELECT id, "VIDEO" FROM "Videos" WHERE "VIDEO" = 'YfKCHSv7HFw';
-- Resultado: [] (vazio)

-- 4. Confirmamos que YouTube IDs não existem:
SELECT id FROM "Comentarios_Principais"
WHERE id_do_comentario IN ('UgxWLxCvVPvOYFPAqBN4AaABAg', ...);
-- Resultado: [] (vazio)
```

**Fluxo do Bug (Diagrama)**:

```
┌─────────────────────────────────────────────────────────────┐
│  LOOP INFINITO CAUSADO POR PROMPT VAZIO                     │
│                                                              │
│  1. atualizar_comentarios_analisados(115)                   │
│       │                                                      │
│       ├─→ analisar_comentarios_com_claude(115)              │
│       │     │                                                │
│       │     ├─→ Query videos_do_projeto: [] (VAZIO)         │
│       │     │                                                │
│       │     ├─→ Loop FOR: NÃO EXECUTA                       │
│       │     │                                                │
│       │     ├─→ prompt_claude = "### SISTEMA DE QUALIF..."  │
│       │     │   (apenas instruções gerais, SEM DADOS!)      │
│       │     │                                                │
│       │     └─→ claude_complete(prompt_vazio)               │
│       │           │                                          │
│       │           └─→ Claude ALUCINA:                       │
│       │               {                                      │
│       │                 "comentario_id": "UgxW...",         │
│       │                 "video_id": "YfKCHSv7HFw",          │
│       │                 ... (dados fictícios)               │
│       │               }                                      │
│       │                                                      │
│       └─→ Tenta UPDATE com IDs inventados                   │
│           WHERE id = 'UgxW...'  ❌ Não existe               │
│           RESULT: 0 rows updated                            │
│                                                              │
│  2. Retorna "Processados: 5, Atualizados: 0"               │
│                                                              │
│  3. process_comment_analysis_batch() vê que há comentários  │
│     (contador não mudou) e AGENDA PRÓXIMA EXECUÇÃO          │
│                                                              │
│  4. 🔄 VOLTA AO INÍCIO (loop infinito)                      │
└─────────────────────────────────────────────────────────────┘
```

**Impacto Real**:
- ❌ Claude API consumida infinitamente com prompts inválidos
- ❌ Custos financeiros crescentes sem processamento real
- ❌ Pipeline travado no STATUS 4 eternamente
- ❌ Impossível detectar quando pipeline terminou legitimamente
- ❌ Comentários inventados podem criar registros inválidos

**Solução Recomendada**:

```sql
-- Adicionar validação ANTES de chamar Claude
-- Inserir após linha 160, ANTES da linha 179

-- Variável para rastrear se encontrou dados
DECLARE
    v_tem_dados BOOLEAN := FALSE;
BEGIN
    -- ... (código existente com loops) ...

    -- Dentro dos loops FOR, marcar que encontrou dados:
    FOR video_data IN (...) LOOP
        v_tem_dados := TRUE;  -- ← ADICIONAR ESTA LINHA

        prompt_claude := prompt_claude || ...
        ...
    END LOOP;

    -- ===== VALIDAÇÃO CRÍTICA =====
    -- Se não encontrou dados, retornar mensagem apropriada SEM chamar Claude
    IF NOT v_tem_dados THEN
        RETURN jsonb_build_array()::text;  -- Retorna array JSON vazio
        -- OU
        -- RETURN 'Nenhum comentário não-analisado encontrado para o projeto';
    END IF;

    -- Só chama Claude se houver dados para processar
    SELECT claude_complete(...) INTO resultado_claude;

    RETURN resultado_claude;
END;
```

**Testes de Validação**:

```sql
-- Teste 1: Projeto com comentários não-analisados (deve processar)
SELECT analisar_comentarios_com_claude(115);  -- quando ainda há comentários
-- Resultado esperado: JSON válido com análises

-- Teste 2: Projeto com TODOS comentários analisados (deve retornar vazio)
SELECT analisar_comentarios_com_claude(115);  -- quando não há mais comentários
-- Resultado esperado: '[]' (array vazio) ou mensagem informativa
-- Resultado ATUAL (bug): JSON com 5 comentários inventados ❌

-- Teste 3: Validar que atualizar_comentarios_analisados trata array vazio
SELECT atualizar_comentarios_analisados(115);
-- Resultado esperado: "Nenhum comentário para processar" ou similar
-- Não deve chamar Claude, não deve inventar dados
```

**Status Atual**: 🟡 Bug identificado, solução proposta, aguardando implementação

---

### Resumo dos Bugs Críticos

| # | Bug | Impacto | Status | Prioridade |
|---|-----|---------|--------|------------|
| 1 | Trigger deleta comentários com score < 7 | Perda de dados | Desabilitado temporariamente | 🔴 Alta |
| 2 | Função chama Claude sem validar dados | Loop infinito | Identificado, solução proposta | 🔴 Alta |

**Próximos Passos**:
1. ✅ Desabilitar trigger delete_low_score_comments (CONCLUÍDO)
2. ✅ Identificar causa raiz do loop (CONCLUÍDO)
3. ⏳ Implementar validação antes de chamar Claude (PENDENTE)
4. ⏳ Testar correção com projeto 115 (PENDENTE)
5. ⏳ Documentar lições aprendidas (PENDENTE)

---

## 📊 SISTEMA DE CHECKPOINTS

Para permitir retomar o processo de onde paramos, usaremos checkpoints em comentários SQL:

```sql
-- CHECKPOINT: [FASE] - [DESCRIÇÃO] - [STATUS: PENDENTE/COMPLETO/ERRO]
-- DATA: YYYY-MM-DD HH:MM
-- PROJECT_ID: [ID do projeto sendo debugado]
```

**Localização dos Checkpoints**: No início de cada arquivo SQL modificado

**Como usar**:
1. Antes de executar cada fase, adicione checkpoint com STATUS: PENDENTE
2. Após execução bem-sucedida, mude para STATUS: COMPLETO
3. Se erro, mude para STATUS: ERRO e anote detalhes

---

## 🚀 FASE 0: PREPARAÇÃO

### Objetivo
Desativar o trigger principal para evitar execução automática durante debugging.

### Pré-requisitos
- [ ] Acesso ao Supabase Dashboard
- [ ] Permissões de admin no banco
- [ ] Backup do trigger atual

### Passos

#### CHECKPOINT 0.1: Backup do Trigger
**STATUS**: PENDENTE

```sql
-- 1. Salvar definição atual do trigger
SELECT pg_get_triggerdef(oid)
FROM pg_trigger
WHERE tgname = 'trigger_schedule_process_project'
\gset trigger_def

-- 2. Salvar em variável ou arquivo externo
-- Cole o resultado em um arquivo .sql de backup
```

**Validação**:
```sql
-- Verificar que trigger existe
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_schedule_process_project';
-- Deve retornar 1 linha com tgenabled = 'O' (enabled)
```

**Data de Execução**: __________
**Executado por**: __________
**Resultado**: __________

---

#### CHECKPOINT 0.2: Desativar Trigger
**STATUS**: PENDENTE

```sql
-- Desabilitar trigger (NÃO deleta, apenas desativa)
ALTER TABLE "Projeto"
DISABLE TRIGGER trigger_schedule_process_project;
```

**Validação**:
```sql
-- Verificar que trigger está desativado
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_schedule_process_project';
-- tgenabled deve ser 'D' (disabled)
```

**⚠️ ATENÇÃO**: Com trigger desativado:
- Mudanças de status NÃO criam jobs automaticamente
- Pipeline NÃO avança sozinho
- Você tem CONTROLE TOTAL manual

**Data de Execução**: __________
**Executado por**: __________
**Resultado**: __________

---

#### CHECKPOINT 0.3: Limpar Jobs Órfãos
**STATUS**: PENDENTE

```sql
-- Listar todos os jobs ativos relacionados ao projeto
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname LIKE 'process_%'
   OR jobname LIKE '%_' || [PROJECT_ID]::text;

-- Remover TODOS os jobs (para começar limpo)
DO $$
DECLARE
    job_rec RECORD;
BEGIN
    FOR job_rec IN
        SELECT jobname
        FROM cron.job
        WHERE jobname LIKE 'process_%'
    LOOP
        PERFORM cron.unschedule(job_rec.jobname);
        RAISE NOTICE 'Job removido: %', job_rec.jobname;
    END LOOP;
END $$;
```

**Validação**:
```sql
-- Verificar que não há jobs ativos
SELECT COUNT(*) FROM cron.job WHERE jobname LIKE 'process_%';
-- Deve retornar 0
```

**Data de Execução**: __________
**Executado por**: __________
**Resultado**: __________

---

#### CHECKPOINT 0.4: Validação Final do Estado do Trigger
**STATUS**: ✅ COMPLETO
**Data de Execução**: 2025-10-16 12:31 UTC

**Validação Tripla Realizada:**

1. **Estado do Trigger**:
   ```
   tgname: trigger_schedule_process_project
   tabela: "Projeto"
   tgenabled: D
   status_humano: DISABLED (✅ SEGURO)
   ```
   ✅ Trigger confirmado como DISABLED

2. **Jobs Existentes ANTES do Teste**:
   ```
   jobs_existentes_antes_teste: 0
   lista_jobs: null
   ```
   ✅ Nenhum job órfão no sistema

3. **Teste de Segurança - Projeto Temporário Criado**:
   ```
   Projeto ID: 114
   User: teste@validacao.trigger
   Description: TESTE VALIDACAO TRIGGER - DELETAR
   Created: 2025-10-16 12:31:40.60965+00
   ```
   ✅ Projeto criado com sucesso

4. **Verificação de Jobs APÓS INSERT**:
   ```
   jobs_criados_apos_insert: 0
   ```
   ✅ NENHUM job foi criado após INSERT (trigger NÃO disparou)

5. **Verificação Específica do Job do Projeto 114**:
   ```
   Resultado: [] (vazio)
   ```
   ✅ Job process_project_114 NÃO existe

6. **Limpeza**:
   ```
   DELETE FROM "Projeto" WHERE id = 114
   ```
   ✅ Projeto de teste removido

**Resultado Final**: ✅ **AMBIENTE 100% SEGURO**

**Confirmações:**
- ✅ Trigger = DISABLED (D)
- ✅ Jobs órfãos = 0
- ✅ INSERT não dispara trigger (testado e confirmado)
- ✅ Sistema pronto para FASE 0.5

**Próximo Passo**: Criar Projeto de Teste com 1-2 keywords (CHECKPOINT 0.5.2)

---

## 🧪 FASE 0.5: CRIAR PROJETO DE TESTE

### Objetivo
Criar projeto isolado baseado no projeto 113, usando apenas 1-2 palavras-chave para minimizar custos e volume de dados durante debug.

### Estratégia
- Copiar configurações do projeto 113 (comprovadamente funcional)
- Usar APENAS 1-2 keywords nichadas (reduzir vídeos/comentários)
- Criar scanners vinculados ao novo projeto
- Executar APÓS desativar trigger (segurança)

**⚠️ IMPORTANTE**: Esta fase DEVE ser executada APÓS desativar o trigger (FASE 0.2), para evitar execução automática durante criação.

---

### CHECKPOINT 0.5.1: Consultar Projeto 113 (Referência)
**STATUS**: PENDENTE

```sql
-- Obter configuração atual do projeto 113
SELECT
    id,
    user_id,
    "description service",
    "Keywords",
    integracao_valida,
    created_at
FROM "Projeto"
WHERE id = 113;

-- Anotar configurações:
-- user_id: __________
-- description service: __________
-- Keywords (atual): __________
```

**Validação**:
```sql
-- Verificar scanners associados ao projeto 113
SELECT
    id,
    "NOME_CANAL",
    "CHANNEL_ID",
    ativo
FROM "Scanner de videos do youtube"
WHERE "Projeto_id" = 113;

-- Anotar IDs dos scanners: __________
```

**Data de Execução**: __________
**User ID**: __________
**Description**: __________

---

### CHECKPOINT 0.5.2: Criar Projeto de Teste (1-2 Keywords)
**STATUS**: PENDENTE

**Keywords Sugeridas (escolher 1-2):**
- `"B2B SaaS marketing automation"` (nichado, ~5-10 vídeos esperados)
- `"enterprise video analytics 2025"` (temporal + específico)
- `"YouTube comment sentiment analysis"` (meta + relevante)

**Critérios de escolha:**
- Muito específica (poucos vídeos)
- Relevante ao negócio
- Expectativa: 5-15 vídeos, 20-80 comentários

```sql
-- Criar projeto minimalista para debug
INSERT INTO "Projeto" (
    user_id,
    "description service",
    "Keywords",
    status,
    integracao_valida,
    created_at
) VALUES (
    [USER_ID_DO_113],  -- Mesmo user do projeto 113
    'DEBUG STATUS 4 - Projeto de Teste com 1-2 Keywords',
    'B2B SaaS marketing automation',  -- ESCOLHER 1-2 keywords apenas
    '0',  -- Começa no STATUS 0
    true,
    NOW()
)
RETURNING id;

-- ⚠️ ANOTAR O ID RETORNADO: __________
-- Este será o [PROJECT_TEST_ID] usado em todos os próximos passos
```

**Validação**:
```sql
-- Verificar projeto criado
SELECT
    id,
    "description service",
    "Keywords",
    status,
    integracao_valida
FROM "Projeto"
WHERE "description service" LIKE '%DEBUG STATUS 4%'
ORDER BY created_at DESC
LIMIT 1;
```

**Estimativa de Custos:**
```
Cenário Conservador (1 keyword nichada):
├─→ ~5-10 vídeos esperados
├─→ ~3-5 comentários por vídeo = 15-50 comentários total
├─→ STATUS 3: ~5-10 chamadas Claude = $0.10-0.20
├─→ STATUS 4: ~4 batches de 15 comentários = $0.15-0.25
└─→ CUSTO TOTAL ESTIMADO: $0.30-0.50

vs Projeto Produção (5-10 keywords):
├─→ ~100-200 vídeos
├─→ ~1000-3000 comentários
└─→ CUSTO TOTAL: $4-7

ECONOMIA: 97% em custos | 95% em tempo | 100% em segurança
```

**Data de Execução**: __________
**PROJECT_TEST_ID**: __________
**Keyword Escolhida**: __________

---

### CHECKPOINT 0.5.3: Criar Scanners Vinculados
**STATUS**: PENDENTE

**Opção A: Copiar Scanners do Projeto 113**
```sql
-- Copiar scanners do projeto 113 para o projeto de teste
INSERT INTO "Scanner de videos do youtube" (
    "NOME_CANAL",
    "CHANNEL_ID",
    "Projeto_id",
    ativo,
    rodada
)
SELECT
    "NOME_CANAL",
    "CHANNEL_ID",
    [PROJECT_TEST_ID],  -- ID do projeto de teste criado no CHECKPOINT 0.5.2
    true,  -- Ativar scanners
    0  -- Rodada inicial
FROM "Scanner de videos do youtube"
WHERE "Projeto_id" = 113
  AND ativo = true
LIMIT 2;  -- Limitar a 2 scanners para reduzir volume

-- Anotar quantos scanners foram copiados: __________
```

**Opção B: Criar Scanner Novo (se preferir controle total)**
```sql
-- Criar 1-2 scanners manualmente
INSERT INTO "Scanner de videos do youtube" (
    "NOME_CANAL",
    "CHANNEL_ID",
    "Projeto_id",
    ativo,
    rodada
) VALUES
(
    'Canal Teste 1',
    'UC...',  -- ID de canal real e pequeno
    [PROJECT_TEST_ID],
    true,
    0
);
-- Repetir para 2º scanner se necessário
```

**Validação**:
```sql
-- Verificar scanners criados e vinculados
SELECT
    id,
    "NOME_CANAL",
    "CHANNEL_ID",
    "Projeto_id",
    ativo,
    rodada
FROM "Scanner de videos do youtube"
WHERE "Projeto_id" = [PROJECT_TEST_ID];

-- Deve retornar 1-2 scanners ativos com rodada = 0
```

**Data de Execução**: __________
**Scanners Criados**: __________
**IDs dos Scanners**: __________

---

### CHECKPOINT 0.5.4: Validar Configuração Completa
**STATUS**: PENDENTE

```sql
-- Verificar setup completo do projeto de teste
SELECT
    p.id,
    p."description service",
    p."Keywords",
    p.status,
    p.integracao_valida,
    (SELECT COUNT(*)
     FROM "Scanner de videos do youtube"
     WHERE "Projeto_id" = p.id) as total_scanners,
    (SELECT COUNT(*)
     FROM "Scanner de videos do youtube"
     WHERE "Projeto_id" = p.id AND ativo = true) as scanners_ativos
FROM "Projeto" p
WHERE p.id = [PROJECT_TEST_ID];
```

**Checklist de Validação:**
- [ ] Projeto criado com ID: __________
- [ ] Description contém "DEBUG STATUS 4"
- [ ] Keywords: 1-2 palavras apenas (nichadas)
- [ ] Status = '0'
- [ ] integracao_valida = true
- [ ] Total scanners: 1-2
- [ ] Scanners ativos: 1-2
- [ ] Trigger DESATIVADO (confirmado na FASE 0.2)

**Expectativas de Volume (documentar após FASE 1):**
- Vídeos esperados: 5-15
- Comentários esperados: 20-80
- Tempo estimado STATUS 0→4: 30-60 minutos
- Custo estimado: $0.30-0.50

**⚠️ Se volumes ultrapassarem expectativas:**
- Vídeos > 20: PARAR e revisar keyword
- Comentários > 100: PARAR e revisar keyword
- Custo > $1: PARAR e revisar estratégia

**Data de Execução**: __________
**Status Validação**: [ ] Passou [ ] Falhou
**Observações**: __________

---

## 📝 FASE 1: EXECUÇÃO MANUAL ATÉ STATUS 4

### Objetivo
Executar pipeline manualmente passo-a-passo até chegar no STATUS 4, validando cada etapa.

### Estratégia
- Executar cada STATUS manualmente
- Validar resultados antes de avançar
- Documentar tempo de execução e problemas

---

### CHECKPOINT 1.1: Forçar STATUS 0
**STATUS**: PENDENTE

```sql
-- Resetar projeto para STATUS 0
UPDATE "Projeto"
SET status = '0'
WHERE id = [PROJECT_ID];

-- Executar função manualmente
SELECT atualizar_scanner_rodada([PROJECT_ID]);
```

**Validação**:
```sql
-- Verificar scanners atualizados
SELECT
    id,
    "NOME_CANAL",
    ativo,
    rodada
FROM "Scanner de videos do youtube"
WHERE "Projeto_id" = [PROJECT_ID];

-- Todos scanners ativos devem ter rodada = 1

-- Verificar status mudou para 1
SELECT status FROM "Projeto" WHERE id = [PROJECT_ID];
-- Deve retornar '1'
```

**Data de Execução**: __________
**Tempo de Execução**: __________
**Resultado**: __________

---

### CHECKPOINT 1.2: Executar STATUS 1 (Scanner Processing)
**STATUS**: PENDENTE

```sql
-- Contar scanners pendentes
SELECT COUNT(*)
FROM "Scanner de videos do youtube"
WHERE "Projeto_id" = [PROJECT_ID]
  AND rodada = 1;

-- Executar scanner por scanner manualmente
-- (Repetir para cada scanner)
SELECT process_next_project_scanner([PROJECT_ID]);

-- Aguardar ~30-60s entre execuções (respeitar API YouTube)
```

**Validação**:
```sql
-- Verificar todos scanners processados
SELECT COUNT(*)
FROM "Scanner de videos do youtube"
WHERE "Projeto_id" = [PROJECT_ID]
  AND rodada = 2;
-- Deve ser igual ao total de scanners ativos

-- Verificar vídeos inseridos
SELECT COUNT(*)
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = [PROJECT_ID];
-- Deve ter > 0 vídeos

-- Verificar status mudou para 2
SELECT status FROM "Projeto" WHERE id = [PROJECT_ID];
-- Deve retornar '2'
```

**Data de Execução**: __________
**Tempo de Execução**: __________
**Vídeos Inseridos**: __________
**Resultado**: __________

---

### CHECKPOINT 1.3: Executar STATUS 2 (Video Stats + Comments)
**STATUS**: PENDENTE

#### Fase 2.1: Video Stats

```sql
-- Contar vídeos sem stats
SELECT COUNT(*)
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = [PROJECT_ID]
  AND v.stats_atualizadas = false;

-- Executar atualização de stats em batches
-- (Repetir até contar = 0)
SELECT update_video_stats([PROJECT_ID], 10);

-- Aguardar 7s entre execuções (respeitar circuit breaker)
```

**Validação**:
```sql
-- Verificar todos vídeos com stats
SELECT COUNT(*)
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = [PROJECT_ID]
  AND v.stats_atualizadas = true;
-- Deve ser igual ao total de vídeos
```

#### Fase 2.2: Video Comments

```sql
-- Contar vídeos sem comentários
SELECT COUNT(*)
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = [PROJECT_ID]
  AND v.comentarios_atualizados = false
  AND v.comentarios_desativados = false;

-- Executar busca de comentários
SELECT process_videos_batch([PROJECT_ID], 10);

-- Aguardar 5s entre execuções
```

**Validação**:
```sql
-- Verificar todos vídeos com comentários
SELECT COUNT(*)
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = [PROJECT_ID]
  AND (v.comentarios_atualizados = true OR v.comentarios_desativados = true);
-- Deve ser igual ao total de vídeos

-- Verificar comentários inseridos
SELECT COUNT(*)
FROM "Comentarios_Principais" cp
JOIN "Videos" v ON cp.video_id = v.id
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = [PROJECT_ID];
-- Deve ter > 0 comentários

-- Verificar status mudou para 3
SELECT status FROM "Projeto" WHERE id = [PROJECT_ID];
-- Deve retornar '3'
```

**Data de Execução**: __________
**Tempo de Execução Stats**: __________
**Tempo de Execução Comments**: __________
**Comentários Inseridos**: __________
**Resultado**: __________

---

### CHECKPOINT 1.4: Executar STATUS 3 (Video Analysis)
**STATUS**: PENDENTE

```sql
-- Contar vídeos sem análise
SELECT COUNT(*)
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = [PROJECT_ID]
  AND v.is_relevant IS NULL;

-- Executar análise de vídeos
SELECT process_video_analysis_batch([PROJECT_ID], 5);

-- Aguardar 30s entre execuções (respeitar Claude API)
```

**Validação**:
```sql
-- Verificar todos vídeos analisados
SELECT COUNT(*)
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = [PROJECT_ID]
  AND v.is_relevant IS NOT NULL;
-- Deve ser igual ao total de vídeos

-- Verificar status mudou para 4
SELECT status FROM "Projeto" WHERE id = [PROJECT_ID];
-- Deve retornar '4'
```

**Data de Execução**: __________
**Tempo de Execução**: __________
**Vídeos Analisados**: __________
**Resultado**: __________

---

## 🔬 FASE 2: TESTE ISOLADO DA FUNÇÃO PROBLEMÁTICA

### Objetivo
Testar `atualizar_comentarios_analisados()` isoladamente em ambiente controlado.

---

### CHECKPOINT 2.1: Estado Pré-Teste
**STATUS**: PENDENTE

```sql
-- Documentar comentários ANTES do teste
SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE comentario_analizado = true) as analisados,
    COUNT(*) FILTER (WHERE comentario_analizado IS NULL OR comentario_analizado = false) as pendentes
FROM "Comentarios_Principais" cp
JOIN "Videos" v ON cp.video_id = v.id
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = [PROJECT_ID];

-- Salvar resultado
```

**Data de Execução**: __________
**Total**: __________ | **Analisados**: __________ | **Pendentes**: __________

---

### CHECKPOINT 2.2: Teste com LIMITE de 1 Comentário
**STATUS**: PENDENTE

**⚠️ CRÍTICO**: Começar com APENAS 1 comentário para minimizar consumo de API.

```sql
-- Modificar temporariamente analisar_comentarios_com_claude.sql
-- Adicionar LIMIT 1 nas linhas 69 e 128:

-- Linha 69 (com video_id específico):
LIMIT 1  -- Era: LIMIT 20

-- Linha 128 (sem video_id):
LIMIT 1  -- Era: LIMIT 15

-- Aplicar mudança no Supabase
-- Executar teste
SELECT atualizar_comentarios_analisados([PROJECT_ID]);

-- Aguardar resultado (pode demorar até 5 minutos)
```

**Possíveis Resultados**:

**A) SUCESSO**:
```
"Processados: 1, Atualizados: 1, Não atualizados: 0"
```
→ Função está OK! Problema é no volume ou rate limit.

**B) ERRO DE PARSING**:
```
"Erro ao converter o resultado para JSONB. Primeiros 500 chars: ..."
```
→ Claude retornou formato inválido. Copiar output e analisar.

**C) ERRO DE TIMEOUT**:
```
"A função analisar_comentarios_com_claude retornou um resultado nulo ou vazio"
```
→ Claude demorou >300s. Aumentar timeout ou reduzir context.

**D) ERRO HTTP**:
```
"API request failed. Status: 429, Body: ..."
```
→ Rate limit. Aguardar e tentar novamente.

**Validação**:
```sql
-- Se sucesso (caso A), verificar atualização
SELECT
    id,
    text_display,
    comentario_analizado,
    led,
    lead_score,
    justificativa
FROM "Comentarios_Principais" cp
JOIN "Videos" v ON cp.video_id = v.id
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = [PROJECT_ID]
  AND comentario_analizado = true
ORDER BY cp.id DESC
LIMIT 1;

-- Deve retornar 1 comentário com campos preenchidos
```

**Data de Execução**: __________
**Resultado**: [ ] A | [ ] B | [ ] C | [ ] D
**Output Completo**: __________

---

### CHECKPOINT 2.3: Análise do Output Claude (Se Erro B)
**STATUS**: PENDENTE

Se ocorreu erro de parsing, analisar o output:

```sql
-- Executar novamente com RAISE NOTICE do resultado bruto
DO $$
DECLARE
    v_resultado TEXT;
BEGIN
    SELECT analisar_comentarios_com_claude([PROJECT_ID]) INTO v_resultado;
    RAISE NOTICE 'Output Claude (primeiros 2000 chars): %', left(v_resultado, 2000);
END $$;
```

**Checklist de Análise**:
- [ ] Tem markdown fence? (```json ... ```)
- [ ] Tem texto antes do JSON? ("Aqui está a análise:")
- [ ] Tem BOM character? (caracteres invisíveis no início)
- [ ] É array válido? (começa com `[` e termina com `]`)
- [ ] Campos estão corretos? (`comentario_id`, `lead`, `lead_score`, `justificativa`)

**Ações Corretivas**:
- Se markdown fence → Regex em `04_atualizar_comentarios_analisados.sql` está falhando
- Se texto antes → Prompt em `05_analisar_comentarios_com_claude.sql` precisa ser mais específico
- Se BOM → Adicionar mais variantes de BOM no regex
- Se campos errados → Claude não está seguindo instruções (melhorar prompt)

**Data de Execução**: __________
**Problema Identificado**: __________
**Ação Tomada**: __________

---

### CHECKPOINT 2.4: Teste com LIMITE de 10 Comentários
**STATUS**: PENDENTE

Se teste com 1 comentário passou, aumentar para 10:

```sql
-- Modificar novamente analisar_comentarios_com_claude.sql
-- Linha 69: LIMIT 10
-- Linha 128: LIMIT 10

-- Executar teste
SELECT atualizar_comentarios_analisados([PROJECT_ID]);
```

**Validação**:
```sql
-- Verificar se 10 comentários foram atualizados
SELECT COUNT(*)
FROM "Comentarios_Principais" cp
JOIN "Videos" v ON cp.video_id = v.id
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = [PROJECT_ID]
  AND comentario_analizado = true;
-- Se era 1 antes, agora deve ser 11
```

**Data de Execução**: __________
**Resultado**: __________

---

### CHECKPOINT 2.5: Restaurar LIMIT Original
**STATUS**: PENDENTE

```sql
-- Modificar de volta analisar_comentarios_com_claude.sql
-- Linha 69: LIMIT 20 (original)
-- Linha 128: LIMIT 15 (original)

-- Aplicar no Supabase
```

**Data de Execução**: __________

---

## 🛡️ FASE 3: TRAVAS DE SEGURANÇA

### Objetivo
Adicionar sistema de detecção de erros para prevenir loop infinito.

---

### CHECKPOINT 3.1: Adicionar Validação em process_comment_analysis_batch
**STATUS**: PENDENTE

**Modificar**: `02_process_comment_analysis_batch.sql`

**Adicionar após linha 23**:

```sql
-- CÓDIGO ATUAL (LINHA 23-25)
SELECT atualizar_comentarios_analisados(project_id) INTO v_resultado;
RAISE NOTICE 'Processed batch for project ID: %. Result: %', project_id, v_resultado;

-- ADICIONAR VALIDAÇÃO:
DECLARE
    v_comentarios_antes INTEGER;
    v_comentarios_depois INTEGER;
    v_tentativas_falhas INTEGER := 0;
BEGIN
    -- Contar ANTES
    SELECT comentarios_nao_analisados INTO v_comentarios_antes
    FROM contar_comentarios_analisados(project_id);

    -- Executar análise
    SELECT atualizar_comentarios_analisados(project_id) INTO v_resultado;

    RAISE NOTICE 'Processed batch for project ID: %. Result: %', project_id, v_resultado;

    -- ===== TRAVA DE SEGURANÇA #1: Verificar se é erro =====
    IF v_resultado LIKE 'Erro%' OR v_resultado LIKE '%erro%' OR v_resultado IS NULL THEN
        RAISE WARNING 'ERRO DETECTADO na análise de comentários: %', v_resultado;

        -- Incrementar contador de erros
        UPDATE "Projeto"
        SET erro_count = COALESCE(erro_count, 0) + 1,
            ultimo_erro = v_resultado,
            ultimo_erro_timestamp = NOW()
        WHERE id = project_id;

        -- ===== CIRCUIT BREAKER: Parar após 3 erros consecutivos =====
        SELECT COALESCE(erro_count, 0) INTO v_tentativas_falhas
        FROM "Projeto"
        WHERE id = project_id;

        IF v_tentativas_falhas >= 3 THEN
            RAISE EXCEPTION 'CIRCUIT BREAKER: 3 erros consecutivos detectados. Parando pipeline. Último erro: %', v_resultado;
        END IF;

        -- Não agenda próxima execução em caso de erro
        RETURN;
    END IF;

    -- ===== TRAVA DE SEGURANÇA #2: Verificar se atualizou =====
    SELECT comentarios_nao_analisados INTO v_comentarios_depois
    FROM contar_comentarios_analisados(project_id);

    IF v_comentarios_antes = v_comentarios_depois THEN
        RAISE WARNING 'NENHUM COMENTÁRIO FOI ATUALIZADO! Antes: %, Depois: %', v_comentarios_antes, v_comentarios_depois;

        UPDATE "Projeto"
        SET erro_count = COALESCE(erro_count, 0) + 1,
            ultimo_erro = 'Nenhum comentário atualizado: ' || v_resultado,
            ultimo_erro_timestamp = NOW()
        WHERE id = project_id;

        -- Circuit breaker
        SELECT COALESCE(erro_count, 0) INTO v_tentativas_falhas
        FROM "Projeto"
        WHERE id = project_id;

        IF v_tentativas_falhas >= 3 THEN
            RAISE EXCEPTION 'CIRCUIT BREAKER: 3 falhas consecutivas sem atualização. Último resultado: %', v_resultado;
        END IF;

        RETURN;
    END IF;

    -- ===== SUCESSO: Resetar contador de erros =====
    UPDATE "Projeto"
    SET erro_count = 0,
        ultimo_erro = NULL,
        ultimo_erro_timestamp = NULL
    WHERE id = project_id;

    -- Continuar normalmente (agenda próxima execução)
END;
```

**Data de Implementação**: __________
**Testado**: [ ] Sim [ ] Não

---

### CHECKPOINT 3.2: Adicionar Timeout Adaptativo
**STATUS**: PENDENTE

**Modificar**: `05_analisar_comentarios_com_claude.sql`

**Substituir linha 189-192**:

```sql
-- CÓDIGO ATUAL
SELECT claude_complete(
    prompt_claude,
    'Voce e um ANALISTA DE MARKETING...',
    4000,
    0.3,
    300000  -- 300s fixo
) INTO resultado_claude;

-- NOVO CÓDIGO COM TIMEOUT ADAPTATIVO
DECLARE
    v_timeout INTEGER;
    v_comentarios_count INTEGER;
BEGIN
    -- Calcular timeout baseado em número de comentários
    -- Assumindo ~15s por comentário
    SELECT jsonb_array_length(comentarios_json) INTO v_comentarios_count;
    v_timeout := GREATEST(30000, v_comentarios_count * 15000);  -- Mínimo 30s
    v_timeout := LEAST(v_timeout, 600000);  -- Máximo 10min

    RAISE NOTICE 'Timeout calculado: %ms para % comentários', v_timeout, v_comentarios_count;

    SELECT claude_complete(
        prompt_claude,
        'Voce e um ANALISTA DE MARKETING...',
        4000,
        0.3,
        v_timeout
    ) INTO resultado_claude;
END;
```

**Data de Implementação**: __________
**Testado**: [ ] Sim [ ] Não

---

### CHECKPOINT 3.3: Adicionar Retry com Backoff Exponencial
**STATUS**: PENDENTE

**Modificar**: `06_claude_complete.sql`

**Adicionar após linha 45**:

```sql
DECLARE
    v_retry_count INTEGER := 0;
    v_max_retries INTEGER := 3;
    v_backoff_ms INTEGER;
BEGIN
    LOOP
        BEGIN
            -- Tentar chamada Claude
            SELECT * INTO http_response
            FROM http((...));

            -- Se sucesso, sair do loop
            IF http_response.status = 200 THEN
                EXIT;
            END IF;

            -- Se erro 429 (rate limit), fazer retry com backoff
            IF http_response.status = 429 THEN
                v_retry_count := v_retry_count + 1;

                IF v_retry_count > v_max_retries THEN
                    RAISE EXCEPTION 'Rate limit após % tentativas. Status: %, Body: %',
                                    v_max_retries, http_response.status, http_response.content;
                END IF;

                -- Backoff exponencial: 2^retry * 1000ms
                v_backoff_ms := (2 ^ v_retry_count) * 1000;
                RAISE NOTICE 'Rate limit (429). Retry % de % após %ms',
                             v_retry_count, v_max_retries, v_backoff_ms;

                PERFORM pg_sleep(v_backoff_ms / 1000.0);
                CONTINUE;
            END IF;

            -- Outros erros HTTP não fazem retry
            RAISE EXCEPTION 'API request failed. Status: %, Body: %',
                            http_response.status, http_response.content;

        EXCEPTION
            WHEN OTHERS THEN
                -- Se timeout ou erro de rede, fazer retry
                v_retry_count := v_retry_count + 1;

                IF v_retry_count > v_max_retries THEN
                    RAISE;  -- Re-throw exception
                END IF;

                v_backoff_ms := (2 ^ v_retry_count) * 1000;
                RAISE NOTICE 'Erro: %. Retry % de % após %ms',
                             SQLERRM, v_retry_count, v_max_retries, v_backoff_ms;

                PERFORM pg_sleep(v_backoff_ms / 1000.0);
        END;
    END LOOP;
END;
```

**Data de Implementação**: __________
**Testado**: [ ] Sim [ ] Não

---

## 📊 FASE 4: SISTEMA DE ERROS NA TABELA PROJETO

### Objetivo
Adicionar campos de tracking de erros para monitoramento e circuit breaking.

---

### CHECKPOINT 4.1: Adicionar Colunas na Tabela Projeto
**STATUS**: PENDENTE

```sql
-- Adicionar colunas de erro
ALTER TABLE "Projeto"
ADD COLUMN IF NOT EXISTS erro_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ultimo_erro TEXT,
ADD COLUMN IF NOT EXISTS ultimo_erro_timestamp TIMESTAMP;

-- Criar índice para queries de monitoramento
CREATE INDEX IF NOT EXISTS idx_projeto_erros
ON "Projeto"(erro_count)
WHERE erro_count > 0;
```

**Validação**:
```sql
-- Verificar colunas criadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Projeto'
  AND column_name IN ('erro_count', 'ultimo_erro', 'ultimo_erro_timestamp');
-- Deve retornar 3 linhas
```

**Data de Execução**: __________
**Resultado**: __________

---

### CHECKPOINT 4.2: Criar Tabela de Log de Erros
**STATUS**: PENDENTE

```sql
-- Criar tabela detalhada de logs
CREATE TABLE IF NOT EXISTS pipeline_error_log (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES "Projeto"(id),
    status TEXT,  -- Status do pipeline onde ocorreu erro
    function_name TEXT,  -- Nome da função que falhou
    error_message TEXT,  -- Mensagem de erro
    error_context JSONB,  -- Contexto adicional (IDs, params, etc)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_error_log_project
ON pipeline_error_log(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_log_function
ON pipeline_error_log(function_name, created_at DESC);
```

**Validação**:
```sql
-- Verificar tabela criada
SELECT table_name FROM information_schema.tables
WHERE table_name = 'pipeline_error_log';
```

**Data de Execução**: __________
**Resultado**: __________

---

### CHECKPOINT 4.3: Adicionar Logging de Erros
**STATUS**: PENDENTE

**Modificar**: Todas as funções principais para logar erros

**Exemplo em `02_process_comment_analysis_batch.sql`**:

```sql
-- Após detectar erro (após linha adicionada no CHECKPOINT 3.1)
IF v_resultado LIKE 'Erro%' THEN
    -- Log estruturado
    INSERT INTO pipeline_error_log (
        project_id,
        status,
        function_name,
        error_message,
        error_context
    ) VALUES (
        project_id,
        '4',  -- STATUS 4
        'process_comment_analysis_batch',
        v_resultado,
        jsonb_build_object(
            'comentarios_antes', v_comentarios_antes,
            'comentarios_depois', v_comentarios_depois,
            'batch_size', batch_size
        )
    );
END IF;
```

**Replicar para**:
- `04_atualizar_comentarios_analisados.sql`
- `05_analisar_comentarios_com_claude.sql`
- `06_claude_complete.sql`

**Data de Implementação**: __________
**Testado**: [ ] Sim [ ] Não

---

## 🔄 FASE 5: REATIVAÇÃO SEGURA DO TRIGGER

### Objetivo
Reativar trigger com proteções implementadas e monitoramento ativo.

---

### CHECKPOINT 5.1: Validação Pré-Reativação
**STATUS**: PENDENTE

**Checklist de Segurança**:
- [ ] Todas as travas de segurança implementadas (FASE 3)
- [ ] Campo de erros na tabela Projeto criado (FASE 4)
- [ ] Tabela de log de erros criada (FASE 4)
- [ ] Teste isolado passou (FASE 2)
- [ ] Pipeline manual funcionou até STATUS 4 (FASE 1)

**Validação**:
```sql
-- Verificar que não há jobs órfãos
SELECT COUNT(*) FROM cron.job WHERE jobname LIKE 'process_%';
-- Deve ser 0

-- Verificar que projeto está em status estável
SELECT id, status, erro_count
FROM "Projeto"
WHERE id = [PROJECT_ID];
-- erro_count deve ser 0 ou NULL
```

**Data de Validação**: __________
**Aprovado para Reativação**: [ ] Sim [ ] Não

---

### CHECKPOINT 5.2: Reativar Trigger com Monitoramento
**STATUS**: PENDENTE

```sql
-- Reativar trigger
ALTER TABLE "Projeto"
ENABLE TRIGGER trigger_schedule_process_project;
```

**Validação**:
```sql
-- Verificar trigger ativo
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_schedule_process_project';
-- tgenabled deve ser 'O' (enabled)
```

**Data de Execução**: __________
**Resultado**: __________

---

### CHECKPOINT 5.3: Teste Controlado
**STATUS**: PENDENTE

```sql
-- Resetar projeto para STATUS 4 (já validado)
UPDATE "Projeto"
SET status = '4',
    erro_count = 0
WHERE id = [PROJECT_ID];

-- Aguardar trigger criar job (7 segundos)
-- Verificar job criado
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname LIKE '%' || [PROJECT_ID];

-- Monitorar execuções por 5 minutos
SELECT
    j.jobname,
    jrd.status,
    jrd.start_time,
    jrd.end_time,
    jrd.return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname LIKE '%' || [PROJECT_ID]
ORDER BY jrd.start_time DESC
LIMIT 10;

-- Verificar se comentários estão sendo analisados
SELECT
    COUNT(*) FILTER (WHERE comentario_analizado = true) as analisados,
    COUNT(*) FILTER (WHERE comentario_analizado IS NULL OR comentario_analizado = false) as pendentes
FROM "Comentarios_Principais" cp
JOIN "Videos" v ON cp.video_id = v.id
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = [PROJECT_ID];
-- analisados deve AUMENTAR a cada execução
```

**Monitoramento (executar a cada 1 minuto por 5 minutos)**:

| Minuto | Analisados | Pendentes | Erros | Observações |
|--------|------------|-----------|-------|-------------|
| 0      | __________ | _________ | _____ | ____________|
| 1      | __________ | _________ | _____ | ____________|
| 2      | __________ | _________ | _____ | ____________|
| 3      | __________ | _________ | _____ | ____________|
| 4      | __________ | _________ | _____ | ____________|
| 5      | __________ | _________ | _____ | ____________|

**Resultado Esperado**: Analisados AUMENTA, Pendentes DIMINUI, Erros = 0

**Data de Execução**: __________
**Resultado**: [ ] Sucesso [ ] Falha
**Observações**: __________

---

## 📊 QUERIES DE MONITORAMENTO

### Monitorar Pipeline em Tempo Real

```sql
-- 1. Estado geral do projeto
SELECT
    p.id,
    p.status,
    p.erro_count,
    p.ultimo_erro,
    p.ultimo_erro_timestamp,
    (SELECT COUNT(*) FROM "Videos" v
     JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
     WHERE s."Projeto_id" = p.id) as total_videos,
    (SELECT COUNT(*) FROM "Comentarios_Principais" cp
     JOIN "Videos" v ON cp.video_id = v.id
     JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
     WHERE s."Projeto_id" = p.id) as total_comentarios,
    (SELECT COUNT(*) FROM "Comentarios_Principais" cp
     JOIN "Videos" v ON cp.video_id = v.id
     JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
     WHERE s."Projeto_id" = p.id AND comentario_analizado = true) as comentarios_analisados
FROM "Projeto" p
WHERE p.id = [PROJECT_ID];
```

```sql
-- 2. Últimos erros do pipeline
SELECT
    created_at,
    status,
    function_name,
    error_message,
    error_context
FROM pipeline_error_log
WHERE project_id = [PROJECT_ID]
ORDER BY created_at DESC
LIMIT 20;
```

```sql
-- 3. Histórico de jobs (últimas 50 execuções)
SELECT
    j.jobname,
    jrd.status,
    jrd.start_time,
    jrd.end_time,
    EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time)) as duration_seconds,
    left(jrd.return_message, 200) as message_preview
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname LIKE '%' || [PROJECT_ID]
ORDER BY jrd.start_time DESC
LIMIT 50;
```

```sql
-- 4. Taxa de sucesso (últimas 100 execuções)
SELECT
    j.jobname,
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE jrd.status = 'succeeded') as successful,
    COUNT(*) FILTER (WHERE jrd.status = 'failed') as failed,
    ROUND(100.0 * COUNT(*) FILTER (WHERE jrd.status = 'succeeded') / COUNT(*), 2) as success_rate
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname LIKE '%' || [PROJECT_ID]
  AND jrd.start_time > NOW() - INTERVAL '24 hours'
GROUP BY j.jobname;
```

```sql
-- 5. Progresso detalhado por vídeo
SELECT
    v.id,
    v.video_title,
    v.stats_atualizadas,
    v.comentarios_atualizados,
    v.is_relevant,
    (SELECT COUNT(*) FROM "Comentarios_Principais" WHERE video_id = v.id) as total_comments,
    (SELECT COUNT(*) FROM "Comentarios_Principais" WHERE video_id = v.id AND comentario_analizado = true) as analyzed_comments
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = [PROJECT_ID]
ORDER BY v.id
LIMIT 50;
```

```sql
-- 6. Comentários problemáticos (que podem estar causando loop)
-- Encontra comentários que não foram analisados apesar de múltiplas tentativas
WITH comment_stats AS (
    SELECT
        cp.id,
        cp.text_display,
        cp.comentario_analizado,
        v.video_title,
        (SELECT COUNT(*) FROM pipeline_error_log
         WHERE error_context->>'comment_id' = cp.id::text) as error_count
    FROM "Comentarios_Principais" cp
    JOIN "Videos" v ON cp.video_id = v.id
    JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
    WHERE s."Projeto_id" = [PROJECT_ID]
      AND (cp.comentario_analizado IS NULL OR cp.comentario_analizado = false)
)
SELECT * FROM comment_stats
WHERE error_count > 0
ORDER BY error_count DESC
LIMIT 20;
```

---

## 🆘 ROLLBACK PLAN

### Em Caso de Falha Crítica

#### Rollback Nível 1: Parar Pipeline Imediatamente

```sql
-- 1. Desativar trigger
ALTER TABLE "Projeto" DISABLE TRIGGER trigger_schedule_process_project;

-- 2. Remover TODOS os jobs
DO $$
DECLARE
    job_rec RECORD;
BEGIN
    FOR job_rec IN SELECT jobname FROM cron.job WHERE jobname LIKE 'process_%'
    LOOP
        PERFORM cron.unschedule(job_rec.jobname);
        RAISE NOTICE 'Removido: %', job_rec.jobname;
    END LOOP;
END $$;

-- 3. Marcar projeto com erro
UPDATE "Projeto"
SET erro_count = 999,
    ultimo_erro = 'ROLLBACK: Pipeline parado manualmente',
    ultimo_erro_timestamp = NOW()
WHERE id = [PROJECT_ID];
```

#### Rollback Nível 2: Reverter Mudanças de Código

```sql
-- Restaurar versões originais das funções (do backup)
-- Executar arquivos .sql de backup salvos na FASE 0
```

#### Rollback Nível 3: Reverter Schema

```sql
-- Remover colunas de erro (se necessário)
ALTER TABLE "Projeto"
DROP COLUMN IF EXISTS erro_count,
DROP COLUMN IF EXISTS ultimo_erro,
DROP COLUMN IF EXISTS ultimo_erro_timestamp;

-- Remover tabela de log
DROP TABLE IF EXISTS pipeline_error_log;
```

---

## ✅ CHECKLIST FINAL

### Antes de Considerar Debugging Completo

- [ ] Trigger desativado e backup salvo (FASE 0)
- [ ] Pipeline executado manualmente até STATUS 4 (FASE 1)
- [ ] Função problemática testada isoladamente (FASE 2)
- [ ] Travas de segurança implementadas (FASE 3)
- [ ] Sistema de erros implementado (FASE 4)
- [ ] Trigger reativado com sucesso (FASE 5)
- [ ] Monitoramento de 5 minutos sem erros (CHECKPOINT 5.3)
- [ ] Documentação atualizada com lições aprendidas
- [ ] Rollback plan testado (opcional mas recomendado)

### Lições Aprendidas (Preencher após conclusão)

**O que funcionou bem:**
_________________________________________

**O que poderia ser melhorado:**
_________________________________________

**Mudanças permanentes recomendadas:**
_________________________________________

---

## 📞 CONTATOS E SUPORTE

**Em caso de dúvidas:**
- Revisar este documento desde o início
- Verificar logs em `pipeline_error_log`
- Consultar queries de monitoramento
- Se necessário, voltar ao checkpoint anterior

**Manutenção Futura:**
- Executar queries de monitoramento semanalmente
- Limpar `pipeline_error_log` mensalmente (manter últimos 90 dias)
- Revisar `erro_count` dos projetos regularmente

---

**FIM DO PLANO DE DEBUGGING**

**Última Atualização**: 2025-10-16
**Versão**: 1.1
**Mudanças v1.1**: Adicionada FASE 0.5 (Criar Projeto de Teste) com estratégia de 1-2 keywords para minimizar custos e volume de dados
**Status**: Pronto para execução
