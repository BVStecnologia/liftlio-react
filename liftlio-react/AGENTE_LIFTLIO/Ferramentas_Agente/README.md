# 🤖 Ferramentas do Agente Liftlio

Este diretório contém todas as ferramentas disponíveis para o agente AI do Liftlio, organizadas por tipo.

## 📁 Estrutura de Pastas

```
Ferramentas_Agente/
├── RPC/                  # Funções RPC (Remote Procedure Call)
├── RAG/                  # Ferramentas de busca semântica (Retrieval Augmented Generation)
├── Edge_Functions/       # Edge Functions específicas para o agente
└── Docs/                 # Documentação adicional
```

## 🛠️ Ferramentas Disponíveis

### RPC (Remote Procedure Call)
1. **project_stats** (v2.0)
   - Estatísticas completas do projeto
   - Postagens realizadas e agendadas
   - Canais e vídeos monitorados
   - [Documentação completa](./RPC/project_stats.md)

2. **channel_performance_analysis** (v1.4)
   - Análise completa de performance por canal
   - Métricas de engajamento e qualidade
   - Score de performance e recomendações
   - [Documentação completa](./RPC/channel_performance_analysis.md)

3. **video_engagement_metrics** (v1.4)
   - Análise detalhada de engajamento por vídeo
   - Taxa de engajamento e posts gerados
   - Timeline de postagem e top comentários
   - [Documentação completa](./RPC/video_engagement_metrics.md)

4. **optimal_posting_schedule** (v1.3)
   - Análise dos melhores horários para postagem
   - Padrões de atividade por hora/dia
   - Recomendações baseadas em performance
   - [Documentação completa](./RPC/optimal_posting_schedule.md)

5. **list_all_channels** (v1.0)
   - Lista TODOS os canais monitorados (18 canais)
   - Estatísticas completas por canal
   - Categorização por tamanho de audiência
   - [Documentação completa](./RPC/list_all_channels.md)

### RAG (Retrieval Augmented Generation)
*(Em desenvolvimento)*

### Edge Functions
*(Em desenvolvimento)*

## 📊 Tabela agent_tools

Todas as ferramentas são registradas na tabela `agent_tools` no Supabase:

```sql
-- Estrutura da tabela
CREATE TABLE public.agent_tools (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('rag', 'rpc', 'edge_function')),
  description TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔄 Como o Agente Usa as Ferramentas

1. **Identificação**: O agente consulta `agent_tools` para listar ferramentas ativas
2. **Seleção**: Com base no contexto, seleciona a ferramenta apropriada
3. **Execução**: 
   - **RPC**: Chama via `supabase.rpc()`
   - **RAG**: Usa busca semântica
   - **Edge Function**: Invoca via `supabase.functions.invoke()`
4. **Resposta**: Processa e formata o resultado para o usuário

## 📝 Padrão de Documentação

Cada ferramenta deve ter um arquivo `.md` com:
- Informações básicas (nome, tipo, versão)
- Descrição detalhada
- Parâmetros e tipos
- Estrutura de retorno
- Exemplo de uso
- Localização do código fonte
- Histórico de alterações

## 🚀 Adicionando Nova Ferramenta

1. Criar a função/edge function no Supabase
2. Registrar na tabela `agent_tools`
3. Salvar código em `/MCP_Functions/`
4. Documentar em `/Ferramentas_Agente/[tipo]/`
5. Atualizar este README

## 📌 Links Importantes

- [Agente AI Edge Function](../Edge_Functions/)
- [Funções MCP](../MCP_Functions/)
- [Documentação Geral](../5_Documentacao/)

---
*Última atualização: 22/01/2025*