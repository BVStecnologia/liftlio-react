# TRELLO.md - Instruções para API do Trello

## ⚠️ IMPORTANTE: USE A API DO TRELLO, NÃO ESTE ARQUIVO!
## Este arquivo é apenas DOCUMENTAÇÃO sobre como usar a API do Trello
## Para atualizar tarefas, use os comandos curl abaixo com a API real

## Status da Configuração
- **Data da atualização**: 11/01/2025
- **Método de integração**: API REST direta (mais confiável que MCP)
- **Board ID**: `ZrgSrOmx`
- **Nome do Board**: Liftlio
- **Script de funções**: `/Users/valdair/Documents/Projetos/Liftlio/liftlio-react/.claude/scripts/trello-api.sh`

## 🚨 REGRA CRÍTICA PARA CLAUDE 🚨
### NUNCA EDITE ESTE ARQUIVO PARA ATUALIZAR TAREFAS!
### USE SEMPRE A API DO TRELLO COM OS COMANDOS CURL ABAIXO!

## 📊 Resultados da Sessão 13/01/2025 (Criados via API do Trello)

### ✅ Cards CRIADOS hoje na lista Completed:
1. **"Implement agent conversation memory"** → Card ID: 6873b3a75e60cbaf0ee3f12e
   - Tabela agent_conversations criada
   - Salvamento de conversas implementado
   - Busca de contexto histórico funcionando
   - Edge Function v12 pronta para deploy

2. **"Fix agent exposing internal project ID"** → Card ID: 6873b3c69ddcd3d7b7c56b50
   - Removido ID do projeto das respostas
   - Mantém apenas nome do projeto
   - Controle interno preservado

3. **"Reduce agent response tokens from 1024 to 512"** → Card ID: 6873b3dc6fa65d72b195acea
   - Respostas mais concisas
   - Melhor experiência do usuário
   - Economia de tokens

### 🔄 Cards CRIADOS em Working:
1. **"Deploy Edge Function agente-liftlio v12"** → Card ID: 6873b3eacc6284270011da1b
   - Arquivo pronto: agente-liftlio_v12_memoria_persistente.ts
   - Aguardando deploy no Supabase

### 🔄 Cards EXISTENTES em Working:
- "Improve credit consumption control"
- "Memory RAG Automation EDGE Function" 
- "Integrate RAG with main agent (agente-liftlio)"

### 📊 Resultados da Sessão 12/01/2025

### ✅ Cards CONCLUÍDOS ontem:
1. **"Process remaining embeddings for 14 tables"** → Movido para Completed
   - Sistema automatizado implementado
   - 372+ embeddings processados via CRON
   - Performance otimizada em 40%

2. **"Debug RAG semantic search returning empty results"** → Movido para Completed  
   - Problema resolvido: embeddings NULL poluindo BD
   - 300 registros inválidos removidos
   - Sistema de limpeza implementado

## Resultados do Primeiro Teste

## Como Usar a API do Trello

### 1. Carregar as funções (sempre fazer primeiro)
```bash
source /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/.claude/scripts/trello-api.sh
```

### 2. Comandos Disponíveis

#### Listar cards
```bash
trello-pending    # Lista cards em "Valdair" (to-do)
trello-working    # Lista cards em "Valdair Is Working On it"
trello-completed  # Lista cards em "Completed"
```

#### Criar novo card
```bash
trello_create_card "$VALDAIR_TODO" "Nome do Card" "Descrição do card"
```

#### Mover cards
```bash
trello_start_card "ID_DO_CARD"     # Move para "Working on it"
trello_complete_card "ID_DO_CARD"  # Move para "Completed"
```

#### Adicionar comentário
```bash
trello_add_comment "ID_DO_CARD" "Progress update: Completed X, working on Y"
```

### 3. IDs das Listas (já configurados no script)
- **VALDAIR_TODO**: 686b4422d297ee28b3d92163
- **VALDAIR_WORKING**: 686b4ad61da133ac3b998284
- **COMPLETED**: 686b442bd7c4de1dbcb52ba8
- **STEVE_TODO**: 686b440c1850daf5c7b67d47
- **STEVE_WORKING**: 686b4abbc2844bbd01e4770a
- **RESEARCH**: 686ba6823ff02e290d3652e1

## Estrutura do Board Liftlio

### Listas e Cards (Total: 33 cards)
1. **Steve To Do Items** (3 cards)
   - Tasks pendentes para Steve

2. **Steve is Working On it** (1 card)
   - Tasks em progresso por Steve

3. **Valdair** (2 cards)
   - Tasks pendentes para Valdair

4. **Valdair Is Working On it** (2 cards)
   - Tasks em progresso por Valdair

5. **Completed** (21 cards)
   - Tasks concluídas

6. **Research laboratory items** (4 cards)
   - Items de pesquisa e desenvolvimento
   - Incluindo o card de teste criado

## Exemplos de Uso Prático

### Quando você pedir "listar minhas tarefas"
```bash
source /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/.claude/scripts/trello-api.sh
trello-pending
```

### Quando você disser "trabalhando em [tarefa]"
```bash
# Primeiro listar para pegar o ID
trello-pending
# Depois mover o card
trello_start_card "ID_DO_CARD"
```

### Quando você disser "completei [tarefa]"
```bash
# Primeiro listar working para pegar o ID
trello-working
# Depois mover para completed
trello_complete_card "ID_DO_CARD"
```

### Criar nova tarefa
```bash
trello_create_card "$VALDAIR_TODO" "Implement new feature X" "Technical details: Need to create component Y and integrate with Z"
```

## 📝 Cards do Agente AI - Criados em 11/01/2025

### ✅ Cards já criados via API

### 🟢 Completed (6 novos cards)
1. **Implement Claude AI Agent Layer**
   - Edge function agente-liftlio deployed and working
   - Integration with FloatingAgent.tsx component
   - Claude API configured in Supabase Vault

2. **Create RAG embeddings infrastructure**
   - Table rag_embeddings with vector column
   - HNSW index for performance
   - 14 tables configured with rag_processed field

3. **Setup project isolation for RAG**
   - Added project_id field with foreign key
   - RLS policies implemented
   - Composite index for performance

4. **Process embeddings for projects 58 and 71**
   - 144 total embeddings created
   - Project 58: 101 embeddings
   - Project 71: 32 embeddings

5. **Create search functions for RAG**
   - SQL function: search_project_rag
   - Edge functions: search-rag-project, process-rag-batch
   - Prepare content functions for each table

6. **Organize MCP functions documentation**
   - Complete folder structure created
   - Best practices documented
   - Index of all functions maintained

### 🔄 Valdair Is Working On It (3 novos cards)
1. **Debug RAG semantic search returning empty results**
   - Edge function not returning expected results
   - Possible causes: embedding similarity, threshold, query processing
   - Last test with threshold 0.3 still returning empty

2. **Process remaining embeddings for 14 tables**
   - Videos_transcricao: 211 records pending
   - Comentarios_Principais: 690 records pending
   - Mensagens: 688 records pending
   - Other 11 tables pending

3. **Integrate RAG with main agent (agente-liftlio)**
   - Modify agent to query RAG before Claude
   - Implement intelligent fallback
   - Test response quality

### 📋 Valdair To-Do (5 novos cards)
1. **Implement auto-processing triggers for RAG**
   - Create database triggers for new records
   - Queue system for batch processing
   - Error handling and retry logic

2. **Create support ticket system**
   - Tables: support_tickets, ticket_messages, ticket_notifications
   - RLS configuration
   - Integration with agent

3. **Add conversation history feature**
   - Store chat sessions
   - Retrieve past conversations
   - Context preservation

4. **Implement cron jobs for batch processing**
   - Supabase scheduled functions
   - Process pending embeddings
   - Clean up old data

5. **Create admin panel for tickets**
   - Route: /admin/tickets
   - Interface for support team
   - Notification system

### 🐛 Bugs (2 novos cards)
1. **Fix vector search returning empty results**
   - Priority: High
   - Impact: RAG system not functional
   - Workaround: Using keyword search temporarily

2. **Resolve occasional timeout on long responses**
   - Priority: Medium
   - Impact: User experience
   - Solution: Optimize Edge function performance

## Configuração de Atualização de Tarefas

### Identificação
- **Usuário atual**: Valdair
- **Listas de trabalho**: "Valdair" (to-do) e "Valdair Is Working On it" (em progresso)

### Regras de Idioma
- **VS Code / Documentação local**: Sempre em português
- **Trello (cards, comentários, labels)**: Sempre em inglês

### ⚠️ REGRA SOBRE DATAS NO TRELLO
- **NUNCA adicionar datas manualmente**
- **O Trello registra automaticamente** quando cada comentário/ação foi feita
- **Não escrever** "[12/07/2025]" ou qualquer formato de data
- **Deixar o sistema** cuidar do registro temporal

### Fluxo de Trabalho do Valdair
1. **Ao iniciar tarefa**: Mover card de "Valdair" → "Valdair Is Working On it"
2. **Durante o trabalho**: Adicionar comentários em inglês com progresso
3. **Ao completar**: Mover card → "Completed" com resumo final
4. **Se bloqueado**: Adicionar label "blocked" e explicação

### Padrão de Cards (em inglês)
- **Title**: Ação clara (ex: "Implement RAG system")
- **Description**: Technical details and acceptance criteria
- **Labels**: bug, feature, enhancement, urgent, blocked
- **Comments**: Progress updates in English

### Template de Atualização
```
Progress Update:
- Completed: [what was done]
- Blockers: [if any]
- Next: [next steps]
```

### ⚠️ NÃO ADICIONAR DATAS
- O Trello adiciona data/hora automaticamente
- NUNCA escrever datas manualmente nos comentários
- O sistema registra quando cada ação foi feita

### Comandos Rápidos para Claude

#### 📋 Para LISTAR cards:
```bash
# SEMPRE executar primeiro (carrega credenciais):
source .claude/scripts/trello-api.sh

# Depois usar:
curl -s "https://api.trello.com/1/lists/686b4ad61da133ac3b998284/cards?key=3436c02dafd3cedc7015fd5e881a850c&token=ATTA082e00f4ffc4f35a4b753c8c955d106a21a01c91c2213bc5c9fb3c128a0a8a9f0551C6F6" | python3 -c "import json, sys; cards = json.load(sys.stdin); [print(f'- {card[\"name\"]} (ID: {card[\"id\"]})') for card in cards]"
```

#### ✅ Para COMPLETAR um card:
```bash
# 1. Mover para Completed:
curl -X PUT "https://api.trello.com/1/cards/CARD_ID?key=3436c02dafd3cedc7015fd5e881a850c&token=ATTA082e00f4ffc4f35a4b753c8c955d106a21a01c91c2213bc5c9fb3c128a0a8a9f0551C6F6" -H "Content-Type: application/json" -d "{\"idList\": \"686b442bd7c4de1dbcb52ba8\"}"

# 2. Adicionar comentário de conclusão:
curl -X POST "https://api.trello.com/1/cards/CARD_ID/actions/comments?key=3436c02dafd3cedc7015fd5e881a850c&token=ATTA082e00f4ffc4f35a4b753c8c955d106a21a01c91c2213bc5c9fb3c128a0a8a9f0551C6F6" -H "Content-Type: application/json" -d "{\"text\": \"✅ COMPLETED (DATA): Descrição do que foi feito.\"}"
```

#### 🔧 Para COMEÇAR um card:
```bash
# Mover de To-Do para Working:
curl -X PUT "https://api.trello.com/1/cards/CARD_ID?key=3436c02dafd3cedc7015fd5e881a850c&token=ATTA082e00f4ffc4f35a4b753c8c955d106a21a01c91c2213bc5c9fb3c128a0a8a9f0551C6F6" -H "Content-Type: application/json" -d "{\"idList\": \"686b4ad61da133ac3b998284\"}"
```

#### ➕ Para CRIAR novo card:
```bash
curl -X POST "https://api.trello.com/1/cards?key=3436c02dafd3cedc7015fd5e881a850c&token=ATTA082e00f4ffc4f35a4b753c8c955d106a21a01c91c2213bc5c9fb3c128a0a8a9f0551C6F6" -H "Content-Type: application/json" -d "{\"idList\": \"686b4422d297ee28b3d92163\", \"name\": \"Nome do Card\", \"desc\": \"Descrição técnica detalhada\"}"
```

### Comandos Interpretativos:
- "trabalhando em [tarefa]" → Move para "Valdair Is Working On it"
- "completei [tarefa]" → Move para "Completed"
- "bloqueado em [tarefa]" → Adiciona label "blocked"
- "nova tarefa [descrição]" → Cria card em "Valdair"

## ⚠️ INSTRUÇÕES CRÍTICAS para Claude

### 🚨 SEMPRE fazer ANTES de qualquer operação:
1. **Executar**: `source .claude/scripts/trello-api.sh` (carrega credenciais)
2. **Usar API direta**: Os aliases não funcionam no Bash tool, use sempre curl
3. **Substituir CARD_ID**: Trocar literalmente pela ID do card antes de executar

### 🔍 Fluxo Correto:
1. **Listar** → Pegar ID do card
2. **Copiar ID** → Substituir em CARD_ID nos comandos
3. **Executar** → Comando curl completo
4. **Confirmar** → Verificar se moveu/comentou

### 💡 Dicas:
- **Nunca usar** aliases como `trello-working` no Bash tool
- **Sempre usar** comandos curl completos
- **List IDs fixos**:
  - To-Do: `686b4422d297ee28b3d92163`
  - Working: `686b4ad61da133ac3b998284` 
  - Completed: `686b442bd7c4de1dbcb52ba8`

## Notas Importantes
- **Método atual**: API REST direta (mais confiável que MCP)
- **Credenciais**: Armazenadas no script `trello-api.sh`
- **Board "Liftlio"**: Totalmente acessível
- **Total de cards**: 47+ (em crescimento)

## Por que mudamos para API direta?
1. **Mais confiável** - Sempre funciona, não depende de reiniciar Claude
2. **Mais rápido** - Execução direta sem overhead do MCP
3. **Mais flexível** - Podemos customizar as funções
4. **Sempre disponível** - Não precisa de configuração especial

## Credenciais (NÃO compartilhar)
- **API Key**: `3436c02dafd3cedc7015fd5e881a850c`
- **Token**: `ATTA082e00f4ffc4f35a4b753c8c955d106a21a01c91c2213bc5c9fb3c128a0a8a9f0551C6F6`
- **Board ID**: `ZrgSrOmx`