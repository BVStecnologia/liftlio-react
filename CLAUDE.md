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

## 🗂️ PADRÃO DE ORGANIZAÇÃO DE FUNÇÕES MCP (OBRIGATÓRIO)

### REGRAS ABSOLUTAS - SEMPRE SEGUIR:

1. **ANTES de criar qualquer função via MCP**:
   - Consultar `/supabase/Funcoes criadas MCP/MELHORES_PRATICAS_MCP.md`
   - Verificar se já existe função similar
   - Usar DROP IF EXISTS ou CREATE OR REPLACE

2. **DURANTE a criação**:
   - Seguir as melhores práticas documentadas
   - Adicionar comentários e documentação no código
   - Testar antes de confirmar como finalizado

3. **DEPOIS de criar/modificar/deletar**:
   - Salvar IMEDIATAMENTE cópia na pasta correspondente:
     ```
     /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/supabase/Funcoes criadas MCP/
     ├── Edge Functions/
     │   └── nome-funcao_descricao_curta.ts.bak
     └── SQL Functions/
         └── nome_funcao_descricao_curta.sql
     ```
   - Atualizar `/supabase/Funcoes criadas MCP/INDICE_COMPLETO.md`
   - Se for um sistema novo, criar `00_script_completo_sistema.sql`

### Nomenclatura Obrigatória:
- **Edge Functions**: `nome-da-funcao_descricao_em_portugues.ts.bak`
- **SQL Functions**: `nome_da_funcao_descricao_em_portugues.sql`
- **Scripts Completos**: `00_script_completo_nome_sistema.sql`

### Fluxo de Trabalho MCP:
1. Usuário pede para criar/modificar algo no Supabase
2. Claude consulta melhores práticas
3. Claude cria/modifica via MCP
4. Claude salva cópia na pasta organizada
5. Claude atualiza índice e documentação
6. Claude confirma sucesso ao usuário

### Espelhamento:
- A pasta MCP deve ser um ESPELHO EXATO do que está no Supabase
- Se deletar no Supabase → remover arquivo da pasta
- Se modificar no Supabase → atualizar arquivo na pasta
- Se criar no Supabase → criar arquivo na pasta

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
- `/liftlio-react/supabase/Funcoes criadas MCP/`: Todas as funções e documentação MCP
  - `MELHORES_PRATICAS_MCP.md`: Guia de boas práticas
  - `INDICE_COMPLETO.md`: Índice de todas as funções
  - `README.md`: Visão geral da estrutura

## Histórico de Sessões
- **05/06/2025 15:10**: Teste de persistência após reinicialização - MCP funcionando
- **09/01/2025**: Implementação do agente AI com Claude
- **10/01/2025**: Sistema RAG completo com embeddings e busca semântica

## Última Sessão
- **Data**: 10/01/2025
- **Contexto**: Organização de funções em pastas estruturadas
- **Status**: Sistema RAG funcionando, funções organizadas em pastas
- **Próximos passos**: Implementar triggers para processamento automático de embeddings