# 📸 INSTRUÇÕES PARA CRIAR CARDS TRELLO COM IMAGEM OPENAI

## ⚠️ PROCESSO CORRETO - CLAUDE DEVE FAZER ANTES DE CHAMAR O AGENTE

### PASSO 1: Claude gera a imagem ANTES de chamar o agente
```bash
# Claude executa diretamente:
/Users/valdair/Documents/Projetos/Liftlio/.claude/scripts/gpt-image-1.sh \
  "descrição da imagem, purple gradient #8b5cf6 to #a855f7, Liftlio branding" \
  "1792x1024" \
  "hd"
```

### PASSO 2: Claude cria Edge Function no Supabase para upload
```typescript
// Claude usa mcp__supabase__deploy_edge_function
// Para criar função que recebe a imagem e salva no Storage
// Retorna URL pública da imagem
```

### PASSO 3: Claude faz upload da imagem
```bash
# Claude executa curl para enviar imagem para Edge Function
curl -X POST "url-da-edge-function" \
  -F "file=@/path/to/image.png"
# Recebe URL do Supabase
```

### PASSO 4: AGORA SIM chama o agente Trello
```typescript
// Claude passa para o agente:
// - URL da imagem JÁ PRONTA do Supabase
// - Contexto completo do trabalho
// - Instruções para criar e anexar

Task({
  subagent_type: "general-purpose",
  prompt: `
    Crie card no Trello com estes dados:
    - Título: [...]
    - Descrição: [...]
    - Imagem para anexar: ${supabaseImageUrl}
    
    USE ESTAS FERRAMENTAS:
    1. mcp__trello__add_card_to_list
    2. mcp__trello__attach_image_to_card (com a URL fornecida)
  `
})
```

## ❌ O QUE NÃO FUNCIONA

### Agente NÃO PODE:
- Executar scripts bash locais
- Acessar arquivos em `/Users/valdair/`
- Gerar imagens diretamente com OpenAI
- Criar Edge Functions

### Por isso CLAUDE DEVE:
1. Gerar imagem ANTES
2. Fazer upload ANTES
3. Passar URL PRONTA para o agente

## ✅ CHECKLIST ANTES DE CHAMAR AGENTE

Claude, verifique:
- [ ] Executei gpt-image-1.sh? 
- [ ] Fiz upload para Supabase?
- [ ] Tenho a URL pública?
- [ ] Vou passar URL pronta para o agente?

## 📝 EXEMPLO COMPLETO

```typescript
// 1. CLAUDE executa (não o agente!)
bash: /Users/valdair/Documents/Projetos/Liftlio/.claude/scripts/gpt-image-1.sh \
  "security victory purple gradient" "1792x1024" "hd"

// 2. CLAUDE faz upload e pega URL
const imageUrl = "https://suqjifkhmekcdflwowiw.supabase.co/storage/v1/object/public/trello-images/security-victory.png"

// 3. AGORA chama agente com URL pronta
Task({
  subagent_type: "general-purpose", 
  prompt: `
    Crie card Trello:
    - Board: 686b43ced8d30f8eb12b9d12
    - Lista: Completadas (686b442bd7c4de1dbcb52ba8)
    - Título: "🔐 Security Migration Complete"
    - ANEXE ESTA IMAGEM: ${imageUrl}
    
    Use mcp__trello__add_card_to_list e depois
    mcp__trello__attach_image_to_card com a URL fornecida
  `
})
```

## 🚨 REGRA DE OURO

**AGENTE = Só cria card e anexa URL pronta**
**CLAUDE = Faz todo trabalho de gerar/upload ANTES**

Agente recebe URL pronta, não gera nada!