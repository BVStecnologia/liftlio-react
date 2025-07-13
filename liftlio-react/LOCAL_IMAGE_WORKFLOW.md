# 🏠 Workflow de Imagens LOCAIS - Projeto Liftlio

## ✅ POR QUE USAR PROJETO LOCAL?

### Vantagens do Armazenamento Local:
- 🚀 **Mais rápido** - Sem upload/download
- 💰 **Sem custos** - Não usa storage pago
- 🔧 **Mais simples** - Direto no file system
- 🎯 **Desenvolvimento** - Ideal para testes
- 📁 **Controle total** - Arquivos no seu projeto

---

## 📁 ESTRUTURA RECOMENDADA

```
liftlio-react/
├── public/
│   └── generated-images/           # Imagens acessíveis via URL
│       ├── logos/
│       ├── dashboards/
│       └── ui-components/
├── src/
│   └── assets/
│       └── generated/              # Imagens do build
└── generated-images/               # Imagens locais (script)
    └── imagen_YYYYMMDD_*.jpeg
```

---

## 🔄 FLUXOS DE TRABALHO

### 1. **Geração via Script (Desenvolvimento)**
```bash
# Gerar imagem
./.claude/scripts/imagen-api.sh "modern button design"

# Imagem salva em: ./generated-images/imagen_20250713_button_1.jpeg

# Mover para projeto (se quiser usar)
mv generated-images/imagen_20250713_button_1.jpeg public/generated-images/ui-components/button.jpeg
```

### 2. **Geração via Frontend (Runtime)**
```typescript
const ImageGenerator = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const generateAndSave = async (prompt: string) => {
    // Gerar via Edge Function
    const { data } = await supabase.functions.invoke('generate-image', {
      body: { prompt }
    })

    // Converter base64 para Blob URL (temporário)
    const blob = base64ToBlob(data.images[0].base64)
    const url = URL.createObjectURL(blob)
    
    setImageUrl(url)
    
    // Opcional: Trigger download para salvar no computador
    downloadImage(blob, `generated-${Date.now()}.jpeg`)
  }

  return (
    <div>
      <button onClick={() => generateAndSave("logo design")}>
        Gerar Logo
      </button>
      {imageUrl && <img src={imageUrl} alt="Generated" />}
    </div>
  )
}
```

### 3. **Integração com Assets do Projeto**
```typescript
// Em src/assets/images.ts
export const generatedAssets = {
  logos: {
    primary: '/generated-images/logos/primary-logo.jpeg',
    secondary: '/generated-images/logos/secondary-logo.jpeg'
  },
  dashboards: {
    analytics: '/generated-images/dashboards/analytics-bg.jpeg',
    reports: '/generated-images/dashboards/reports-bg.jpeg'
  }
}

// Uso no componente
import { generatedAssets } from '../assets/images'

const Dashboard = () => (
  <div style={{ backgroundImage: `url(${generatedAssets.dashboards.analytics})` }}>
    <img src={generatedAssets.logos.primary} alt="Logo" />
  </div>
)
```

---

## 🛠️ FUNÇÕES UTILITÁRIAS

### Arquivo: `src/utils/imageUtils.ts`
```typescript
// Converter base64 para Blob
export const base64ToBlob = (base64: string, mimeType = 'image/jpeg'): Blob => {
  const byteCharacters = atob(base64)
  const byteArray = new Uint8Array(byteCharacters.length)
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i)
  }
  
  return new Blob([byteArray], { type: mimeType })
}

// Download automático
export const downloadImage = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Salvar na pasta public (apenas desenvolvimento)
export const saveToPublic = async (base64: string, path: string) => {
  // Nota: Isso só funciona em desenvolvimento
  // Em produção, usar download ou API personalizada
  
  const blob = base64ToBlob(base64)
  const formData = new FormData()
  formData.append('file', blob, path)
  
  // Enviar para endpoint que salva no file system
  const response = await fetch('/api/save-image', {
    method: 'POST',
    body: formData
  })
  
  return response.ok
}
```

---

## 🎯 CASOS DE USO PRÁTICOS

### 1. **Gerar Assets para UI**
```bash
# Gerar backgrounds para dashboards
./.claude/scripts/imagen-api.sh "abstract geometric background, dark blue gradient" "16:9"

# Gerar ícones
./.claude/scripts/imagen-api.sh "minimalist icon for analytics, flat design" "1:1"

# Gerar avatars
./.claude/scripts/imagen-api.sh "professional user avatar, neutral background" "1:1"
```

### 2. **Organizar por Categoria**
```bash
# Criar estrutura organizada
mkdir -p public/generated-images/{logos,backgrounds,icons,avatars}

# Mover imagens geradas
mv generated-images/imagen_*_logo_* public/generated-images/logos/
mv generated-images/imagen_*_background_* public/generated-images/backgrounds/
```

### 3. **Automatizar com Script**
```bash
# Arquivo: .claude/scripts/organize-images.sh
#!/bin/bash

# Organizar imagens por tipo
organize_images() {
    local source_dir="generated-images"
    local dest_dir="public/generated-images"
    
    mkdir -p "$dest_dir"/{logos,backgrounds,icons,avatars,ui-components}
    
    # Mover por palavras-chave no nome
    mv "$source_dir"/*logo* "$dest_dir/logos/" 2>/dev/null
    mv "$source_dir"/*background* "$dest_dir/backgrounds/" 2>/dev/null
    mv "$source_dir"/*icon* "$dest_dir/icons/" 2>/dev/null
    mv "$source_dir"/*avatar* "$dest_dir/avatars/" 2>/dev/null
    mv "$source_dir"/*button* "$dest_dir/ui-components/" 2>/dev/null
    
    echo "✅ Imagens organizadas em $dest_dir"
}

organize_images
```

---

## 🚀 PRÓXIMOS PASSOS

### Para Desenvolvimento:
1. Gerar imagens com script bash
2. Organizar em pastas por categoria
3. Referenciar via paths relativos
4. Commit das imagens úteis no Git

### Para Produção:
1. Otimizar imagens (compressão)
2. Usar CDN se necessário
3. Lazy loading das imagens
4. Cache apropriado

---

## 💡 DICAS IMPORTANTES

### Performance:
- ✅ Usar formato JPEG para fotos/backgrounds
- ✅ Usar PNG para logos/ícones com transparência
- ✅ Implementar lazy loading
- ✅ Comprimir imagens antes do commit

### Organização:
- ✅ Nomenclatura consistente
- ✅ Pastas por categoria
- ✅ Documentar onde cada imagem é usada
- ✅ Limpar imagens não utilizadas

### Git:
- ✅ Adicionar `.gitignore` para pasta temporária
- ✅ Committar apenas imagens finais
- ✅ Usar Git LFS para imagens grandes

```gitignore
# .gitignore
generated-images/        # Pasta temporária
*.tmp.jpeg              # Arquivos temporários
*.tmp.png
```

---

## ✨ RESULTADO FINAL

**Vantagens do workflow local:**
- 🏠 Tudo no seu projeto
- 🚀 Zero latência de acesso
- 💰 Zero custos de storage
- 🔧 Controle total dos arquivos
- 📁 Organização personalizada
- 🎯 Ideal para desenvolvimento