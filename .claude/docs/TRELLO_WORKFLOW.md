# Trello - Workflow e Integração MCP

## Configuração
- **Board Principal**: Liftlio (ID: `686b43ced8d30f8eb12b9d12`)
- **Listas do Valdair**:
  - Pendentes: `686b4422d297ee28b3d92163`
  - Em andamento: `686b4ad61da133ac3b998284`
  - Completadas: `686b442bd7c4de1dbcb52ba8`

## 🔴 REGRA CRÍTICA: ENGLISH ONLY
**⚠️ ALL TRELLO CARDS MUST BE IN ENGLISH**
- Titles: English
- Descriptions: English
- Comments: English
- Labels: Can use emojis but text in English

## 📸 REGRA: Imagens são OBRIGATÓRIAS

### Geração de Imagens
```bash
# Gerar imagem localmente SEMPRE com GPT-Image-1:
/Users/valdair/Documents/Projetos/Liftlio/.claude/scripts/gpt-image-1.sh "prompt" "1536x1024" "high"

# NOTA: GPT-Image-1 usa internamente dall-e-3 como modelo
# Tamanhos válidos: 1024x1024, 1024x1536, 1536x1024
# Qualidade: low, medium, high, auto

# Imagem salva em: /liftlio-react/generated-images/
# Usuário sobe manualmente no Trello como capa do card
```

## Workflow de Cards

### Criação de Card
1. Criar card com título descritivo
2. Adicionar descrição detalhada (markdown suportado)
3. Gerar imagem com GPT-Image-1
4. Usuário adiciona imagem como capa manualmente
5. Atribuir labels relevantes
6. Definir data de entrega (se aplicável)

### Estados dos Cards
- **Pendentes**: Tarefas a fazer
- **Em andamento**: Tarefas sendo trabalhadas
- **Completadas**: Tarefas finalizadas

### Labels Comuns
- 🟣 Feature - Nova funcionalidade
- 🔴 Bug - Correção de erro
- 🟡 Melhoria - Otimização/refactoring
- 🔵 Documentação - Docs/guides
- 🟢 Deploy - Mudanças de infra

## MCP Tools Disponíveis

### Cards
- `mcp__trello__create_card` - Criar card
- `mcp__trello__get_card` - Obter detalhes
- `mcp__trello__update_card` - Atualizar card
- `mcp__trello__move_card_to_list` - Mover entre listas
- `mcp__trello__add_comment` - Adicionar comentário
- `mcp__trello__add_attachment` - Adicionar anexo (URL)

### Listas
- `mcp__trello__get_board_lists` - Listar todas listas
- `mcp__trello__get_cards_in_list` - Cards de uma lista

### Board
- `mcp__trello__get_board` - Detalhes do board
- `mcp__trello__get_board_labels` - Labels disponíveis

## Exemplo de Uso

```typescript
// Create card with complete description (ALWAYS IN ENGLISH!)
await mcp__trello__create_card({
  name: "Implement notification system",
  desc: `
## Objective
Create push notification system for real-time alerts

## Tasks
- [ ] UI component design
- [ ] Supabase Realtime integration
- [ ] Cross-browser testing
- [ ] Deploy

## References
- Figma: [link]
- Docs: [link]
  `,
  idList: "686b4422d297ee28b3d92163", // Pendentes
  due: "2025-10-20T12:00:00Z"
});

// Add comment (ENGLISH!)
await mcp__trello__add_comment({
  cardId: "card_id",
  text: "✅ Design approved by Valdair"
});

// Move to In Progress
await mcp__trello__move_card_to_list({
  cardId: "card_id",
  listId: "686b4ad61da133ac3b998284"
});
```

## Best Practices
1. **Clear title**: Use action verb + context (IN ENGLISH!)
2. **Structured description**: Markdown with sections (Objective, Tasks, Refs) (IN ENGLISH!)
3. **Always include image**: Use GPT-Image-1 for visual impact
4. **Descriptive labels**: Facilitate filtering and organization
5. **Comments**: Update progress with emojis (✅ ❌ ⚠️) (IN ENGLISH!)
6. **Useful attachments**: Links to Figma, docs, PRs
