# 📁 01_Gestão_Canais

**Responsabilidade**: Descoberta, registro e manutenção de canais do YouTube no sistema
**Sistema**: Ambos (Descoberta + Monitoramento)
**Última atualização**: 2025-09-30 - Claude Code (Anthropic)

---

## 🎯 PROPÓSITO

Este conjunto de funções gerencia o ciclo completo de canais do YouTube:
- Descoberta automática de novos canais relevantes
- Registro no banco de dados
- Atualização de status ativo/inativo
- Queries de consulta e detalhes

É usado tanto pelo Sistema Descoberta (scanner) quanto pelo Sistema Monitoramento (top canais).

---

## 📊 FUNÇÕES DISPONÍVEIS

### 🔵 adicionar_canais_automaticamente.sql
- **Descrição**: Adiciona canais automaticamente baseado em regras de negócio
- **Parâmetros**: Varia por implementação
- **Retorna**: JSONB com resultado da operação
- **Usado por**: Processos de descoberta automática
- **Chama**: Funções de inserção em tabelas de canais
- **Tabelas afetadas**:
  - `"Canais do youtube"` (INSERT)
  - `"Canais do youtube_Projeto"` (INSERT para associação)

### 🔵 atualizar_canais_ativos.sql
- **Descrição**: Atualiza status ativo/inativo dos canais baseado em atividade
- **Parâmetros**: Nenhum (processa todos canais)
- **Retorna**: INTEGER (quantidade de canais atualizados)
- **Usado por**: CRON jobs periódicos
- **Chama**: Nenhuma função externa
- **Tabelas afetadas**:
  - `"Canais do youtube"` (UPDATE: ativo)

### 🔵 obter_canais_nao_registrados.sql
- **Descrição**: Lista canais descobertos mas ainda não registrados no banco
- **Parâmetros**: Pode receber filtros opcionais
- **Retorna**: TABLE com dados dos canais
- **Usado por**: Processos de validação e registro manual
- **Chama**: Nenhuma função externa
- **Tabelas afetadas**:
  - Tabelas temporárias de descoberta (SELECT)

### 🔵 processar_novos_canais_youtube.sql
- **Descrição**: Processa fila de canais recém descobertos, valida e registra
- **Parâmetros**: Pode receber limite de processamento
- **Retorna**: JSONB com estatísticas (processados, erros)
- **Usado por**: CRON jobs, processamento em batch
- **Chama**:
  - Edge Functions para buscar dados da API YouTube
  - Funções de validação
- **Tabelas afetadas**:
  - `"Canais do youtube"` (INSERT)
  - `"Canais do youtube_Projeto"` (INSERT)

### 🔵 get_channel_details.sql
- **Descrição**: Retorna detalhes completos de um canal específico
- **Parâmetros**:
  - `p_channel_id` (TEXT) - ID do canal no YouTube
- **Retorna**: JSONB com todos dados do canal
- **Usado por**: Frontend, dashboards, APIs
- **Chama**: Nenhuma função externa
- **Tabelas afetadas**:
  - `"Canais do youtube"` (SELECT)

### 🔵 obter_canal_e_videos.sql
- **Descrição**: Retorna canal + lista de vídeos associados
- **Parâmetros**:
  - `p_channel_id` (TEXT ou BIGINT) - ID do canal
- **Retorna**: JSONB com canal e array de vídeos
- **Usado por**: Páginas de detalhes de canal
- **Chama**: Nenhuma função externa
- **Tabelas afetadas**:
  - `"Canais do youtube"` (SELECT)
  - `"Videos"` (SELECT WHERE Canais = canal_id)

### 🔵 obter_dados_projeto_por_canal.sql
- **Descrição**: Retorna dados do projeto associado ao canal
- **Parâmetros**:
  - `p_channel_id` (BIGINT) - ID do canal
- **Retorna**: JSONB com dados do projeto
- **Usado por**: Workflows que precisam contexto do projeto
- **Chama**: Nenhuma função externa
- **Tabelas afetadas**:
  - `"Canais do youtube_Projeto"` (SELECT)
  - `"Projeto"` (SELECT via JOIN)

---

## 🔗 FLUXO DE INTERLIGAÇÃO

```
Scanner/Monitor → Descobre novo canal
  ↓
obter_canais_nao_registrados()
  ├─→ Lista canais pendentes
  ↓
processar_novos_canais_youtube()
  ├─→ Para cada canal:
  │     ├─→ Busca dados via API YouTube
  │     ├─→ Valida informações
  │     └─→ INSERT em "Canais do youtube"
  ↓
adicionar_canais_automaticamente()
  └─→ Associa canal ao projeto (Canais do youtube_Projeto)

CRON periódico:
  └─→ atualizar_canais_ativos()
        └─→ Verifica atividade recente
              └─→ UPDATE status ativo/inativo

Queries de consulta (independentes):
├─→ get_channel_details(channel_id)
├─→ obter_canal_e_videos(channel_id)
└─→ obter_dados_projeto_por_canal(channel_id)
```

---

## 📋 DEPENDÊNCIAS

### Funções externas necessárias:
- Edge Functions YouTube API (para buscar dados de canais)
- Funções de validação (se existirem)

### Tabelas do Supabase:
- `"Canais do youtube"` - [INSERT, SELECT, UPDATE: ativo, dados do canal]
- `"Canais do youtube_Projeto"` - [INSERT, SELECT: associação canal-projeto]
- `"Videos"` - [SELECT: vídeos do canal]
- `"Projeto"` - [SELECT: dados do projeto]

### Edge Functions:
- `youtube-channel-details` - Busca dados completos de um canal via API

---

## ⚙️ CONFIGURAÇÕES & VARIÁVEIS

- `Canais do youtube.ativo` - Boolean indicando se canal está ativo
- `Canais do youtube.channel_id` - ID único do canal no YouTube
- `Canais do youtube_Projeto.rank_position` - Posição no ranking (usado pelo monitoramento)
- `Canais do youtube_Projeto.ranking_score` - Score de relevância do canal

---

## 🚨 REGRAS DE NEGÓCIO

1. **Canal único**: Não pode haver duplicatas de `channel_id`
2. **Associação projeto**: Canal deve estar associado a pelo menos 1 projeto
3. **Status ativo**: Canal sem vídeos há 90+ dias → `ativo = false`
4. **Validação API**: Antes de registrar, buscar dados reais da API YouTube
5. **Ranking automático**: Ao adicionar canal, calcular rank_position baseado em métricas

---

## 🧪 COMO TESTAR

```sql
-- Teste 1: Ver canais não registrados
SELECT * FROM obter_canais_nao_registrados();

-- Teste 2: Processar novos canais (limite 5)
SELECT processar_novos_canais_youtube(5);

-- Teste 3: Atualizar status ativo de todos canais
SELECT atualizar_canais_ativos();

-- Teste 4: Detalhes de um canal específico
SELECT get_channel_details('UCxxxxxxxxxxxxx');

-- Teste 5: Canal + seus vídeos
SELECT obter_canal_e_videos('UCxxxxxxxxxxxxx');

-- Teste 6: Projeto associado ao canal
SELECT obter_dados_projeto_por_canal(123);

-- Teste 7: Ver canais inativos
SELECT channel_id, "Nome", ativo, ultima_atualizacao
FROM "Canais do youtube"
WHERE ativo = false
ORDER BY ultima_atualizacao DESC;
```

---

## 📝 CHANGELOG

### 2025-09-30 - Claude Code
- Reorganização inicial: criação da subpasta
- Criação deste README.md
- Total de funções: 7
- Status: Todas funcionais

---

## ⚠️ REGRA OBRIGATÓRIA

**SEMPRE que modificar qualquer função nesta pasta:**

1. ✅ Atualizar este README.md
2. ✅ Atualizar seção "Última atualização"
3. ✅ Adicionar entrada no CHANGELOG
4. ✅ Revisar "FLUXO DE INTERLIGAÇÃO" se mudou
5. ✅ Atualizar "DEPENDÊNCIAS" se mudou
6. ✅ Atualizar "COMO TESTAR" se interface mudou
