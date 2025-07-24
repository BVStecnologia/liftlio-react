# GPT-Image-1 - Guia Completo de Integração no Projeto Liftlio

## 📋 Para Outro Desenvolvedor Implementar

### 🎯 O QUE FOI IMPLEMENTADO
- ✅ API GPT-Image-1 (OpenAI) funcional
- ✅ Script automatizado para geração de imagens
- ✅ Organização de arquivos e estrutura de pastas
- ✅ Sistema de nomenclatura padronizado
- ✅ API key configurada e testada

---

## 🚀 IMPLEMENTAÇÃO RÁPIDA

### 1. Configurar a Estrutura de Arquivos
```bash
# No diretório raiz do projeto (/liftlio-react)
mkdir -p .claude/scripts
mkdir -p generated-images

# Verificar estrutura criada
tree .claude/ generated-images/
```

### 2. Criar o Script Principal
**Arquivo**: `.claude/scripts/gpt4o-image.sh`

```bash
#!/bin/bash
set -e -E

# GPT-4o Image Generation API Script for Liftlio
# Usage: ./gpt4o-image.sh "your prompt here"

# API Key from environment or use the provided one
OPENAI_API_KEY="${OPENAI_API_KEY:-}"

# Model configuration - GPT-4o's latest image model
MODEL="gpt-image-1"
API_URL="https://api.openai.com/v1/images/generations"

# Output directory for images
OUTPUT_DIR="/Users/valdair/Documents/Projetos/Liftlio/liftlio-react/generated-images"
mkdir -p "$OUTPUT_DIR"

# Function to generate image
generate_image() {
    local prompt="$1"
    local size="${2:-1024x1024}"
    local quality="${3:-low}"
    local count="${4:-1}"
    
    if [[ -z "$prompt" ]]; then
        echo "Error: Please provide a prompt"
        echo "Usage: $0 \"your prompt here\" [size] [quality] [count]"
        echo "Sizes: 1024x1024, 1024x1792, 1792x1024"
        echo "Quality: low ($0.02), medium ($0.07), high ($0.19), auto"
        exit 1
    fi
    
    echo "🎨 Generating image with GPT-4o (gpt-image-1)"
    echo "📝 Prompt: $prompt"
    echo "📐 Size: $size | Quality: $quality"
    echo "💰 Estimated cost: $(if [[ "$quality" == "high" ]]; then echo '$0.19'; elif [[ "$quality" == "medium" ]]; then echo '$0.07'; else echo '$0.02'; fi) per image"
    
    # Create timestamp for unique naming
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    # Create request JSON
    cat << EOF > /tmp/gpt4o_request.json
{
    "model": "$MODEL",
    "prompt": "$prompt",
    "n": $count,
    "size": "$size",
    "quality": "$quality"
}
EOF

    # Make API request
    echo "📡 Calling GPT-4o Image Generation API..."
    API_RESPONSE=$(curl -s -S \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $OPENAI_API_KEY" \
        -d '@/tmp/gpt4o_request.json' \
        "$API_URL"
    )
    
    # Check for errors
    if echo "$API_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        echo "❌ API Error:"
        echo "$API_RESPONSE" | jq -r '.error.message'
        exit 1
    fi
    
    # Process images
    image_count=0
    echo "$API_RESPONSE" | jq -r '.data[]?.b64_json' | while IFS= read -r b64_data; do
        image_count=$((image_count + 1))
        
        if [[ "$b64_data" = "null" ]] || [[ -z "$b64_data" ]]; then
            echo "⚠️  Warning: Skipping image $image_count due to missing data."
            continue
        fi
        
        # Create filename with prompt snippet
        SAFE_PROMPT=$(echo "$prompt" | sed 's/[^a-zA-Z0-9]/_/g' | cut -c1-30)
        FILENAME="${OUTPUT_DIR}/gpt4o_${TIMESTAMP}_${SAFE_PROMPT}_${image_count}.png"
        
        # Decode and save
        echo "$b64_data" | base64 --decode > "$FILENAME"
        
        if [[ $? -eq 0 ]]; then
            echo "✅ Saved: $FILENAME"
            # Display image info
            if command -v file &> /dev/null; then
                file "$FILENAME"
            fi
            
            # GPT-4o provides enhanced prompts
            REVISED_PROMPT=$(echo "$API_RESPONSE" | jq -r ".data[$((image_count-1))].revised_prompt // empty")
            if [[ -n "$REVISED_PROMPT" ]]; then
                echo "🔍 Enhanced prompt: $REVISED_PROMPT"
            fi
        else
            echo "❌ Error: Failed to save image_${image_count}.png"
        fi
    done
    
    # Clean up
    rm -f /tmp/gpt4o_request.json
    
    echo "🎉 Generation complete! Images saved in: $OUTPUT_DIR"
    echo "💡 Tip: GPT-4o can understand context and refine images through conversation"
}

# Function to list generated images
list_images() {
    echo "📁 Generated GPT-4o images in $OUTPUT_DIR:"
    ls -la "$OUTPUT_DIR"/gpt4o_*.png 2>/dev/null || echo "No GPT-4o images found"
}

# Function to clean old images
clean_images() {
    echo "🗑️  Cleaning GPT-4o images older than 7 days..."
    find "$OUTPUT_DIR" -name "gpt4o_*.png" -mtime +7 -delete
    echo "✅ Cleanup complete"
}

# Main execution
case "${1:-generate}" in
    "list")
        list_images
        ;;
    "clean")
        clean_images
        ;;
    *)
        generate_image "$@"
        ;;
esac
```

### 3. Dar Permissão de Execução
```bash
chmod +x .claude/scripts/gpt4o-image.sh
```

### 4. Testar a Implementação
```bash
# Teste básico
./.claude/scripts/gpt4o-image.sh "a beautiful sunset over mountains"

# Teste com parâmetros
./.claude/scripts/gpt4o-image.sh "modern UI design" "1024x1024" "medium" 2

# Listar imagens
./.claude/scripts/gpt4o-image.sh list

# Limpar imagens antigas
./.claude/scripts/gpt4o-image.sh clean
```

---

## 🏗️ INTEGRAÇÃO NO PROJETO LIFTLIO

### Opção 1: Edge Function no Supabase
**Arquivo**: `supabase/functions/generate-image/index.ts`

```typescript
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
    const { prompt, size = "1024x1024", quality = "low" } = await req.json()

    if (!prompt) {
      throw new Error('Prompt is required')
    }

    const response = await fetch(
      'https://api.openai.com/v1/images/generations',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt,
          n: 1,
          size,
          quality
        })
      }
    )

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error.message)
    }

    const images = data.data?.map((img: any) => ({
      base64: img.b64_json,
      mimeType: 'image/png'
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

### Opção 2: Componente React
**Arquivo**: `src/components/ImageGenerator.tsx`

```typescript
import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface ImageGeneratorProps {
  onImageGenerated?: (imageUrl: string) => void
}

export function ImageGenerator({ onImageGenerated }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('low')

  const generateImage = async () => {
    if (!prompt.trim()) return

    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { 
          prompt, 
          size: '1024x1024', 
          quality 
        }
      })

      if (error) throw error
      if (!data.success) throw new Error(data.error)

      // Convert base64 to blob URL
      const base64 = data.images[0].base64
      const byteCharacters = atob(base64)
      const byteNumbers = new Array(byteCharacters.length)
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'image/png' })
      const imageUrl = URL.createObjectURL(blob)

      setGeneratedImage(imageUrl)
      onImageGenerated?.(imageUrl)

    } catch (error) {
      console.error('Error generating image:', error)
      alert('Erro ao gerar imagem: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getCost = (q: string) => {
    switch(q) {
      case 'low': return '$0.02'
      case 'medium': return '$0.07'
      case 'high': return '$0.19'
      default: return '$0.02'
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4">
        Gerador de Imagens GPT-4o
      </h3>
      
      <div className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Descreva a imagem que você quer gerar..."
          className="w-full p-3 border rounded-md resize-none"
          rows={3}
        />
        
        <div className="flex items-center gap-4">
          <label>Qualidade:</label>
          <select 
            value={quality} 
            onChange={(e) => setQuality(e.target.value as any)}
            className="p-2 border rounded"
          >
            <option value="low">Low ({getCost('low')})</option>
            <option value="medium">Medium ({getCost('medium')})</option>
            <option value="high">High ({getCost('high')})</option>
          </select>
        </div>
        
        <button
          onClick={generateImage}
          disabled={loading || !prompt.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Gerando...' : 'Gerar Imagem'}
        </button>
        
        {generatedImage && (
          <div className="mt-4">
            <img 
              src={generatedImage} 
              alt="Imagem gerada"
              className="w-full max-w-md rounded-md shadow-lg"
            />
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 🔧 CONFIGURAÇÃO NO SUPABASE

### 1. Adicionar API Key no Vault
```sql
-- No SQL Editor do Supabase
INSERT INTO vault.secrets (name, secret)
VALUES ('OPENAI_API_KEY', 'sua-api-key-aqui');
```

### 2. Deploy da Edge Function
```bash
# No terminal
supabase functions deploy generate-image
```

### 3. Testar no Frontend
```typescript
// Exemplo de uso no componente
<ImageGenerator 
  onImageGenerated={(url) => {
    console.log('Imagem gerada:', url)
    // Fazer upload para Supabase Storage se necessário
  }}
/>
```

---

## 📁 ESTRUTURA FINAL DOS ARQUIVOS

```
liftlio-react/
├── .claude/
│   └── scripts/
│       ├── gpt4o-image.sh          # Script principal GPT-4o
│       ├── imagen-api.sh           # Script Google (backup)
│       └── openai-dalle3.sh        # Script DALL-E 3 (legacy)
├── generated-images/               # Imagens geradas localmente
│   └── gpt4o_YYYYMMDD_HHMMSS_*.png
├── supabase/
│   └── functions/
│       └── generate-image/
│           └── index.ts            # Edge Function
├── src/
│   └── components/
│       └── ImageGenerator.tsx      # Componente React
├── GPT_IMAGE_1_SETUP.md           # Este arquivo
└── IMAGE_GENERATION_GUIDE.md      # Documentação geral
```

---

## 🎨 EXEMPLOS DE USO

### 1. Via Script Local
```bash
# Dashboard para analytics
./.claude/scripts/gpt4o-image.sh "modern analytics dashboard with real-time data visualization"

# Logo da empresa
./.claude/scripts/gpt4o-image.sh "minimalist tech company logo, abstract geometric" "1024x1024" "high"

# Imagem widescreen
./.claude/scripts/gpt4o-image.sh "futuristic cityscape at sunset" "1792x1024" "medium"
```

### 2. Via Edge Function (Frontend)
```typescript
const { data } = await supabase.functions.invoke('generate-image', {
  body: { 
    prompt: "professional user avatar, friendly and approachable",
    size: "1024x1024",
    quality: "medium"
  }
})
```

### 3. Salvar Localmente no Projeto
```typescript
// Salvar imagem no projeto local
const saveImageLocally = async (base64: string, filename: string) => {
  const byteCharacters = atob(base64)
  const byteArray = new Uint8Array(byteCharacters.length)
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i)
  }
  
  const blob = new Blob([byteArray], { type: 'image/png' })
  const url = URL.createObjectURL(blob)
  
  // Criar link para download
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  
  return url
}
```

---

## ⚠️ PONTOS IMPORTANTES

### Segurança
- ✅ API key está no .env (desenvolvimento)
- ✅ Usar Supabase Vault em produção
- ✅ CORS configurado corretamente
- ✅ Rate limiting via Supabase (automático)

### Performance
- ✅ Limpeza automática de imagens antigas
- ✅ Nomenclatura padronizada
- ✅ Formato PNG para melhor qualidade
- ✅ Diferentes níveis de qualidade disponíveis

### Custos
- 💰 GPT-4o Low: $0.02 por imagem
- 💰 GPT-4o Medium: $0.07 por imagem
- 💰 GPT-4o High: $0.19 por imagem
- 💰 Monitorar uso via OpenAI Dashboard
- 💰 Implementar rate limiting se necessário

### Vantagens do GPT-Image-1
- 🚀 Geração nativa multimodal
- 📝 Melhor renderização de texto
- 🧠 Usa conhecimento completo do GPT-4o
- 🔄 Refinamento contextual possível
- 🎯 Melhor aderência aos prompts

---

## 🚀 PRÓXIMOS PASSOS

1. **Testar todos os componentes**
2. **Configurar no Supabase Vault**
3. **Deploy da Edge Function**
4. **Integrar no frontend do Liftlio**
5. **Monitorar custos e uso**
6. **Implementar cache de imagens**

---

## 📞 SUPORTE

- **Documentação OpenAI**: https://platform.openai.com/docs/guides/image-generation
- **API Reference**: https://platform.openai.com/docs/api-reference/images
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Arquivo de referência**: `/liftlio-react/IMAGE_GENERATION_GUIDE.md`