# 🎯 CHECKPOINT DO PIPELINE - 28/10/2025

## 📊 STATUS ATUAL

**Projeto em Teste:** ID 117 (Liftlio -)
**Status Atual:** 1 (STATUS 1 concluído parcialmente)
**Última Execução:** 28/10/2025 ~14:00

---

## ✅ STATUS COMPLETADOS

### STATUS 0 - Inicialização ✅
- **Data:** 28/10/2025
- **Resultado:** SUCESSO
- **Scanners inicializados:** 3/3
  - Scanner 583: "increase shopify sales" (rodada=1)
  - Scanner 584: "get more customers" (rodada=1)
  - Scanner 585: "grow online business fast" (rodada=1)

### STATUS 1 - Busca de Vídeos ⚠️ PARCIAL
- **Data:** 28/10/2025
- **Resultado:** PARCIAL (17 vídeos inseridos)
- **Execuções:**
  - process_next_project_scanner(117) executado 3x

**Vídeos Inseridos por Scanner:**
- Scanner 583: 7 vídeos ✅
- Scanner 584: 6 vídeos + 2 em cache ✅
- Scanner 585: 4 vídeos ✅
- **TOTAL:** 17 vídeos

**⚠️ PROBLEMA IDENTIFICADO:**
- Alguns scanners não retornaram vídeos em certas execuções
- Edge Function retornando erro 500: "Cannot read properties of undefined (reading 'error')"
- Possível timeout ainda muito curto (120s configurado)

---

## 🐛 PROBLEMA A INVESTIGAR

### Erro na Edge Function: `retornar-ids-do-youtube`

**Sintoma:**
```
Function responded with 500
Cannot read properties of undefined (reading 'error')
```

**Contexto:**
- Edge Function tem timeout de 120s (2 minutos)
- API Python demora ~56 segundos
- Margem de 64s parecia suficiente MAS usuário reporta timeouts

**Possíveis Causas:**
1. **Timeout muito apertado** → Sugestão: aumentar para 240s (4 minutos)
2. **Erro no tratamento de exceções** → Tentando acessar `.error` de objeto undefined
3. **API Python pode demorar mais que 56s** em alguns casos
4. **Edge Function pode ter outro timeout** (Supabase tem limites próprios)

**Linha do Erro:**
Provavelmente no bloco catch da Edge Function tentando acessar `error.error` ou similar.

---

## 📁 ARQUIVOS RELEVANTES

### Edge Function
```
/Users/valdair/Documents/Projetos/Liftlio/liftlio-react/supabase/functions/retornar-ids-do-youtube/index.ts
```

**Linha 80 - Timeout atual:**
```typescript
signal: AbortSignal.timeout(120000)  // 120s = 2 minutos
```

**CORREÇÃO NECESSÁRIA:**
```typescript
signal: AbortSignal.timeout(240000)  // 240s = 4 minutos
```

### Servidor Python
```
Servidor: 173.249.22.2:8000
Container: liftlio-youtube-search
Endpoint: POST /search
Payload: {"scannerId": 583}
```

### Documentação
```
/Users/valdair/Documents/Projetos/Liftlio/liftlio-react/supabase/functions/retornar-ids-do-youtube/TESTE.md
```

---

## 🔧 AÇÕES NECESSÁRIAS

### 1. Aumentar Timeout Edge Function
- [x] Identificar linha do timeout (linha 80)
- [ ] Aumentar de 120s → 240s (4 minutos)
- [ ] Corrigir tratamento de erros (verificar acesso a propriedades undefined)
- [ ] Deploy da correção
- [ ] Testar com scanner que falhou

### 2. Investigar Erro de Tratamento
- [ ] Revisar bloco catch da Edge Function
- [ ] Garantir que `error` não seja undefined antes de acessar propriedades
- [ ] Adicionar logs mais detalhados

### 3. Validar API Python
- [ ] Testar diretamente no servidor: `curl http://173.249.22.2:8000/search`
- [ ] Verificar tempo real de resposta
- [ ] Confirmar se retorna 2 IDs sempre

### 4. Re-executar STATUS 1
- [ ] Resetar scanners: `UPDATE "Scanner" SET rodada=1 WHERE "Projeto_id"=117`
- [ ] Limpar vídeos duplicados (se necessário)
- [ ] Re-executar com timeout corrigido
- [ ] Confirmar 2 IDs por scanner (6 vídeos total esperado)

---

## 📊 DADOS DO PROJETO 117

```sql
-- Verificar projeto
SELECT id, nome, status, palavra_chave, percentual_mencoes_produto
FROM "Projeto" WHERE id = 117;

-- Verificar scanners
SELECT id, palavra_chave, rodada, video_id_cache, ultimo_processamento
FROM "Scanner" WHERE "Projeto_id" = 117;

-- Verificar vídeos inseridos
SELECT COUNT(*) as total,
       MIN(created_at) as primeiro,
       MAX(created_at) as ultimo
FROM "Video" WHERE "Projeto_id" = 117;

-- Distribuição por scanner
SELECT s.palavra_chave, COUNT(v.id) as videos_count
FROM "Video" v
JOIN "Scanner" s ON s.id = v."Scanner_id"
WHERE v."Projeto_id" = 117
GROUP BY s.palavra_chave;
```

---

## 🎯 PRÓXIMOS PASSOS (APÓS CORREÇÃO)

### STATUS 2 - Coletar Stats e Comentários
- **Função:** `update_video_stats(117, 10)` + `start_video_processing(117)`
- **Tempo estimado:** 30-120 minutos
- **O que faz:** Busca views, likes, comment_count e TODOS os comentários

### STATUS 3 - Analisar Vídeos com Claude
- **Função:** `start_video_analysis_processing(117, 5)`
- **Tempo estimado:** 60-180 minutos
- **O que faz:** Análise de relevância, tópicos, sentimento

### STATUS 4 - Analisar Comentários (PICS)
- **Função:** `start_comment_analysis_processing(117, 10)`
- **Tempo estimado:** 120-300 minutos
- **O que faz:** Lead scoring com metodologia PICS

### STATUS 5 - Criar Mensagens de Engagement
- **Função:** `start_engagement_messages_processing(117, 5)`
- **Tempo estimado:** 3-10 minutos
- **O que faz:** Gerar mensagens com timestamps da transcrição

### STATUS 6 - Agendar e Postar
- **Função:** `agendar_postagens_todos_projetos()`
- **Tempo estimado:** < 1 minuto
- **O que faz:** Distribuir postagens ao longo do dia

---

## 📝 NOTAS IMPORTANTES

1. **Timeout Edge Function Supabase:**
   - Plano Free: 60s
   - Plano Pro: 500s
   - Plano Enterprise: 900s
   - **Verificar qual plano estamos usando!**

2. **API Python Performance:**
   - Teste direto mostrou ~56s
   - Mas pode variar com carga do servidor
   - Claude API pode demorar mais em horários de pico

3. **Sistema de 2 vídeos:**
   - YouTube Search Engine configurado para retornar 2 IDs
   - Código atualizado em 28/10/2025
   - Commits: 392fa76, 2fe908d, a24248e

4. **Cache de IDs:**
   - Scanner 584 tem 2 IDs em cache: "HwO7g5uHHYY,eL79vzNn78U"
   - Normal quando há mais vídeos disponíveis
   - Serão usados na próxima rodada

---

## 🔍 DEBUGGING

### Testar Edge Function Diretamente

**Via Supabase Dashboard:**
```
URL: https://supabase.com/dashboard/project/suqjifkhmekcdflwowiw/functions
Function: retornar-ids-do-youtube
Body: {"scannerId": 583}
```

**Via cURL:**
```bash
curl -X POST \
  https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/retornar-ids-do-youtube \
  -H "Content-Type: application/json" \
  -d '{"scannerId": 583}' \
  --max-time 300
```

### Testar API Python Diretamente

```bash
ssh -i ~/.ssh/contabo_key root@173.249.22.2 \
  "curl -X POST http://localhost:8000/search \
   -H 'Content-Type: application/json' \
   -d '{\"scannerId\": 583}' \
   --max-time 120"
```

### Ver Logs da Edge Function

```
Dashboard → Edge Functions → retornar-ids-do-youtube → Logs
```

Procurar por:
- Request ID
- Timeout errors
- "Cannot read properties of undefined"
- Python response time

---

## 📞 CONTATO E REFERÊNCIAS

**Documentação Pipeline:**
- `/liftlio-react/supabase/functions_backup/SQL_Functions/PIPELINE_PROCESSOS/`

**YouTube Search Engine:**
- `/Servidor/youtube-search-engine/`
- `IMPROVEMENTS_CHANGELOG.md`

**Commits Relevantes:**
- `392fa76`: Increase video selection 1 → 2
- `2fe908d`: Update Claude prompt for 2 videos
- `a24248e`: Increase timeout 50s → 120s

---

**Última Atualização:** 28/10/2025 14:30
**Responsável:** Claude Code + Valdair
**Status:** ⚠️ PAUSADO - Aguardando correção de timeout
