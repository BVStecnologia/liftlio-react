# 📊 Tabelas Configuradas para RAG

## Campos RAG em Todas as Tabelas

Cada tabela possui:
- `rag_processed` (BOOLEAN) - Se foi processado
- `rag_processed_at` (TIMESTAMP) - Quando foi processado

## Detalhamento por Tabela

### 1. Videos_trancricao (211 registros)
**Conteúdo**: Transcrições completas dos vídeos
**Campos para embedding**:
- transcricao

**Uso no agente**: Responder perguntas sobre conteúdo específico dos vídeos

---

### 2. Comentarios_Principais (690 registros)
**Conteúdo**: Comentários em vídeos monitorados
**Campos para embedding**:
- comentario

**Metadata**:
- video_id
- canal_id
- sentiment
- autor

**Uso no agente**: Análise de sentimentos, tendências, feedback

---

### 3. Mensagens (688 registros)
**Conteúdo**: Mensagens do sistema
**Campos para embedding**:
- mensagem

**Metadata**:
- project_id
- user_id
- tipo

**Uso no agente**: Histórico de interações, contexto do projeto

---

### 4. Videos (96 registros)
**Conteúdo**: Metadados dos vídeos
**Campos para embedding**:
- video_title
- video_description
- ai_analysis_summary

**Metadata**:
- VIDEO (ID do YouTube)
- Channel
- view_count
- like_count
- relevance_score

**Uso no agente**: Informações sobre vídeos específicos

---

### 5. Projeto (6 registros)
**Conteúdo**: Configurações dos projetos
**Campos para embedding**:
- Project name
- description service
- Keywords

**Metadata**:
- User id
- status
- País

**Uso no agente**: Contexto do projeto atual

---

### 6. Canais do youtube (29 registros)
**Conteúdo**: Informações dos canais
**Campos para embedding**:
- nome
- descricao

**Metadata**:
- canal_id
- inscritos

**Uso no agente**: Dados sobre canais monitorados

---

### 7. Scanner de videos (53 registros)
**Conteúdo**: Queries de busca
**Campos para embedding**:
- query
- status

**Metadata**:
- project_id
- resultados_encontrados

**Uso no agente**: Histórico de buscas e resultados

---

### 8. Integrações (5 registros)
**Conteúdo**: Configurações de integrações
**Campos para embedding**:
- nome
- tipo
- status

**Metadata**:
- project_id
- configuracoes

**Uso no agente**: Status e configuração de integrações

---

### 9. Tabelas Financeiras

#### payments (2 registros)
**Campos**: status, amount
**Uso**: Histórico de pagamentos

#### subscriptions (2 registros)
**Campos**: status, plan_name
**Uso**: Informações de assinatura

#### customers (2 registros)
**Campos**: email, name
**Uso**: Dados do cliente

#### cards (4 registros)
**Campos**: last4, brand
**Uso**: Métodos de pagamento

---

### 10. Notificacoes (1 registro)
**Conteúdo**: Notificações do sistema
**Campos para embedding**:
- titulo
- mensagem

**Uso no agente**: Histórico de notificações

---

## Estatísticas Gerais

- **Total de tabelas**: 14
- **Total de registros**: 2.260
- **Registros processados**: 0 (0%)
- **Custo estimado**: $22.60

## Priorização de Processamento

### 🔴 Alta Prioridade (processar primeiro)
1. Videos_trancricao - Conteúdo rico
2. Projeto - Contexto essencial
3. Comentarios_Principais - Feedback valioso
4. Mensagens - Histórico importante

### 🟡 Média Prioridade
5. Videos - Metadados úteis
6. Canais do youtube - Informações dos canais
7. Scanner de videos - Histórico de buscas
8. Respostas_Comentarios - Threads de discussão

### 🟢 Baixa Prioridade
9. Integrações - Poucos registros
10. Notificacoes - Apenas 1 registro
11. Tabelas financeiras - Dados estruturados

---

*Última atualização: 10/01/2025*