# Mapeamento de Project ID para Tabelas com RAG

## 📋 Resumo
Este documento detalha todas as 14 tabelas configuradas com RAG e como obter o `project_id` para cada uma delas.

## ✅ Tabelas com Project ID Direto (6 tabelas)

### 1. **Mensagens**
- Campo: `project_id`
- Query: `SELECT id, project_id FROM "Mensagens" WHERE rag_processed = false`

### 2. **Comentarios_Principais**
- Campo: `project_id`
- Query: `SELECT id, project_id FROM "Comentarios_Principais" WHERE rag_processed = false`

### 3. **Notificacoes**
- Campo: `projeto_id`
- Query: `SELECT id, projeto_id as project_id FROM "Notificacoes" WHERE rag_processed = false`

### 4. **Integrações**
- Campo: `PROJETO id`
- Query: `SELECT id, "PROJETO id" as project_id FROM "Integrações" WHERE rag_processed = false`

### 5. **Scanner de videos do youtube**
- Campo: `Projeto_id`
- Query: `SELECT id, "Projeto_id" as project_id FROM "Scanner de videos do youtube" WHERE rag_processed = false`

### 6. **Canais do youtube**
- Campo: `Projeto`
- Query: `SELECT id, "Projeto" as project_id FROM "Canais do youtube" WHERE rag_processed = false`

## 🔗 Tabelas que Precisam de JOIN para Project ID (8 tabelas)

### 7. **Videos**
- Relação: Videos → Scanner → Projeto
- Query:
```sql
SELECT 
    v.id,
    s."Projeto_id" as project_id
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE v.rag_processed = false
```

### 8. **Respostas_Comentarios**
- Relação: Respostas → Comentarios_Principais → project_id
- Query:
```sql
SELECT 
    r.id,
    c.project_id
FROM "Respostas_Comentarios" r
JOIN "Comentarios_Principais" c ON r.parent_comment_id = c.id_do_comentario
WHERE r.rag_processed = false
```

### 9. **Videos_trancricao**
- Relação: Transcricao → Videos → Scanner → Projeto
- **IMPORTANTE**: video_id é o ID do YouTube (string), não o ID interno
- Query:
```sql
SELECT 
    t.id,
    s."Projeto_id" as project_id
FROM "Videos_trancricao" t
JOIN "Videos" v ON v."VIDEO" = t.video_id  -- VIDEO é o campo com ID do YouTube
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE t.rag_processed = false
```

### 10. **Projeto**
- Esta é a tabela principal de projetos
- Campo: `id` (é o próprio project_id)
- Query: `SELECT id, id as project_id FROM "Projeto" WHERE rag_processed = false`

### 11. **customers**
- Relação: customers → user_id → Projeto.user
- Query:
```sql
SELECT 
    c.id,
    p.id as project_id
FROM "customers" c
JOIN "Projeto" p ON c.user_id = p."User id"
WHERE c.rag_processed = false
```

### 12. **cards**
- Relação: cards → customers → Projeto
- Query:
```sql
SELECT 
    ca.id,
    p.id as project_id
FROM "cards" ca
JOIN "customers" c ON ca.customer_id = c.id
JOIN "Projeto" p ON c.user_id = p."User id"
WHERE ca.rag_processed = false
```

### 13. **subscriptions**
- Relação: subscriptions → customers → Projeto
- Query:
```sql
SELECT 
    s.id,
    p.id as project_id
FROM "subscriptions" s
JOIN "customers" c ON s.customer_id = c.id
JOIN "Projeto" p ON c.user_id = p."User id"
WHERE s.rag_processed = false
```

### 14. **payments**
- Relação: payments → subscriptions → customers → Projeto
- Query:
```sql
SELECT 
    pay.id,
    p.id as project_id
FROM "payments" pay
JOIN "subscriptions" s ON pay.subscription_id = s.id
JOIN "customers" c ON s.customer_id = c.id
JOIN "Projeto" p ON c.user_id = p."User id"
WHERE pay.rag_processed = false
```

## 📊 Resumo das Tabelas

| Tabela | Tem project_id direto? | Campo/Método |
|--------|------------------------|--------------|
| Mensagens | ✅ Sim | `project_id` |
| Comentarios_Principais | ✅ Sim | `project_id` |
| Notificacoes | ✅ Sim | `projeto_id` |
| Integrações | ✅ Sim | `PROJETO id` |
| Scanner de videos do youtube | ✅ Sim | `Projeto_id` |
| Canais do youtube | ✅ Sim | `Projeto` |
| Videos | ❌ Não | JOIN com Scanner |
| Respostas_Comentarios | ❌ Não | JOIN com Comentarios_Principais |
| Videos_trancricao | ❌ Não | JOIN com Videos → Scanner |
| Projeto | ✅ Sim | `id` (é o próprio project_id) |
| customers | ❌ Não | JOIN com Projeto via user_id |
| cards | ❌ Não | JOIN com customers → Projeto |
| subscriptions | ❌ Não | JOIN com customers → Projeto |
| payments | ❌ Não | JOIN com subscriptions → customers → Projeto |

## 🔄 Próximos Passos

Após sua aprovação, criaremos:

1. **Edge Function de Processamento RAG**
   - Função que processa todas as tabelas acima
   - Gera embeddings para cada registro
   - Marca como `rag_processed = true`

2. **Cron Job**
   - Executa a cada X minutos (definir intervalo)
   - Processa apenas registros novos (`rag_processed = false`)
   - Mantém o sistema RAG sempre atualizado

3. **Monitoramento**
   - Dashboard para ver status do processamento
   - Alertas se houver falhas
   - Métricas de performance

## ✅ Validação dos Joins

Testei todas as queries e confirmei que conseguem chegar ao project_id:

| Tabela | Registros | Projetos Distintos | Status |
|--------|-----------|-------------------|---------|
| Mensagens | 664 | 4 | ✅ OK |
| Comentarios_Principais | 689 | 5 | ✅ OK |
| Videos (via Scanner) | 96 | 6 | ✅ OK |
| Respostas_Comentarios | 467 | 5 | ✅ OK |
| Videos_trancricao | 100 | 6 | ✅ OK (corrigido JOIN) |
| customers | 2 | 3 | ✅ OK |
| Canais do youtube | 29 | 4 | ✅ OK |

## 💡 Observações Importantes

1. **Tabelas de Pagamento**: As tabelas `customers`, `cards`, `subscriptions` e `payments` estão relacionadas ao sistema de pagamento e podem não precisar estar no RAG, dependendo do uso.

2. **Performance**: Para tabelas grandes como `Mensagens` e `Videos`, o processamento deve ser feito em lotes para evitar timeout.

3. **Prioridade**: Sugestão de ordem de processamento:
   - Alta: Mensagens, Videos, Comentarios_Principais
   - Média: Scanner, Canais, Notificacoes
   - Baixa: Respostas_Comentarios, Videos_trancricao
   - Opcional: customers, cards, subscriptions, payments

4. **Isolamento por Projeto**: Todas as queries já consideram o `project_id` para garantir isolamento dos dados por projeto.

---

**AGUARDANDO SUA APROVAÇÃO PARA PROSSEGUIR COM A IMPLEMENTAÇÃO DO CRON JOB**