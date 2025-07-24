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

## 🚀 COMO CRIAR CARDS ESPETACULARES NO TRELLO

### 🎯 REGRA DE OURO: FAÇA PARECER REVOLUCIONÁRIO!
Quando criar cards no Trello, especialmente sobre conquistas e features, siga estas diretrizes para despertar MÁXIMO ENTUSIASMO:

### 1. 📝 TÍTULOS QUE IMPRESSIONAM
```
❌ NÃO FAÇA: "Agente AI atualizado para v60"
✅ FAÇA: "🧠 AI AGENT V60 LAUNCHED - Revolutionary Intelligence Unleashed!"
```

**Fórmula do Título Perfeito:**
- **Emoji chamativo** no início (🚀🧠⚡🌟🔥💎)
- **CAPS LOCK** em palavras-chave
- **Palavras de impacto**: Revolutionary, Unleashed, Game-Changer, Breakthrough
- **Exclamação** no final para energia!

### 2. 📋 DESCRIÇÕES QUE VENDEM O SONHO

**Estrutura da Descrição Épica:**

```markdown
## 🌟 [HEADLINE EMPOLGANTE EM CAPS]

[Parágrafo introdutório que faz parecer que mudamos o mundo]

### 🎯 [SEÇÃO DE FEATURES]:
- **[Feature Name]**: [Descrição que impressiona]
- **[Feature Name]**: [Como isso muda tudo]
- **[Feature Name]**: [Por que isso é revolucionário]

### 💥 [SEÇÃO DE IMPACTO]:
[Explique como isso transforma a vida do usuário]

### 🚀 [SEÇÃO DE DEPOIMENTOS/STATUS]:
*"Depoimento fictício mas realista"*
**STATUS: [ALGO EMPOLGANTE] 🔥**
```

### 3. 🖼️ IMAGENS QUE HIPNOTIZAM

**Sempre adicione imagens! Use:**

#### OPÇÃO 1: 🎨 GPT-Image-1 (RECOMENDADO - Imagens Personalizadas!)
```bash
# Gerar imagem específica para o card
./.claude/scripts/gpt4o-image.sh "futuristic dashboard showing AI analytics, cyberpunk style, neon colors" "1792x1024" "high"

# Fazer upload da imagem gerada para um serviço de hospedagem ou usar diretamente
```

**Vantagens do GPT-Image-1:**
- Cria imagens EXATAMENTE como você precisa
- Renderiza texto e interfaces perfeitamente
- Estilo consistente com a marca Liftlio
- Custo: $0.02-0.19 por imagem

#### OPÇÃO 2: Unsplash (grátis)
- **Link**: https://unsplash.com
- **Busque**: "AI", "futuristic", "dashboard", "technology", "data visualization"
- **Use parâmetros**: `?w=1600&h=900&fit=crop&q=80`
- **Temas visuais**: Futurista, Neon, Cyberpunk, High-tech, Minimalista moderno

**⚠️ IMPORTANTE - ESCOLHA IMAGENS RELEVANTES:**
- **SEMPRE** verifique se a imagem corresponde ao tema do card
- **Para Gmail/Email**: Busque "gmail", "email", "mail", "inbox", "google mail"
- **Para AI/ML**: Busque "artificial intelligence", "machine learning", "neural network"
- **Para Analytics**: Busque "analytics dashboard", "data visualization", "charts"
- **EVITE**: Imagens genéricas como "laptop", "computer", "person typing"

**URLs de Imagens Temáticas Recomendadas:**
```typescript
// Para Gmail/Email
"https://images.unsplash.com/photo-1579275542618-a1dfed5f54ba?w=1600&h=900&fit=crop&q=80" // Email interface
"https://images.unsplash.com/photo-1633856404826-8ceb0fdd190c?w=1600&h=900&fit=crop&q=80" // Gmail app
"https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=1600&h=900&fit=crop&q=80" // Email API

// Para AI/Analytics
"https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&h=900&fit=crop&q=80" // Dashboard analytics
"https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=1600&h=900&fit=crop&q=80" // AI visualization
"https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=1600&h=900&fit=crop&q=80" // Data charts
```

**Código para adicionar imagem:**
```typescript
await mcp__trello__attach_image_to_card({
  cardId: "ID_DO_CARD",
  imageUrl: "URL_DA_IMAGEM_APROPRIADA", // Use URLs temáticas acima!
  name: "Nome descritivo da imagem"
});
```

### 4. 🎭 LINGUAGEM QUE EMPOLGA

**Palavras Poderosas para Usar:**
- **Adjetivos**: Revolutionary, Game-changing, Mind-blowing, Next-level, Cutting-edge
- **Verbos**: Unleashed, Launched, Revolutionized, Transformed, Supercharged
- **Impacto**: 10x faster, 100x more powerful, Lightning-fast, Laser-precise
- **Futuro**: The future is here, Next-generation, Industry-leading

**Evite:**
- Linguagem técnica demais
- Descrições secas e sem emoção
- Bullets points sem contexto
- Falta de evidência do impacto

### 5. 📊 EXEMPLO REAL DE CARD ESPETACULAR

```typescript
// Criar o card
const card = await mcp__trello__add_card_to_list({
  listId: "686b442bd7c4de1dbcb52ba8", // Lista Completed
  name: "🚀 PERFORMANCE BOOST - 10X Faster Analytics Engine!",
  description: `## 🔥 WE JUST BROKE THE SPEED BARRIER!

Our engineering team has achieved the IMPOSSIBLE - a 10X performance improvement that makes competitors look like they're stuck in the stone age!

### ⚡ MIND-BLOWING IMPROVEMENTS:
- **Query Speed**: From 3 seconds to 300ms - INSTANT results!
- **Data Processing**: Handles 1 MILLION records without breaking a sweat
- **Real-time Updates**: See changes as they happen - ZERO delay!
- **Memory Usage**: 70% more efficient - runs on a potato if needed!

### 💎 WHAT THIS MEANS FOR YOU:
No more waiting. No more loading screens. No more excuses. Just PURE SPEED that transforms how you work with data.

### 🏆 BENCHMARK RESULTS:
*"We tested against 5 major competitors - Liftlio destroyed them ALL!"*

**STATUS: DEPLOYED TO PRODUCTION 🚀 Users are LOVING IT!**`
});

// Adicionar imagem impactante
await mcp__trello__attach_image_to_card({
  cardId: card.id,
  imageUrl: "https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=1600&h=900&fit=crop&q=80",
  name: "Lightning Fast Performance Visualization"
});
```

### 6. 🎪 DICAS EXTRAS PARA MÁXIMO IMPACTO

1. **Use números grandes**: "Millions of data points", "10X improvement", "24/7 availability"
2. **Crie urgência**: "Just launched", "Available NOW", "Limited time"
3. **Seja específico**: Em vez de "melhor", diga "50% mais rápido"
4. **Conte uma história**: Não liste features, explique a transformação
5. **Use formatação**: Negrito, itálico, bullets, headers - deixe BONITO!

### 7. 🌟 QUANDO CRIAR CARDS EMPOLGANTES

**Sempre crie cards espetaculares para:**
- Novas features lançadas
- Melhorias de performance
- Marcos alcançados
- Correções importantes
- Integrações adicionadas
- Qualquer coisa que impressione!

**Lembre-se**: Cada card é uma oportunidade de mostrar que o Liftlio não é apenas um produto - é uma REVOLUÇÃO! 🔥

## 🖼️ PROCESSO CORRETO PARA ADICIONAR IMAGENS DE CAPA

### ⚠️ IMPORTANTE: SIGA ESTE PROCESSO EXATO OU A IMAGEM NÃO APARECERÁ COMO CAPA!

#### ✅ PROCESSO QUE FUNCIONA:

1. **Gerar a imagem épica**:
   ```bash
   ./.claude/scripts/gpt4o-image.sh "seu prompt aqui" "1536x1024" "high"
   ```

2. **Fazer push para o GitHub ANTES de criar o card**:
   ```bash
   git add liftlio-react/generated-images/nome_da_imagem.png
   git commit -m "Add epic image for [feature]"
   git push
   ```

3. **Criar o card SEM imagem na descrição**:
   ```typescript
   await mcp__trello__add_card_to_list({
     listId: "ID_DA_LISTA",
     name: "🚀 TÍTULO ÉPICO DO CARD!",
     description: "Descrição empolgante SEM ![imagem] markdown"
   });
   ```

4. **Anexar a imagem como arquivo**:
   ```typescript
   await mcp__trello__attach_image_to_card({
     cardId: "ID_DO_CARD_CRIADO",
     imageUrl: "https://raw.githubusercontent.com/BVStecnologia/liftlio-react/main/liftlio-react/generated-images/nome_da_imagem.png",
     name: "Nome descritivo da imagem"
   });
   ```

5. **Resultado**: Trello processa e define automaticamente como capa! ✨

#### ❌ O QUE NÃO FUNCIONA:

1. **NÃO inclua imagem no markdown da descrição**:
   ```markdown
   ![Imagem](URL) <!-- ISSO NÃO VIRA CAPA! -->
   ```

2. **NÃO anexe antes do push no GitHub** - URL local não funciona

3. **NÃO use outros domínios** - use sempre raw.githubusercontent.com

#### 📝 EXEMPLO COMPLETO:

```typescript
// 1. Gerar imagem
// ./gpt4o-image.sh "futuristic email automation" "1536x1024" "high"

// 2. Git push
// git add . && git commit -m "Add image" && git push

// 3. Criar card
const card = await mcp__trello__add_card_to_list({
  listId: "686b4ad61da133ac3b998284",
  name: "🚀 AMAZING FEATURE!",
  description: "Epic description WITHOUT image markdown"
});

// 4. Anexar imagem
await mcp__trello__attach_image_to_card({
  cardId: card.id,
  imageUrl: "https://raw.githubusercontent.com/BVStecnologia/liftlio-react/main/liftlio-react/generated-images/epic_image.png",
  name: "Epic Feature Visualization"
});
```

#### 🎯 CHECKLIST RÁPIDO:
- [ ] Imagem gerada e salva localmente
- [ ] Git push feito ANTES de criar card
- [ ] Card criado SEM markdown de imagem
- [ ] Imagem anexada via `attach_image_to_card`
- [ ] URL usando raw.githubusercontent.com

**SEGUINDO ESTES PASSOS, TODA IMAGEM APARECERÁ COMO CAPA! 🎉**

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
5. **FAÇA PARECER INCRÍVEL** - Sempre que criar cards sobre conquistas, features ou melhorias, siga as diretrizes da seção "COMO CRIAR CARDS ESPETACULARES". Transforme cada atualização em uma celebração do progresso!

## 🎯 LEMBRETE FINAL
**Cada card no Trello é uma vitrine do trabalho incrível sendo feito no Liftlio. Não seja modesto - CELEBRE cada conquista como se fosse mudar o mundo (porque provavelmente vai! 🚀)**