# 📁 Edge_Functions (Calls)

**Responsabilidade**: Wrappers SQL para chamar Edge Functions do Supabase
**Sistema**: Infraestrutura (usado por ambos sistemas)
**Última atualização**: 2025-09-30 - Claude Code (Anthropic)

---

## 🎯 PROPÓSITO

Este conjunto de funções SQL serve como **interface** entre o banco de dados e as Edge Functions:
- Chamadas HTTP para Edge Functions
- Transformação de parâmetros SQL → JSON
- Tratamento de erros e timeouts
- Logging de chamadas (opcional)

**IMPORTANTE**: Estas são funções SQL que CHAMAM Edge Functions, não são as Edge Functions em si.

---

## 📊 FUNÇÕES DISPONÍVEIS

### 🔵 call_api_edge_function.sql
- **Descrição**: Wrapper genérico para chamar qualquer Edge Function via HTTP
- **Parâmetros**:
  - `p_function_name` (TEXT) - Nome da Edge Function
  - `p_payload` (JSONB) - Dados a enviar
  - `p_method` (TEXT opcional) - HTTP method (default: POST)
- **Retorna**: JSONB com resposta da Edge Function
- **Usado por**: Outras funções que precisam chamar Edge Functions
- **Chama**: Edge Functions via `http.post` ou `http.get`
- **Tabelas afetadas**:
  - Opcionalmente `"api_calls_log"` (se logging habilitado)

### 🔵 call_youtube_channel_details.sql
- **Descrição**: Busca detalhes completos de um canal YouTube via API
- **Parâmetros**:
  - `p_channel_id` (TEXT) - ID do canal no YouTube
  - `p_project_id` (INTEGER opcional) - Para usar token do projeto
- **Retorna**: JSONB com dados do canal (subscriber_count, video_count, etc)
- **Usado por**:
  - `processar_novos_canais_youtube()`
  - Processos de atualização de canais
- **Chama**: Edge Function `youtube-channel-details`
- **Tabelas afetadas**: Nenhuma (apenas leitura via API)

### 🔵 call_youtube_channel_monitor.sql
- **Descrição**: Monitora canal e busca vídeos recentes via API YouTube
- **Parâmetros**:
  - `p_channel_id` (TEXT) - ID do canal
  - `p_max_results` (INTEGER opcional) - Limite de vídeos (default: 50)
  - `p_published_after` (TIMESTAMP opcional) - Filtro temporal
- **Retorna**: JSONB array com vídeos encontrados
- **Usado por**:
  - `verificar_novos_videos_youtube()`
  - Sistema de monitoramento de canais top
- **Chama**: Edge Function `youtube-channel-monitor`
- **Tabelas afetadas**: Nenhuma diretamente (dados para posterior INSERT)

---

## 🔗 FLUXO DE INTERLIGAÇÃO

```
Função SQL precisa dados da API YouTube:
  ↓
call_api_edge_function('youtube-xxx', payload)
  ├─→ Monta requisição HTTP
  ├─→ Adiciona headers (Authorization, Content-Type)
  ├─→ POST/GET para https://[project].supabase.co/functions/v1/youtube-xxx
  ├─→ Aguarda resposta (timeout: 30s)
  └─→ Retorna JSONB com resultado

Exemplos específicos:

processar_novos_canais_youtube()
  └─→ call_youtube_channel_details(channel_id)
        └─→ Edge Function: youtube-channel-details
              └─→ YouTube Data API v3: channels.list()

verificar_novos_videos_youtube()
  └─→ call_youtube_channel_monitor(channel_id, 50)
        └─→ Edge Function: youtube-channel-monitor
              └─→ YouTube Data API v3: search.list()
```

---

## 📋 DEPENDÊNCIAS

### Funções externas necessárias:
- `get_secret()` - Para buscar API keys do Vault
- `http.post()` / `http.get()` - Extensão HTTP do PostgreSQL

### Tabelas do Supabase:
- Nenhuma diretamente
- Opcionalmente `"api_calls_log"` para logging

### Edge Functions reais (Deno):
- `youtube-channel-details` - Busca dados de canal
- `youtube-channel-monitor` - Busca vídeos de canal
- Outras Edge Functions YouTube conforme necessário

### APIs Externas:
- YouTube Data API v3 (via Edge Functions)

### Secrets (Vault):
- `YOUTUBE_API_KEY` - API key do Google Cloud
- Ou tokens OAuth dos projetos

---

## ⚙️ CONFIGURAÇÕES & VARIÁVEIS

- **Base URL**: `https://[project_ref].supabase.co/functions/v1/`
- **Timeout**: 30 segundos por chamada (configurável)
- **Retry**: Algumas funções podem implementar retry logic
- **Headers padrão**:
  - `Content-Type: application/json`
  - `Authorization: Bearer [anon_key]`

---

## 🚨 REGRAS DE NEGÓCIO

1. **Timeout obrigatório**: Sempre definir timeout para evitar hang
2. **Tratamento de erro**: Capturar exceções e retornar JSONB com erro
3. **Logging opcional**: Log apenas chamadas críticas para não poluir DB
4. **Rate limiting**: Respeitar limites da YouTube API (10.000 units/dia)
5. **Retry estratégico**: Retry apenas em erros 5xx, não em 4xx
6. **Formato consistente**: Sempre retornar JSONB, mesmo em erro

---

## 🧪 COMO TESTAR

```sql
-- Teste 1: Buscar detalhes de um canal (usando API key)
SELECT call_youtube_channel_details('UCxxxxxxxxxxxxx');

-- Teste 2: Monitorar canal e buscar vídeos recentes
SELECT call_youtube_channel_monitor('UCxxxxxxxxxxxxx', 10);

-- Teste 3: Chamada genérica para Edge Function custom
SELECT call_api_edge_function(
    'minha-funcao',
    '{"param1": "valor", "param2": 123}'::JSONB,
    'POST'
);

-- Teste 4: Testar tratamento de erro (canal inválido)
SELECT call_youtube_channel_details('CANAL_INVALIDO');

-- Teste 5: Ver logs de chamadas (se logging habilitado)
SELECT
    function_name,
    status_code,
    response_time_ms,
    created_at
FROM "api_calls_log"
WHERE function_name LIKE 'youtube-%'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🐛 TROUBLESHOOTING

### Erro: "Edge Function timeout"
```sql
-- Solução: Aumentar timeout ou otimizar Edge Function
-- Verificar logs da Edge Function:
SELECT * FROM edge_logs WHERE function_name = 'youtube-xxx'
ORDER BY timestamp DESC LIMIT 10;
```

### Erro: "YouTube API quota exceeded"
```sql
-- Solução: Verificar consumo diário
-- API YouTube tem limite de 10.000 units/dia
-- 1 search.list() = 100 units
-- 1 channels.list() = 1 unit
```

### Erro: "Invalid API key"
```sql
-- Solução: Verificar secret no Vault
SELECT get_secret('YOUTUBE_API_KEY');
-- Se NULL ou expirado, atualizar no Supabase Dashboard
```

---

## 📝 CHANGELOG

### 2025-09-30 - Claude Code
- Reorganização inicial: já existia subpasta Edge_Functions/
- Criação deste README.md
- Total de funções: 3 wrappers SQL
- Status: Todas funcionais
- Edge Functions reais estão em: `/supabase/functions/`

---

## ⚠️ REGRA OBRIGATÓRIA

**SEMPRE que modificar qualquer função nesta pasta:**

1. ✅ Atualizar este README.md
2. ✅ Atualizar seção "Última atualização"
3. ✅ Adicionar entrada no CHANGELOG
4. ✅ Revisar "FLUXO DE INTERLIGAÇÃO" se mudou
5. ✅ Atualizar "DEPENDÊNCIAS" se mudou
6. ✅ Atualizar "COMO TESTAR" se interface mudou
7. ✅ **Documentar Edge Function real** (se nova)
8. ✅ Testar com dados reais (cuidado com quotas!)
