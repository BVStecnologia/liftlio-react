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

**Opção 1: Google Gemini via Navegador (RECOMENDADO - Valdair tem plano)**
```
# Valdair tem plano Gemini Advanced - usar via browser automation!
URL: https://gemini.google.com/

Workflow:
1. Navegar para gemini.google.com
2. Login já está salvo (valdair3d@gmail.com)
3. Digitar prompt de imagem
4. Aguardar geração
5. Baixar imagem gerada
6. Salvar em: liftlio-react/generated-images/

Vantagens:
- Melhor qualidade que Pollinations
- Sem limite de API
- Imagens mais realistas e profissionais
```

**Opção 2: Pollinations AI (GRATUITO - Backup)**
```bash
# 100% GRATUITO, sem API key necessária
# Usar quando Gemini não estiver disponível
C:/Users/User/Desktop/Liftlio/.claude/scripts/pollinations-image.sh "prompt" "output_dir" "width" "height"

# Exemplo:
bash .claude/scripts/pollinations-image.sh "Purple tech dashboard with analytics graphs, dark theme, modern UI" "liftlio-react/generated-images" "1200" "675"

# Tamanhos recomendados: 1200x675 (16:9)
```

**Opção 3: GPT-Image-1 (Requer OpenAI billing)**
```bash
# Requer OPENAI_API_KEY com billing ativo
/Users/valdair/Documents/Projetos/Liftlio/.claude/scripts/gpt-image-1.sh "prompt" "1536x1024" "high"

# Tamanhos válidos: 1024x1024, 1024x1536, 1536x1024
```

**Imagens salvas em:** `liftlio-react/generated-images/`

### Remover Metadados (IMPORTANTE!)
```python
# Usar Python/PIL para remover metadados e evitar detecção de AI
from PIL import Image

img = Image.open('imagem_original.png')
clean_img = Image.new(img.mode, img.size)
clean_img.putdata(list(img.getdata()))
clean_img.save('imagem_limpa.png', 'PNG')
```

### Upload de Capas no Trello
- **Via MCP Browser**: Login com Google (valdair3d@gmail.com) → Navegar ao card → Capa → Upload
- **Manualmente**: Usuário sobe a imagem como capa do card

## Workflow de Cards

### Criação de Card
1. Criar card com título descritivo
2. Adicionar descrição detalhada (markdown suportado)
3. Gerar imagem com Gemini via navegador (RECOMENDADO) ou Pollinations (backup)
4. Remover metadados da imagem (evita detecção de AI)
5. Usuário adiciona imagem como capa manualmente
6. Atribuir labels relevantes
7. Definir data de entrega (se aplicável)

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
3. **Always include image**: Use Gemini via browser (RECOMENDADO) ou Pollinations (backup)
4. **Remove metadata**: Usar Python/PIL para remover metadados (evita detecção AI)
5. **Descriptive labels**: Facilitate filtering and organization
6. **Comments**: Update progress with emojis (✅ ❌ ⚠️) (IN ENGLISH!)
7. **Useful attachments**: Links to Figma, docs, PRs
8. **Cover upload**: Use MCP Browser to upload directly or inform user to do manually
