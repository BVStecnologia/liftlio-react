# Análise do Processamento RAG - Sistema Liftlio

## 📊 Status Atual do Processamento RAG

### Tabelas com Project ID Direto
| Tabela | Total Registros | Projetos | Não Processados | Prioridade |
|--------|-----------------|----------|-----------------|------------|
| Comentarios_Principais | 689 | 5 | 689 (100%) | ALTA |
| Mensagens | 689 | 4 | 558 (81%) | ALTA |
| Scanner de videos | 53 | 6 | 53 (100%) | MÉDIA |
| Canais do youtube | 29 | 4 | 29 (100%) | MÉDIA |
| Integrações | 5 | 5 | 5 (100%) | BAIXA |
| Notificacoes | 1 | 1 | 1 (100%) | BAIXA |

### Tabelas que Precisam JOIN
| Tabela | Total Registros | Projetos | Não Processados | Prioridade |
|--------|-----------------|----------|-----------------|------------|
| Respostas_Comentarios | 467 | 5 | 467 (100%) | MÉDIA |
| Videos_trancricao | 100 | 6 | 100 (100%) | MÉDIA |
| Videos | 96 | 6 | 86 (90%) | ALTA |
| Projeto | 6 | 6 | 4 (67%) | BAIXA |

### Tabelas de Pagamento (Opcionais)
- customers, cards, subscriptions, payments → Poucos registros, baixa prioridade

## 🎯 Estratégia de Processamento

### 1. **Ordem de Prioridade**
1. **Mensagens** (558 pendentes) - Core do sistema
2. **Comentarios_Principais** (689 pendentes) - Dados principais
3. **Videos** (86 pendentes) - Metadados importantes
4. **Respostas_Comentarios** (467 pendentes) - Complementar
5. **Videos_trancricao** (100 pendentes) - Conteúdo rico
6. Demais tabelas

### 2. **Considerações Técnicas**

#### Performance
- **Batch Size**: 50 registros por vez (evitar timeout)
- **Intervalo**: 100ms entre batches
- **Timeout**: 30s por batch

#### Campos para Embeddings
Para cada tabela, combinar campos relevantes:

**Mensagens**:
```
mensagem + justificativa + tipo_msg
```

**Comentarios_Principais**:
```
text_display + author_name + justificativa
```

**Videos**:
```
video_title + video_description + canal + ai_analysis_summary
```

**Respostas_Comentarios**:
```
text_display + author_name
```

**Videos_trancricao**:
```
Primeiros 1000 caracteres da transcrição
```

### 3. **Estrutura das Funções**

Cada função deve:
1. Buscar registros não processados (rag_processed = false)
2. Obter project_id (direto ou via JOIN)
3. Preparar conteúdo para embedding
4. Gerar embedding via Edge Function
5. Inserir em rag_embeddings
6. Marcar como processado
7. Commit a cada batch

### 4. **Monitoramento**

Queries para acompanhar progresso:
```sql
-- Status geral
SELECT 
    source_table,
    COUNT(*) as total,
    COUNT(DISTINCT project_id) as projetos
FROM rag_embeddings
GROUP BY source_table
ORDER BY total DESC;

-- Progresso por tabela
SELECT 
    'Mensagens' as tabela,
    COUNT(*) as total,
    COUNT(CASE WHEN rag_processed = true THEN 1 END) as processados,
    ROUND(COUNT(CASE WHEN rag_processed = true THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as percentual
FROM "Mensagens";
```

## 🚀 Próximos Passos

1. **Criar função prepare_rag_content para cada tabela**
   - Define campos a serem combinados
   - Limita tamanho do conteúdo
   - Formata para melhor busca

2. **Criar Edge Function process-rag-batch**
   - Processa múltiplos registros
   - Gerencia transações
   - Trata erros individualmente

3. **Configurar CRON**
   - Executar a cada 5 minutos
   - Processar tabelas em ordem de prioridade
   - Limitar execução a 2 minutos

4. **Dashboard de Monitoramento**
   - Taxa de processamento
   - Erros
   - Estatísticas por projeto

## ⚠️ Riscos e Mitigações

1. **Timeout em tabelas grandes**
   - Mitigação: Processar em batches pequenos

2. **Custo de API (OpenAI embeddings)**
   - Mitigação: Processar apenas conteúdo relevante
   - Estimativa: ~$0.50 para processar tudo

3. **Duplicação de embeddings**
   - Mitigação: UNIQUE constraint em (source_table, source_id, project_id)

4. **Dados órfãos (sem project_id)**
   - Mitigação: Queries com WHERE project_id IS NOT NULL

## 📈 Métricas de Sucesso

- [ ] 100% dos registros com rag_processed = true
- [ ] Tempo médio de busca < 200ms
- [ ] Taxa de erro < 1%
- [ ] Cobertura de todos os projetos ativos

---

**PRONTO PARA IMPLEMENTAÇÃO APÓS APROVAÇÃO**