# 🧪 Como Testar a Edge Function: retornar-ids-do-youtube

## 📍 URL da Função

```
https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/retornar-ids-do-youtube
```

---

## 🎯 Método 1: Teste via Dashboard Supabase (Recomendado)

### Passo a Passo:

1. Acesse: https://supabase.com/dashboard/project/suqjifkhmekcdflwowiw
2. Menu lateral: **Edge Functions**
3. Clique em: **retornar-ids-do-youtube**
4. Aba: **Invoke**
5. Cole o JSON de teste abaixo
6. Clique: **Send Request**

### JSON de Teste (Scanner 584 - Get More Customers):

```json
{
  "scannerId": 584
}
```

### Outros Scanners Disponíveis:

```json
{
  "scannerId": 583
}
```
**Scanner 583:** Shopify Sales (temas: aumento de vendas, marketing Shopify)

```json
{
  "scannerId": 402
}
```
**Scanner 402:** SEO Optimization (temas: ferramentas SEO, otimização)

---

## 🖥️ Método 2: Teste via cURL (Terminal)

### Com autenticação:

```bash
curl -X POST \
  https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/retornar-ids-do-youtube \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_ANON_KEY_AQUI" \
  -d '{"scannerId": 584}' \
  --max-time 150
```

### Sem autenticação (se função for pública):

```bash
curl -X POST \
  https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/retornar-ids-do-youtube \
  -H "Content-Type: application/json" \
  -d '{"scannerId": 584}' \
  --max-time 150
```

**Nota:** `--max-time 150` é necessário porque a função leva ~56 segundos para responder.

---

## 📊 Resposta Esperada (Sucesso)

```json
{
  "text": "sGnHyLfw68A,HwO7g5uHHYY",
  "success": true,
  "data": {
    "success": true,
    "video_ids": [
      "sGnHyLfw68A",
      "HwO7g5uHHYY"
    ],
    "video_ids_string": "sGnHyLfw68A,HwO7g5uHHYY",
    "selected_videos": [
      {
        "id": "sGnHyLfw68A",
        "title": "Find Clients Who Immediately Need Your Service",
        "channel": "Findymail",
        "channel_id": "UCEje7qcMmW7Ya4m8KWsfosQ",
        "engagement_rate": 5.04,
        "sample_comments": ["..."]
      },
      {
        "id": "HwO7g5uHHYY",
        "title": "My Favorite Marketing Strategy for Getting Clients in 48 Hours",
        "channel": "Adam Erhart",
        "channel_id": "UCKU0u3VbuYn0wD3CUr-Yn6A",
        "engagement_rate": 7.24,
        "sample_comments": ["..."]
      }
    ],
    "total_analyzed": 18
  },
  "processing_time_ms": 56632,
  "python_response_time_ms": 56615,
  "request_id": "e08e0093-272c-48d7-b249-8a6849550141",
  "timestamp": 1761654753566
}
```

### Campos Principais:

- **`text`**: String CSV com IDs dos vídeos (formato usado pelas funções SQL)
- **`success`**: `true` se operação foi bem-sucedida
- **`data.video_ids`**: Array com os 2 IDs selecionados
- **`data.selected_videos`**: Detalhes completos dos vídeos
- **`processing_time_ms`**: Tempo total de processamento (~56s)
- **`request_id`**: UUID para tracking do request

---

## ⚠️ Resposta Esperada (Erro de Timeout - RESOLVIDO)

**Antes da correção (timeout 50s):**
```json
{
  "text": "",
  "success": false,
  "error": "Signal timed out.",
  "request_id": "uuid",
  "processing_time_ms": 50000
}
```

**Agora com timeout 120s:** Esse erro NÃO deve mais ocorrer!

---

## 🔍 Validação dos Resultados

### ✅ Checklist de Sucesso:

- [ ] `success` = `true`
- [ ] `text` contém 2 IDs separados por vírgula (ex: "id1,id2")
- [ ] `data.video_ids` é um array com 2 elementos
- [ ] `processing_time_ms` entre 50000-60000ms (50-60 segundos)
- [ ] `data.selected_videos` contém 2 objetos com detalhes dos vídeos
- [ ] Cada vídeo tem: `id`, `title`, `channel`, `engagement_rate`, `sample_comments`

### ❌ Indicadores de Problema:

- `success` = `false`
- `error` contém "timeout" → Timeout ainda curto (reportar bug)
- `error` contém "Python server error" → Servidor Python offline
- `text` = "" ou `null` → Nenhum vídeo selecionado
- `data.video_ids.length` = 1 → Sistema retornando apenas 1 vídeo (bug)
- `processing_time_ms` > 120000ms → Timeout ocorreu

---

## ⏱️ Tempo de Resposta Normal

| Etapa | Tempo |
|-------|-------|
| **YouTube API calls** | ~15-20s |
| **Claude Haiku (pré-filtro)** | ~8-10s |
| **Claude Sonnet (seleção final)** | ~15-20s |
| **Processing overhead** | ~5-8s |
| **TOTAL** | **50-60 segundos** |

**Timeout configurado:** 240s (4 minutos - margem de segurança de 180s)

---

## 🛠️ Troubleshooting

### Problema: "Signal timed out"

**Causa:** Timeout de 50s era muito curto para a API que leva ~56s
**Solução:** ✅ Corrigido! Timeout aumentado para 120s (deploy em 28/10/2025)

### Problema: Retorna apenas 1 vídeo

**Causa:** Código anterior retornava `[:1]` ao invés de `[:2]`
**Solução:** ✅ Corrigido! Sistema agora retorna 2 vídeos (deploy em 28/10/2025)

### Problema: "Python server error"

**Causa:** Servidor Python offline ou inacessível
**Verificar:**
```bash
curl http://173.249.22.2:8000/health
```
**Esperado:** `{"status":"healthy","version":"5.0.0"}`

### Problema: Processing time > 120s

**Causa:** Servidor Python muito lento (possível sobrecarga)
**Ação:** Verificar logs do Docker no servidor VPS

---

## 📝 Logs no Supabase

Para visualizar logs em tempo real:

1. Dashboard → **Edge Functions**
2. Clique em **retornar-ids-do-youtube**
3. Aba: **Logs**
4. Invoque a função em outra aba
5. Observe os logs aparecerem

**Logs esperados:**
```
[uuid] ========== NEW REQUEST ==========
[uuid] Scanner ID received: 584
[uuid] Calling Python server at 173.249.22.2:8000/search...
[uuid] Python server responded in 56615ms
[uuid] Python response status: 200
[uuid] Video IDs extracted from 'text': sGnHyLfw68A,HwO7g5uHHYY
[uuid] Video count: 2
[uuid] Returning 2 video IDs: sGnHyLfw68A,HwO7g5uHHYY
[uuid] ========== END REQUEST ==========
```

---

## 🚀 Exemplo de Integração SQL

Como essa Edge Function é usada no pipeline:

```sql
-- Chamada da Edge Function
SELECT call_api_edge_function(
  'retornar-ids-do-youtube'::text,
  json_build_object('scannerId', 584)::jsonb
) AS result;

-- Extração dos IDs
SELECT (result->'text')::text AS video_ids_csv;
-- Retorna: "sGnHyLfw68A,HwO7g5uHHYY"
```

---

## 📊 Métricas de Performance

**Deploy atual:** 28/10/2025
**Versão:** 2.0 (timeout fix + 2 videos)

| Métrica | Valor |
|---------|-------|
| Timeout configurado | 120s |
| Tempo médio resposta | 56s |
| Margem de segurança | 64s (120-56) |
| Taxa de sucesso esperada | 100% |
| Vídeos retornados | 2 |

---

**Última atualização:** 28/10/2025
**Status:** ✅ Production Ready
