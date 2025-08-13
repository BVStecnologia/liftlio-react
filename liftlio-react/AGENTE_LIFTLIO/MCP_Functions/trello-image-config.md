# 🟣 Configuração de Imagens para Trello - Liftlio Purple Theme

## 🎨 REGRA OBRIGATÓRIA: CORES ROXAS DO LIFTLIO

### Paleta de Cores Oficial:
- **Primary Purple**: #8b5cf6
- **Dark Purple**: #7c3aed  
- **Light Purple**: #a855f7
- **Purple Gradient**: linear-gradient(135deg, #8b5cf6, #a855f7)
- **Background Purple**: rgba(139, 92, 246, 0.1)

## 🖼️ Sistema de Upload de Imagens

### Edge Function: upload-trello-image
**URL**: https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/upload-trello-image

### Como Usar:

1. **Para imagens locais**:
```bash
curl -X POST "https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/upload-trello-image" \
  -H "Authorization: Bearer [ANON_KEY]" \
  -F "file=@/path/to/image.png" \
  -F "fileName=epic-feature-name.png" \
  -F "cardId=[TRELLO_CARD_ID]"
```

2. **Resposta**:
```json
{
  "success": true,
  "url": "https://suqjifkhmekcdflwowiw.supabase.co/storage/v1/object/public/trello-images/cards/[CARD_ID]/[FILENAME]",
  "path": "cards/[CARD_ID]/[FILENAME]"
}
```

## 📋 Instruções para o Agente Trello

### SEMPRE ao criar cards:

1. **Gerar imagem com prompt específico**:
   - SEMPRE incluir: "purple gradient, #8b5cf6 color scheme, Liftlio branding"
   - Estilo: "modern, minimalist, tech aesthetic, purple theme"
   - Evitar: cores que não sejam roxo/púrpura

2. **Upload para Supabase**:
   - Fazer upload via Edge Function
   - Usar a URL retornada do Supabase Storage
   - NÃO usar URLs do Unsplash ou outras fontes genéricas

3. **Anexar ao Card**:
   ```javascript
   mcp__trello__attach_image_to_card({
     cardId: "card_id",
     imageUrl: "https://suqjifkhmekcdflwowiw.supabase.co/storage/v1/object/public/trello-images/...",
     name: "Epic Feature Name - Liftlio Purple"
   })
   ```

## 🔄 Workflow Completo

1. **Identificar tipo de card** (feature, bug fix, improvement)
2. **Gerar imagem** com tema roxo apropriado
3. **Upload para Supabase** via Edge Function
4. **Criar card** no Trello
5. **Anexar imagem** do Supabase ao card
6. **Verificar** que a imagem está visível

## 💜 Exemplos de Prompts para Imagens

### Para Features:
"futuristic dashboard with purple gradient (#8b5cf6 to #a855f7), minimalist design, tech aesthetic, glowing purple elements"

### Para Bug Fixes:
"clean code terminal with purple theme, check marks in #8b5cf6, dark background with purple accents, minimalist style"

### Para Analytics:
"data visualization charts in purple gradient (#8b5cf6), modern dashboard, clean interface, Liftlio brand colors"

### Para Improvements:
"abstract tech pattern with purple geometric shapes, #8b5cf6 primary color, modern and professional, gradient effects"

## 🚨 IMPORTANTE

- **NUNCA** usar imagens sem o tema roxo
- **SEMPRE** fazer upload para Supabase primeiro
- **SEMPRE** incluir "Liftlio Purple" no nome da imagem
- **VERIFICAR** que a URL da imagem começa com: https://suqjifkhmekcdflwowiw.supabase.co/storage/

## 📦 Bucket Storage

**Nome**: trello-images
**Público**: Sim
**Estrutura**: /cards/[CARD_ID]/[FILENAME]
**Limite**: 5MB por imagem
**Formatos**: PNG, JPG, GIF, WEBP