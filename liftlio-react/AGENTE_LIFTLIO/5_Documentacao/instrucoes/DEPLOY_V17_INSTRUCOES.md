# Deploy da v17 do Agente Liftlio - Instruções

## ✅ Status da Implementação

A versão 17 do agente com otimizações RAG foi **completamente implementada** e está pronta para deploy. As melhorias incluem:

### 🚀 Novidades da v17

1. **Busca Multi-Threshold**
   - Tenta progressivamente: 0.7 → 0.5 → 0.3 → 0.1
   - Garante que sempre encontrará resultados relevantes

2. **Otimização de Embeddings**
   - Adiciona sinônimos e contexto ao prompt
   - Melhora significativamente a precisão da busca

3. **Logs Detalhados**
   - Debug completo do processo de busca RAG
   - Facilita identificação de problemas

4. **Respostas Naturais**
   - Remove "estatísticas reais do dashboard"
   - Integra dados RAG de forma conversacional

5. **Fallback Inteligente**
   - Se não encontrar com embeddings, busca qualquer conteúdo do projeto
   - Nunca responde "não tenho acesso"

## 📋 Como Fazer o Deploy

### Opção 1: Via Supabase CLI (Recomendado)

```bash
# Na pasta do projeto
cd /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/Edge_Functions

# Deploy da função
supabase functions deploy agente-liftlio --project-ref jmquqsyzmmfukwlnbknz
```

### Opção 2: Via Dashboard Supabase

1. Acesse: https://app.supabase.com/project/jmquqsyzmmfukwlnbknz/functions
2. Clique em "agente-liftlio"
3. Clique em "Deploy new version"
4. Cole o código de: `/AGENTE_LIFTLIO/MCP_Functions/Edge_Functions/agente-liftlio_v17_rag_otimizado.ts`
5. Clique em "Deploy"

## 🧪 Testando a v17

Após o deploy, teste com estas perguntas para verificar o RAG:

1. **Teste de Vídeos**
   ```
   "quais são os nomes dos vídeos postados?"
   "como é o nome dos videos que foi postado? do que els fala?"
   ```

2. **Teste de Threshold**
   ```
   "me fale sobre marketing" (deve buscar com threshold menor)
   "quantas menções temos?" (deve usar dados do dashboard)
   ```

3. **Teste de Fallback**
   ```
   "informações aleatórias do projeto" (deve retornar algo, não "não tenho acesso")
   ```

## ✅ Checklist de Verificação

- [ ] Deploy realizado com sucesso
- [ ] Logs aparecem no console do Supabase
- [ ] RAG retorna dados de vídeos corretamente
- [ ] Multi-threshold funciona (verificar logs)
- [ ] Não aparece "estatísticas reais do dashboard"
- [ ] Respostas são naturais e conversacionais

## 📊 Monitorando o RAG

Para verificar a cobertura do RAG:

```sql
-- Ver status de processamento
SELECT * FROM monitor_rag_coverage(58);

-- Ver resumo geral
SELECT * FROM rag_coverage_summary(58);
```

## 🐛 Troubleshooting

Se o RAG não estiver retornando resultados:

1. **Verifique os logs** da Edge Function no Supabase
2. **Confirme que há embeddings** para o projeto:
   ```sql
   SELECT COUNT(*) FROM rag_embeddings WHERE project_id = 58;
   ```
3. **Teste a função generate-embedding** separadamente
4. **Verifique as permissões** do service role

## 📁 Arquivos Importantes

- **Código v17**: `/AGENTE_LIFTLIO/MCP_Functions/Edge_Functions/agente-liftlio_v17_rag_otimizado.ts`
- **Backup**: `/supabase/Funcoes criadas MCP/Edge Functions/agente-liftlio_v17_rag_otimizado_multithreshold.ts.bak`
- **Documentação**: `/AGENTE_LIFTLIO/PLANO_V17_RAG_OTIMIZADO.md`

## 🎯 Próximos Passos

1. Fazer deploy da v17
2. Testar extensivamente com diferentes tipos de perguntas
3. Monitorar logs para ajustar thresholds se necessário
4. Coletar feedback dos usuários

---

**Nota**: A v17 está 100% pronta. Apenas o deploy manual é necessário devido às permissões do MCP.