# 🎨 Guia Completo de Geração de Imagens - Projeto Liftlio

## 📋 Visão Geral

Este guia unifica toda a documentação sobre geração de imagens no projeto Liftlio, incluindo APIs disponíveis, configuração e workflows.

---

## 🚀 APIs Disponíveis

### 1. Google Imagen 4.0 ✅ (Configurado e Funcionando)
**Status**: Pronto para uso com API key configurada  
**Custo**: $0.04 por imagem  
**Modelo**: `imagen-4.0-generate-preview-06-06`

#### Configuração Rápida:
```bash
# Script pronto para uso
./.claude/scripts/imagen-api.sh "seu prompt aqui"

# Com parâmetros
./.claude/scripts/imagen-api.sh "modern UI design" "16:9" 2
```

#### API Key:
```
AIzaSyBdOOV1fxo7B5ogOtIcxXkHu60UNXlEjeE
```

### 2. GPT-4o Image Generation (gpt-image-1) ✅ 
**Status**: Configurado e funcionando - Modelo mais avançado!  
**Custo**: $0.02 (low), $0.07 (medium), $0.19 (high)  
**Modelo**: `gpt-image-1` - Geração nativa multimodal

#### Como usar:
```bash
# Geração básica
./.claude/scripts/gpt4o-image.sh "seu prompt aqui"

# Com parâmetros
./.claude/scripts/gpt4o-image.sh "modern UI design" "1024x1024" "medium" 1

# Ver preços
./.claude/scripts/gpt4o-image.sh pricing
```

#### Vantagens sobre DALL-E 3:
- Geração nativa multimodal
- Melhor renderização de texto
- Usa conhecimento do GPT-4o
- Refinamento contextual

### 3. DALL-E 3 (Modelo anterior)
**Status**: Também disponível mas GPT-4o é superior  
**Script**: `.claude/scripts/openai-dalle3.sh`

### 4. Stable Diffusion ⚠️
**Status**: Precisa configurar token Replicate  
**Custo**: ~$0.01 por imagem

### 5. Midjourney ❌
**Status**: Sem API oficial (apenas Discord)

---

## 📁 Estrutura de Arquivos

```
liftlio-react/
├── .claude/
│   └── scripts/
│       ├── imagen-api.sh          # Google Imagen
│       ├── gpt4o-image.sh         # GPT-4o (mais avançado!)
│       ├── openai-dalle3.sh       # DALL-E 3
│       └── image-tools.sh         # Outras ferramentas
├── generated-images/              # Imagens temporárias
├── public/
│   └── generated-images/          # Imagens para produção
│       ├── logos/
│       ├── dashboards/
│       └── ui-components/
└── supabase/
    └── functions/
        └── generate-image/        # Edge Function
```

---

## 🔧 Implementação

### 1. Edge Function Supabase
```typescript
// supabase/functions/generate-image/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, aspectRatio = "1:1", sampleCount = 1 } = await req.json()

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-preview-06-06:predict?key=${Deno.env.get('GOOGLE_IMAGEN_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            outputMimeType: "image/jpeg",
            sampleCount,
            aspectRatio,
            personGeneration: "ALLOW_ADULT"
          }
        })
      }
    )

    const data = await response.json()
    
    const images = data.predictions?.map((pred: any) => ({
      base64: pred.bytesBase64Encoded,
      mimeType: 'image/jpeg'
    })) || []

    return new Response(JSON.stringify({ 
      success: true, 
      images,
      prompt,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

### 2. Componente React
```typescript
// src/components/ImageGenerator.tsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function ImageGenerator() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)

  const generateImage = async () => {
    if (!prompt.trim()) return

    setLoading(true)
    try {
      const { data } = await supabase.functions.invoke('generate-image', {
        body: { prompt, aspectRatio: '1:1' }
      })

      if (data.success && data.images[0]) {
        const base64 = data.images[0].base64
        const blob = base64ToBlob(base64)
        const url = URL.createObjectURL(blob)
        setGeneratedImage(url)
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4">Gerador de Imagens</h3>
      
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Descreva a imagem..."
        className="w-full p-3 border rounded-md"
        rows={3}
      />
      
      <button
        onClick={generateImage}
        disabled={loading || !prompt.trim()}
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md"
      >
        {loading ? 'Gerando...' : 'Gerar Imagem'}
      </button>
      
      {generatedImage && (
        <img 
          src={generatedImage} 
          alt="Gerada"
          className="mt-4 w-full max-w-md rounded-md"
        />
      )}
    </div>
  )
}

// Função auxiliar
function base64ToBlob(base64: string): Blob {
  const byteCharacters = atob(base64)
  const byteArray = new Uint8Array(byteCharacters.length)
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i)
  }
  
  return new Blob([byteArray], { type: 'image/jpeg' })
}
```

---

## 🏠 Workflow Local (Desenvolvimento)

### Geração Rápida:
```bash
# Gerar imagem
./.claude/scripts/imagen-api.sh "modern dashboard UI"

# Listar imagens
./.claude/scripts/imagen-api.sh list

# Limpar antigas
./.claude/scripts/imagen-api.sh clean
```

### Organização:
```bash
# Mover para pasta pública
mv generated-images/imagen_*.jpeg public/generated-images/dashboards/

# Criar estrutura
mkdir -p public/generated-images/{logos,backgrounds,icons,avatars}
```

---

## 💰 Custos e Performance

| API | Custo/imagem | Velocidade | Qualidade |
|-----|--------------|------------|-----------|
| GPT-4o (gpt-image-1) | $0.02-0.19 | Rápido | Superior |
| Google Imagen 4.0 | $0.04 | Rápido | Excelente |
| DALL-E 3 | $0.04-0.08 | Médio | Muito boa |
| Stable Diffusion | ~$0.01 | Lento | Boa |

---

## 🚀 Exemplos de Uso

### Logos e Branding:
```bash
# Com GPT-4o (recomendado - melhor qualidade)
./.claude/scripts/gpt4o-image.sh "minimalist tech logo, geometric design" "1024x1024" "medium"

# Com Google Imagen
./.claude/scripts/imagen-api.sh "minimalist tech logo, geometric design" "1:1"
```

### Dashboards:
```bash
# Com GPT-4o (renderiza texto perfeitamente)
./.claude/scripts/gpt4o-image.sh "modern analytics dashboard with charts, dark theme" "1792x1024" "high"

# Com Google Imagen
./.claude/scripts/imagen-api.sh "modern analytics dashboard, dark theme, charts" "16:9"
```

### Avatars:
```bash
# Com GPT-4o (melhor para rostos)
./.claude/scripts/gpt4o-image.sh "professional user avatar, friendly smile" "1024x1024" "low"

# Com Google Imagen
./.claude/scripts/imagen-api.sh "professional user avatar, neutral background" "1:1"
```

### UI Components:
```bash
# Com GPT-4o (precisão nos detalhes)
./.claude/scripts/gpt4o-image.sh "glassmorphism button with hover state, blue gradient" "1024x1024" "medium"

# Com Google Imagen
./.claude/scripts/imagen-api.sh "glassmorphism button design, blue gradient" "4:3"
```

---

## 🔐 Segurança

1. **API Keys**:
   - Usar Supabase Vault em produção
   - Nunca commitar keys no código
   
2. **Rate Limiting**:
   - Implementar limite de requisições
   - Monitorar uso via Google Cloud Console

3. **Validação**:
   - Sanitizar prompts do usuário
   - Limitar tamanho dos prompts

---

## 📝 Checklist de Implementação

- [x] Script Google Imagen configurado
- [x] Script GPT-4o configurado e testado
- [x] API keys configuradas no .env
- [x] Estrutura de pastas criada
- [ ] Edge Function deployada no Supabase
- [ ] Componente React integrado
- [ ] API keys no Vault do Supabase
- [ ] Rate limiting configurado
- [ ] Monitoramento de custos

---

## 🆘 Troubleshooting

### Erro "Billing not enabled":
- Ativar billing no Google Cloud Console
- Verificar se a API está habilitada

### Imagem não aparece:
- Verificar console para erros
- Confirmar que base64 está completo
- Testar com prompt mais simples

### Performance lenta:
- Usar cache para imagens repetidas
- Implementar lazy loading
- Comprimir imagens antes de salvar

---

## 📚 Referências

- [Google Imagen Docs](https://cloud.google.com/vertex-ai/docs/generative-ai/image/generate-images)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Script Local](./.claude/scripts/imagen-api.sh)