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
  - `agente-liftlio`: Assistente AI com Claude (v5 - usa SDK Supabase)
  - `generate-embedding`: Gera embeddings com OpenAI
- **SQL Functions**:
  - `search_project_rag`: Busca com isolamento por projeto
  - `process_rag_embeddings`: Processa embeddings de qualquer tabela
  - Índice HNSW para performance
- **Tabelas com RAG**: 14 tabelas configuradas com campos `rag_processed`

## 🚨 REGRA OBRIGATÓRIA - SDK SUPABASE
**SEMPRE** usar o SDK do Supabase (`supabase.functions.invoke()`) para chamar Edge Functions:
- No frontend: `await supabase.functions.invoke('nome-funcao', { body: { params } })`
- Nas Edge Functions: `await supabase.functions.invoke('outra-funcao', { body: { params } })`
- **NUNCA** usar HTTP direto ou fetch manual - SDK é a melhor prática!

## Notas Importantes
- O projeto usa Supabase como backend
- Autenticação via OAuth (Google)
- Deploy configurado via Fly.io
- OpenAI API key configurada no Supabase Vault como `OPENAI_API_KEY`
- Claude API key configurada como `CLAUDE_API_KEY` (NÃO usar ANTHROPIC_API_KEY)

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
- **11/01/2025**: Migração para SDK Supabase, integração RAG no agente, reorganização MCP

## Última Sessão
- **Data**: 11/01/2025
- **Contexto**: Reimplementação usando SDK Supabase e integração RAG no agente
- **Status**: 
  - ✅ Edge Function agente-liftlio v5 com SDK
  - ✅ RAG integrado mas ainda sem retornar dados
  - ✅ Funções MCP reorganizadas em AGENTE_LIFTLIO
  - ✅ Regra SDK obrigatória documentada
- **Próximos passos**: Debug busca RAG que não está retornando resultados

## Integração Trello - Gestão de Tarefas

### IMPORTANTE: Quando o usuário pedir para listar tarefas
1. **Primeiro**: Consultar `/Users/valdair/Documents/Projetos/Liftlio/TRELLO.md`
2. **Verificar** se o MCP Trello está disponível (ferramentas `mcp__trello__*`)
3. **Se MCP disponível**: Usar ferramentas MCP para dados em tempo real
4. **Se MCP não disponível**: Informar baseado no TRELLO.md

### Listas de Tarefas do Valdair
- **"Valdair"**: Tarefas pendentes (to-do)
- **"Valdair Is Working On it"**: Tarefas em andamento
- **"Completed"**: Tarefas completadas

### Comandos de Tarefas
- **"listar tarefas pendentes"** → Mostrar cards da lista "Valdair"
- **"o que estou fazendo"** → Mostrar cards da lista "Valdair Is Working On it"
- **"tarefas completadas"** → Mostrar cards da lista "Completed"
- **"trabalhando em [tarefa]"** → Mover card para "Valdair Is Working On it"
- **"completei [tarefa]"** → Mover card para "Completed"

### Regras de Idioma
- **Comunicação no VS Code**: Sempre em português
- **Cards no Trello**: Sempre em inglês (título, descrição, comentários)