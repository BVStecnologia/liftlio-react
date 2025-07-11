# CLAUDE.md - Memória do Projeto Liftlio

## Informações do Projeto
- **Nome**: Liftlio
- **Tipo**: Plataforma de monitoramento de vídeos e análise de sentimentos
- **Stack**: React, TypeScript, Supabase
- **Data de criação deste arquivo**: 05/06/2025
- **Última atualização**: 10/01/2025

## Configurações MCP
- **SQLite configurado**: Sim
- **Caminho do banco**: `/Users/valdair/Documents/Projetos/Liftlio/liftlio-memory.db`
- **Status**: Funcionando corretamente
- **Supabase MCP**: Configurado e funcionando

## 🗂️ PADRÃO DE ORGANIZAÇÃO DE FUNÇÕES (IMPORTANTE)

### Estrutura de Pastas
Todas as funções criadas via MCP devem ser organizadas em:
```
/Users/valdair/Documents/Projetos/Liftlio/liftlio-react/supabase/Funcoes criadas MCP/
├── Edge Functions/
│   └── nome-funcao_descricao_curta.ts
└── SQL Functions/
    └── nome_funcao_descricao_curta.sql
```

### Regras de Nomenclatura
1. **Edge Functions**: `nome-da-funcao_descricao_em_portugues.ts`
   - Exemplo: `process-rag-embeddings_processar_embeddings_em_batch.ts`
   
2. **SQL Functions**: `nome_da_funcao_descricao_em_portugues.sql`
   - Exemplo: `search_rag_embeddings_busca_semantica_basica.sql`

3. **Script Completo**: Sempre criar `00_script_completo_*.sql` para executar todas as funções relacionadas

### Manutenção
- Sempre que modificar uma função no Supabase, atualizar o arquivo correspondente
- Manter documentação completa em cada arquivo
- Incluir exemplos de uso comentados

## Sistema RAG - Embeddings
- **Status**: Implementado e funcionando
- **Edge Functions**:
  - `agente-liftlio`: Assistente AI com Claude
  - `process-rag-embeddings`: Processamento de embeddings
  - `search-rag`: Busca semântica
- **SQL Functions**:
  - `search_rag_embeddings`: Busca básica
  - `search_rag_embeddings_filtered`: Busca com filtros
  - Índice HNSW para performance
- **Tabelas com RAG**: 14 tabelas configuradas com campos `rag_processed`

## Notas Importantes
- O projeto usa Supabase como backend
- Autenticação via OAuth (Google)
- Deploy configurado via Fly.io
- OpenAI API key configurada no Supabase Vault como `OPENAI_API_KEY`
- Claude API key configurada como `ANTHROPIC_API_KEY`

## Arquivos Importantes do Projeto
- `/liftlio-react/AGENTE.md`: Documentação completa do sistema de agente AI
- `/liftlio-react/supabase/Funcoes criadas MCP/`: Todas as funções organizadas

## Histórico de Sessões
- **05/06/2025 15:10**: Teste de persistência após reinicialização - MCP funcionando
- **09/01/2025**: Implementação do agente AI com Claude
- **10/01/2025**: Sistema RAG completo com embeddings e busca semântica

## Última Sessão
- **Data**: 10/01/2025
- **Contexto**: Organização de funções em pastas estruturadas
- **Status**: Sistema RAG funcionando, funções organizadas em pastas
- **Próximos passos**: Implementar triggers para processamento automático de embeddings