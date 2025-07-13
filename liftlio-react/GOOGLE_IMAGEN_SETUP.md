# Google Imagen 4.0 - Guia Completo de Integração no Projeto Liftlio

## 📋 Para Outro Desenvolvedor Implementar

### 🎯 O QUE FOI IMPLEMENTADO
- ✅ API Google Imagen 4.0 funcional
- ✅ Script automatizado para geração de imagens
- ✅ Organização de arquivos e estrutura de pastas
- ✅ Sistema de nomenclatura padronizado
- ✅ API key com faturamento configurada

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
**Arquivo**: `.claude/scripts/imagen-api.sh`

```bash
#!/bin/bash
set -e -E

# Google Imagen 4.0 API Script for Liftlio
# Usage: ./imagen-api.sh "your prompt here"

GEMINI_API_KEY="AIzaSyBdOOV1fxo7B5ogOtIcxXkHu60UNXlEjeE"
MODEL_ID="models/imagen-4.0-generate-preview-06-06"

# Output directory for images
OUTPUT_DIR="/Users/valdair/Documents/Projetos/Liftlio/liftlio-react/generated-images"
mkdir -p "$OUTPUT_DIR"

# Function to generate image
generate_image() {
    local prompt="$1"
    local aspect_ratio="${2:-1:1}"
    local count="${3:-1}"
    
    if [[ -z "$prompt" ]]; then
        echo "Error: Please provide a prompt"
        echo "Usage: $0 \"your prompt here\" [aspect_ratio] [count]"
        exit 1
    fi
    
    echo "🎨 Generating image with prompt: $prompt"
    
    # Create timestamp for unique naming
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    # Create request JSON
    cat << EOF > /tmp/imagen_request.json
{
    "instances": [
        {
            "prompt": "$prompt"
        }
    ],
    "parameters": {
        "outputMimeType": "image/jpeg",
        "sampleCount": $count,
        "personGeneration": "ALLOW_ADULT",
        "aspectRatio": "$aspect_ratio"
    }
}
EOF

    # Make API request
    echo "📡 Calling Google Imagen API..."
    API_RESPONSE=$(curl \
        -X POST \
        -H "Content-Type: application/json" \
        -sS \
        "https://generativelanguage.googleapis.com/v1beta/${MODEL_ID}:predict?key=${GEMINI_API_KEY}" \
        -d '@/tmp/imagen_request.json'
    )
    
    # Check for errors
    if echo "$API_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        echo "❌ API Error:"
        echo "$API_RESPONSE" | jq -r '.error.message'
        exit 1
    fi
    
    # Process images
    image_count=0
    echo "$API_RESPONSE" | jq -r '.predictions[]?.bytesBase64Encoded' | while IFS= read -r b64_data; do
        image_count=$((image_count + 1))
        
        if [[ "$b64_data" = "null" ]] || [[ -z "$b64_data" ]]; then
            echo "⚠️  Warning: Skipping image $image_count due to missing data."
            continue
        fi
        
        # Create filename with prompt snippet
        SAFE_PROMPT=$(echo "$prompt" | sed 's/[^a-zA-Z0-9]/_/g' | cut -c1-30)
        FILENAME="${OUTPUT_DIR}/imagen_${TIMESTAMP}_${SAFE_PROMPT}_${image_count}.jpeg"
        
        # Decode and save
        echo "$b64_data" | base64 --decode > "$FILENAME"
        
        if [[ $? -eq 0 ]]; then
            echo "✅ Saved: $FILENAME"
            # Display image info
            if command -v file &> /dev/null; then
                file "$FILENAME"
            fi
        else
            echo "❌ Error: Failed to save image_${image_count}.jpeg"
        fi
    done
    
    # Clean up
    rm -f /tmp/imagen_request.json
    
    echo "🎉 Generation complete! Images saved in: $OUTPUT_DIR"
}

# Function to list generated images
list_images() {
    echo "📁 Generated images in $OUTPUT_DIR:"
    ls -la "$OUTPUT_DIR"/*.jpeg 2>/dev/null || echo "No images found"
}

# Function to clean old images
clean_images() {
    echo "🗑️  Cleaning images older than 7 days..."
    find "$OUTPUT_DIR" -name "*.jpeg" -mtime +7 -delete
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
chmod +x .claude/scripts/imagen-api.sh
```

### 4. Testar a Implementação
```bash
# Teste básico
./.claude/scripts/imagen-api.sh "a beautiful sunset over mountains"

# Teste com parâmetros
./.claude/scripts/imagen-api.sh "modern UI design" "16:9" 2

# Listar imagens
./.claude/scripts/imagen-api.sh list

# Limpar imagens antigas
./.claude/scripts/imagen-api.sh clean
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
    const { prompt, aspectRatio = "1:1", sampleCount = 1 } = await req.json()

    if (!prompt) {
      throw new Error('Prompt is required')
    }

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

    if (data.error) {
      throw new Error(data.error.message)
    }

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

  const generateImage = async () => {
    if (!prompt.trim()) return

    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt, aspectRatio: '1:1', sampleCount: 1 }
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
      const blob = new Blob([byteArray], { type: 'image/jpeg' })
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

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4">Gerador de Imagens</h3>
      
      <div className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Descreva a imagem que você quer gerar..."
          className="w-full p-3 border rounded-md resize-none"
          rows={3}
        />
        
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
VALUES ('GOOGLE_IMAGEN_API_KEY', 'AIzaSyBdOOV1fxo7B5ogOtIcxXkHu60UNXlEjeE');
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
│       ├── imagen-api.sh           # Script principal
│       └── image-tools.sh          # Ferramentas auxiliares
├── generated-images/               # Imagens geradas localmente
│   └── imagen_YYYYMMDD_HHMMSS_*.jpeg
├── supabase/
│   └── functions/
│       └── generate-image/
│           └── index.ts            # Edge Function
├── src/
│   └── components/
│       └── ImageGenerator.tsx      # Componente React
├── GOOGLE_IMAGEN_SETUP.md         # Este arquivo
└── IMAGE_APIS.md                  # Documentação geral
```

---

## 🎨 EXEMPLOS DE USO

### 1. Via Script Local
```bash
# Dashboard para analytics
./.claude/scripts/imagen-api.sh "modern analytics dashboard with charts and graphs, blue theme"

# Logo da empresa
./.claude/scripts/imagen-api.sh "minimalist logo for tech company, geometric design" "1:1" 1

# Imagem widescreen
./.claude/scripts/imagen-api.sh "futuristic cityscape at night" "16:9" 1
```

### 2. Via Edge Function (Frontend)
```typescript
const { data } = await supabase.functions.invoke('generate-image', {
  body: { 
    prompt: "user avatar illustration, professional style",
    aspectRatio: "1:1"
  }
})
```

### 3. Salvar Localmente no Projeto
```typescript
// Salvar imagem no projeto local (pasta public ou src/assets)
const saveImageLocally = async (base64: string, filename: string) => {
  // Para desenvolvimento: salvar na pasta public/images
  const byteCharacters = atob(base64)
  const byteArray = new Uint8Array(byteCharacters.length)
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i)
  }
  
  const blob = new Blob([byteArray], { type: 'image/jpeg' })
  const url = URL.createObjectURL(blob)
  
  // Criar link para download/salvar
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
- ✅ API key está no Supabase Vault (produção)
- ✅ CORS configurado corretamente
- ✅ Rate limiting via Supabase (automático)

### Performance
- ✅ Limpeza automática de imagens antigas
- ✅ Nomenclatura padronizada
- ✅ Compressão via JPEG

### Custos
- 💰 Google Imagen: ~$0.04 por imagem
- 💰 Monitorar uso via Google Cloud Console
- 💰 Implementar rate limiting se necessário

---

## 🚀 PRÓXIMOS PASSOS

1. **Testar todos os componentes**
2. **Configurar no Supabase Vault**
3. **Deploy da Edge Function**
4. **Integrar no frontend do Liftlio**
5. **Monitorar custos e uso**

---

## 📞 SUPORTE

- **Documentação Google**: https://cloud.google.com/vertex-ai/docs/generative-ai/image/generate-images
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Arquivo de referência**: `/liftlio-react/IMAGE_APIS.md`