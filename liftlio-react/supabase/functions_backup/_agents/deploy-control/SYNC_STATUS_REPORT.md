# 📊 RELATÓRIO DE SINCRONIZAÇÃO: LOCAL vs LIVE
**Gerado em:** 2025-01-26
**Status:** ⚠️ CRÍTICO - DESSINCRONIZAÇÃO DETECTADA

---

## 🚨 EDGE FUNCTIONS - SITUAÇÃO CRÍTICA

### 📈 Números:
- **LIVE (Produção):** 20 Edge Functions
- **LOCAL (Docker):** 3 Edge Functions
- **FALTANDO:** 17 Edge Functions (85% dessincronizado!)

### ✅ Funções SINCRONIZADAS (3):
1. `Canal_youtube_dados` ✅
2. `retornar-ids-do-youtube` ✅ (nota: case diferente no LIVE)
3. `video-qualifier-wrapper` ✅

### ❌ Funções FALTANDO LOCALMENTE (17):
```
1. claude-proxy (v29)
2. stripe-payment (v22)
3. integracao-validacao (v36)
4. Dados-da-url (v33)
5. bright-function (v23)
6. Positive-trends (v27)
7. negative-trends (v20)
8. analyze-url (v29)
9. save-card (v50)
10. process-payment (v23)
11. create-checkout (v17)
12. agente-liftlio (v89) ← Mais atualizada!
13. generate-embedding (v12)
14. process-rag-batch (v12)
15. email-automation-engine (v17)
16. update-youtube-info (v15)
17. upload-image-to-storage (v12)
```

---

## 📝 SQL FUNCTIONS - STATUS DESCONHECIDO

**⚠️ ATENÇÃO:** Não foi feita verificação completa das 300+ SQL Functions
- Podem existir diferenças entre LOCAL e LIVE
- SEMPRE verificar antes de alterar (ver procedimento abaixo)

---

## 🛡️ NOVO PROTOCOLO DE SEGURANÇA

### ANTES de alterar QUALQUER função:

#### Para SQL Functions:
```bash
# 1. Verificar versão no banco local
docker exec -i supabase_db_Supabase psql -U postgres -d postgres -c \
  "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'nome_funcao';"

# 2. Comparar com arquivo em functions_backup/SQL_Functions/
diff <(cat functions_backup/SQL_Functions/nome_funcao.sql) \
     <(docker exec ... comando acima)

# 3. Se diferente, resolver ANTES de alterar!
```

#### Para Edge Functions:
```bash
# 1. Verificar se existe localmente
ls supabase/functions/nome-funcao/

# 2. Se não existir, precisa baixar do LIVE primeiro
# Task → supabase-mcp-expert → "get edge function nome-funcao content"

# 3. Salvar localmente antes de modificar
```

---

## 🎯 AÇÕES RECOMENDADAS

### URGENTE (Fazer AGORA):
1. **Sincronizar Edge Functions críticas**
   - `agente-liftlio` (v89 - mais importante)
   - `stripe-payment`, `save-card`, `process-payment` (pagamentos)
   - `email-automation-engine` (automação)

2. **Criar script de sincronização automática**
   ```bash
   # sync-edge-functions.sh
   # Baixar todas Edge Functions do LIVE para LOCAL
   ```

3. **Audit completo de SQL Functions**
   - Listar todas no LIVE
   - Comparar com LOCAL
   - Gerar relatório de diferenças

### MÉDIO PRAZO:
- Implementar CI/CD para manter sincronização
- Criar testes automatizados para cada função
- Documentar todas as funções

---

## 📌 REGRAS IMPLEMENTADAS NO AGENTE

O `supabase-local-expert` agora tem:

✅ **Verificação OBRIGATÓRIA antes de alterar**
- Sempre checa se local = banco
- Avisa se houver dessincronização
- Usa ultrathink para resolver conflitos

✅ **Suporte completo para Edge Functions**
- Templates de criação
- Comandos de teste local
- Workflow de backup e deploy

✅ **Lista de Edge Functions faltando**
- Sempre visível no agente
- Lembrete para sincronizar

---

## 💡 CONCLUSÃO

**Situação:** Sistema funciona mas está MUITO dessincronizado
**Risco:** Alto - mudanças podem sobrescrever versões importantes
**Solução:** Sincronização urgente + protocolo de verificação

**NUNCA ALTERAR SEM VERIFICAR PRIMEIRO!**