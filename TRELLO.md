# TRELLO.md - Integração MCP Trello com Claude

## 🚨 IMPORTANTE: USE SEMPRE O MCP DO TRELLO
**Este arquivo documenta como usar o MCP do Trello no Claude**
- **NUNCA use APIs diretas ou curl** - sempre use as ferramentas MCP
- **Este arquivo é DOCUMENTAÇÃO** - não é banco de dados
- **Para dados em tempo real**: use as ferramentas MCP listadas abaixo

## Status da Configuração MCP
- **MCP Trello**: ✅ Configurado e funcionando
- **Board Principal**: Liftlio (ID: `686b43ced8d30f8eb12b9d12`)
- **Servidor MCP**: `@delorenj/mcp-server-trello`
- **Data última verificação**: 16/01/2025



## Ferramentas MCP Disponíveis

### 📋 Gerenciamento de Boards
- `mcp__trello__list_boards` - Lista todos os boards
- `mcp__trello__set_active_board` - Define o board ativo
- `mcp__trello__get_active_board_info` - Informações do board ativo
- `mcp__trello__list_workspaces` - Lista workspaces
- `mcp__trello__set_active_workspace` - Define workspace ativo
- `mcp__trello__list_boards_in_workspace` - Lista boards em um workspace

### 📝 Gerenciamento de Listas
- `mcp__trello__get_lists` - Lista todas as listas do board
- `mcp__trello__add_list_to_board` - Adiciona nova lista
- `mcp__trello__archive_list` - Arquiva uma lista

### 🎯 Gerenciamento de Cards
- `mcp__trello__get_cards_by_list_id` - Lista cards de uma lista específica
- `mcp__trello__add_card_to_list` - Cria novo card
- `mcp__trello__update_card_details` - Atualiza detalhes do card
- `mcp__trello__move_card` - Move card entre listas
- `mcp__trello__archive_card` - Arquiva um card
- `mcp__trello__get_my_cards` - Lista cards atribuídos ao usuário
- `mcp__trello__attach_image_to_card` - Anexa imagem a um card

### 📊 Outras Ferramentas
- `mcp__trello__get_recent_activity` - Atividades recentes do board

## Como Usar o MCP do Trello

### 1. Listar Tarefas Pendentes do Valdair
```typescript
// Primeiro, definir o board ativo
await mcp__trello__set_active_board({ boardId: "686b43ced8d30f8eb12b9d12" });

// Listar cards da lista "Valdair"
await mcp__trello__get_cards_by_list_id({ listId: "686b4422d297ee28b3d92163" });
```

### 2. Ver o que Valdair está Trabalhando
```typescript
// Listar cards da lista "Valdair Is Working On it"
await mcp__trello__get_cards_by_list_id({ listId: "686b4ad61da133ac3b998284" });
```

### 3. Criar Nova Tarefa
```typescript
await mcp__trello__add_card_to_list({
  listId: "686b4422d297ee28b3d92163", // Lista "Valdair"
  name: "Task name in English",
  description: "Detailed description in English",
  dueDate: "2025-01-20T12:00:00Z" // Opcional
});
```

### 4. Mover Card para "Working On It"
```typescript
await mcp__trello__move_card({
  cardId: "ID_DO_CARD",
  listId: "686b4ad61da133ac3b998284" // "Valdair Is Working On it"
});
```

### 5. Marcar Tarefa como Completada
```typescript
await mcp__trello__move_card({
  cardId: "ID_DO_CARD",
  listId: "686b442bd7c4de1dbcb52ba8" // "Completed"
});
```

## IDs das Listas do Board Liftlio

| Lista | ID |
|-------|-----|
| Steve To Do Items | `686b440c1850daf5c7b67d47` |
| Steve is Working On it | `686b4abbc2844bbd01e4770a` |
| **Valdair** | `686b4422d297ee28b3d92163` |
| **Valdair Is Working On it** | `686b4ad61da133ac3b998284` |
| **Completed** | `686b442bd7c4de1dbcb52ba8` |
| Research laboratory items | `686ba6823ff02e290d3652e1` |

## Comandos Rápidos para o Usuário

Quando o usuário disser:
- **"listar tarefas pendentes"** → Use `mcp__trello__get_cards_by_list_id` na lista "Valdair"
- **"o que estou fazendo"** → Use `mcp__trello__get_cards_by_list_id` na lista "Valdair Is Working On it"
- **"tarefas completadas"** → Use `mcp__trello__get_cards_by_list_id` na lista "Completed"
- **"trabalhando em [tarefa]"** → Use `mcp__trello__move_card` para mover para "Valdair Is Working On it"
- **"completei [tarefa]"** → Use `mcp__trello__move_card` para mover para "Completed"
- **"criar tarefa [nome]"** → Use `mcp__trello__add_card_to_list` na lista "Valdair"

## Regras Importantes
1. **Sempre use MCP** - nunca use APIs diretas ou curl
2. **Cards em inglês** - títulos, descrições e comentários sempre em inglês
3. **Board padrão** - sempre usar o board Liftlio (ID: `686b43ced8d30f8eb12b9d12`)
4. **Dados em tempo real** - sempre buscar dados atualizados via MCP