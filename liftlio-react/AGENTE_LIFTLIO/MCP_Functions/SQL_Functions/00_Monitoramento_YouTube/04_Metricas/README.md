# 📁 04_Analytics

**Responsabilidade**: Métricas, estatísticas e relatórios de performance
**Sistema**: Ambos (Descoberta + Monitoramento) - Queries agregadas
**Última atualização**: 2025-09-30 - Claude Code (Anthropic)

---

## 🎯 PROPÓSITO

Este conjunto de funções fornece insights e métricas agregadas sobre:
- Performance de projetos
- Estatísticas de comentários e mensagens
- Categorias de conteúdo mais relevantes
- Análise semanal de resultados

Usado por dashboards, relatórios e APIs de analytics.

---

## 📊 FUNÇÕES DISPONÍVEIS

### 🔵 get_project_metrics.sql
- **Descrição**: Retorna métricas gerais de um projeto (vídeos, comentários, mensagens, taxa de conversão)
- **Parâmetros**:
  - `p_project_id` (INTEGER) - ID do projeto
- **Retorna**: JSONB com métricas agregadas
- **Usado por**: Dashboard principal, cards de estatísticas
- **Chama**: Nenhuma função externa
- **Tabelas afetadas**:
  - `"Videos"` (SELECT COUNT, agregações)
  - `"Comentarios_Principais"` (SELECT COUNT)
  - `"Mensagens"` (SELECT COUNT)
  - `"Canais do youtube_Projeto"` (JOIN para filtrar por projeto)

### 🔵 get_weekly_project_performance.sql
- **Descrição**: Análise semanal de performance (vídeos novos, comentários processados, mensagens postadas)
- **Parâmetros**:
  - `p_project_id` (INTEGER) - ID do projeto
  - `p_weeks` (INTEGER opcional) - Quantidade de semanas (default: 4)
- **Retorna**: TABLE com performance por semana
- **Usado por**: Gráficos de tendências, relatórios semanais
- **Chama**: Nenhuma função externa
- **Tabelas afetadas**:
  - `"Videos"` (SELECT com DATE_TRUNC)
  - `"Comentarios_Principais"` (SELECT com DATE_TRUNC)
  - `"Mensagens"` (SELECT com DATE_TRUNC)

### 🔵 get_top_content_categories.sql
- **Descrição**: Lista categorias de conteúdo mais relevantes baseadas em vídeos descobertos
- **Parâmetros**:
  - `p_project_id` (INTEGER) - ID do projeto
  - `p_limit` (INTEGER opcional) - Top N categorias (default: 10)
- **Retorna**: TABLE com categorias e contadores
- **Usado por**: Análise de conteúdo, otimização de keywords
- **Chama**: Nenhuma função externa
- **Tabelas afetadas**:
  - `"Videos"` (SELECT, GROUP BY categoria)
  - `"Canais do youtube"` (JOIN para dados do canal)

### 🔵 get_comments_and_messages_by_video_id.sql
- **Descrição**: Retorna todos comentários + mensagens/respostas de um vídeo específico
- **Parâmetros**:
  - `p_video_id` (BIGINT) - ID do vídeo
- **Retorna**: JSONB com comentários principais e suas respostas
- **Usado por**: Páginas de detalhes de vídeo, análise de conversas
- **Chama**: Nenhuma função externa
- **Tabelas afetadas**:
  - `"Comentarios_Principais"` (SELECT WHERE video = video_id)
  - `"Mensagens"` (SELECT via JOIN)

### 🔵 obter_comentarios_postados_por_projeto.sql
- **Descrição**: Lista todas mensagens/comentários postados de um projeto
- **Parâmetros**:
  - `p_project_id` (INTEGER) - ID do projeto
  - Filtros opcionais (data, status)
- **Retorna**: TABLE com mensagens postadas
- **Usado por**: Histórico de postagens, auditoria
- **Chama**: Nenhuma função externa
- **Tabelas afetadas**:
  - `"Mensagens"` (SELECT WHERE project_id + respondido = true)
  - `"Settings messages posts"` (JOIN para dados de agendamento)

---

## 🔗 FLUXO DE INTERLIGAÇÃO

```
Dashboard Principal:
  ├─→ get_project_metrics(project_id)
  │     └─→ Retorna: total_videos, total_comments, total_messages, conversion_rate
  │
  ├─→ get_weekly_project_performance(project_id, 4)
  │     └─→ Retorna: array de 4 semanas com métricas
  │
  └─→ get_top_content_categories(project_id, 10)
        └─→ Retorna: top 10 categorias mais relevantes

Página Detalhes do Vídeo:
  └─→ get_comments_and_messages_by_video_id(video_id)
        └─→ Retorna: comentários + respostas do Liftlio

Relatório de Postagens:
  └─→ obter_comentarios_postados_por_projeto(project_id)
        └─→ Retorna: histórico de todas postagens
```

---

## 📋 DEPENDÊNCIAS

### Funções externas necessárias:
- Nenhuma (queries puras, sem dependências)

### Tabelas do Supabase:
- `"Videos"` - [SELECT: agregações, filtros por projeto]
- `"Comentarios_Principais"` - [SELECT: contadores, filtros]
- `"Mensagens"` - [SELECT: contadores, filtros por status]
- `"Canais do youtube"` - [SELECT: dados do canal em JOINs]
- `"Canais do youtube_Projeto"` - [SELECT: filtrar por projeto]
- `"Settings messages posts"` - [SELECT: dados de agendamento]
- `"Projeto"` - [Pode ser usado em JOINs]

### Edge Functions:
- Nenhuma

---

## ⚙️ CONFIGURAÇÕES & VARIÁVEIS

- Nenhuma configuração específica (apenas queries de leitura)
- Usa timestamps padrão para filtros temporais
- Agregações baseadas em campos existentes

---

## 🚨 REGRAS DE NEGÓCIO

1. **Performance**: Queries otimizadas com índices apropriados
2. **Filtros temporais**: Sempre usar DATE_TRUNC para agregações por período
3. **Taxa de conversão**: Mensagens postadas / Comentários analisados
4. **Apenas dados do projeto**: Sempre filtrar por project_id para isolamento
5. **Cache**: Resultados podem ser cacheados por 5-15 minutos

---

## 🧪 COMO TESTAR

```sql
-- Teste 1: Métricas gerais do projeto 77
SELECT get_project_metrics(77);

-- Teste 2: Performance das últimas 4 semanas
SELECT * FROM get_weekly_project_performance(77, 4);

-- Teste 3: Top 10 categorias de conteúdo
SELECT * FROM get_top_content_categories(77, 10);

-- Teste 4: Comentários e respostas de um vídeo
SELECT get_comments_and_messages_by_video_id(12345);

-- Teste 5: Histórico de postagens do projeto
SELECT * FROM obter_comentarios_postados_por_projeto(77)
ORDER BY postado DESC
LIMIT 20;

-- Teste 6: Estatísticas globais (todos projetos)
SELECT
    COUNT(DISTINCT p.id) as total_projetos,
    COUNT(DISTINCT v.id) as total_videos,
    COUNT(DISTINCT cp.id) as total_comentarios,
    COUNT(DISTINCT m.id) as total_mensagens,
    COUNT(DISTINCT CASE WHEN m.respondido = true THEN m.id END) as mensagens_postadas
FROM "Projeto" p
LEFT JOIN "Canais do youtube_Projeto" cyp ON cyp."Projeto_id" = p.id
LEFT JOIN "Canais do youtube" c ON c.id = cyp."Canais do youtube_id"
LEFT JOIN "Videos" v ON v."Canais" = c.id
LEFT JOIN "Comentarios_Principais" cp ON cp.video = v.id
LEFT JOIN "Mensagens" m ON m.project_id = p.id;
```

---

## 📝 CHANGELOG

### 2025-09-30 - Claude Code
- Reorganização inicial: criação da subpasta
- Criação deste README.md
- Total de funções: 5
- Status: Todas funcionais
- Todas queries são read-only (SELECT apenas)

---

## ⚠️ REGRA OBRIGATÓRIA

**SEMPRE que modificar qualquer função nesta pasta:**

1. ✅ Atualizar este README.md
2. ✅ Atualizar seção "Última atualização"
3. ✅ Adicionar entrada no CHANGELOG
4. ✅ Revisar "FLUXO DE INTERLIGAÇÃO" se mudou
5. ✅ Atualizar "DEPENDÊNCIAS" se mudou
6. ✅ Atualizar "COMO TESTAR" se interface mudou
7. ✅ Testar performance em produção (queries pesadas)
