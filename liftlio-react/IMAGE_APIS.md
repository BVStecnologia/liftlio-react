# APIs de Geração de Imagem - Liftlio

## 🎨 APIs Configuradas

### 1. Google Imagen 4.0
- **Status**: ❌ Requer billing ativado
- **Script**: `.claude/scripts/imagen-api.sh`
- **Uso**: `./imagen-api.sh "seu prompt"`
- **API Key**: Configurada mas precisa de conta paga

### 2. OpenAI DALL-E 3
- **Status**: ✅ Pronto para usar (já tem API key no Supabase)
- **Como usar**:
```bash
source .claude/scripts/image-tools.sh
dalle "um gato usando óculos escuros" "1024x1024" "hd"
```

### 3. Stable Diffusion (Replicate)
- **Status**: ⚠️ Precisa de API token
- **Obter token**: https://replicate.com/account/api-tokens
- **Configurar**: `echo "seu_token" > ~/.replicate_token`

### 4. Midjourney
- **Status**: ❌ Sem API oficial
- **Alternativa**: Usar via Discord bot

## 🚀 Como Usar no Projeto

### Opção 1: Direto no Terminal
```bash
# Carregar as ferramentas
source /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/.claude/scripts/image-tools.sh

# Gerar imagem
dalle "logo futurista para Liftlio"
imagen "dashboard analytics moderno"
stable_diffusion "user avatar cyberpunk style"

# Ver última imagem gerada
view_latest
```

### Opção 2: Edge Function no Supabase
```typescript
// Criar edge function: generate-image
Deno.serve(async (req) => {
  const { prompt, provider = 'dalle' } = await req.json()
  
  // Chamar API escolhida
  // Retornar URL da imagem
})
```

### Opção 3: Integrar no Frontend
```typescript
// Em um componente React
const generateImage = async (prompt: string) => {
  const { data } = await supabase.functions.invoke('generate-image', {
    body: { prompt, provider: 'dalle' }
  })
  return data.imageUrl
}
```

## 📁 Onde as Imagens São Salvas
- Local: `/liftlio-react/generated-images/`
- Formato: `provider_timestamp_prompt.extension`
- Limpeza automática: Imagens > 7 dias

## 🔧 Comandos Úteis
```bash
# Listar todas as imagens geradas
imagen list

# Limpar imagens antigas
imagen clean

# Ver ajuda
image_help
```

## 💡 Dicas
1. DALL-E 3 é mais fácil de começar (já tem API key)
2. Stable Diffusion é gratuito mas precisa configurar
3. Google Imagen tem qualidade excelente mas precisa pagar
4. Sempre salve imagens importantes no Supabase Storage

## 🔐 Segurança
- API keys nunca no código
- Usar Supabase Vault para produção
- Edge Functions para ocultar credenciais
- Rate limiting para evitar abuso