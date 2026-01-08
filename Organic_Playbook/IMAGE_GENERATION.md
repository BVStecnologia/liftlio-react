# Geração de Imagens para Posts

## Opção 1: Google Gemini via Navegador (RECOMENDADO)

**Valdair tem plano Gemini Advanced - usar sempre que possível!**

```
URL: https://gemini.google.com/

Workflow:
1. Navegar para gemini.google.com
2. Login já está salvo (valdair3d@gmail.com)
3. Digitar prompt de imagem em inglês
4. Aguardar geração
5. Baixar imagem gerada
6. Remover metadados (ver abaixo)
7. Salvar em: liftlio-react/generated-images/

Vantagens:
- Melhor qualidade que Pollinations
- Sem limite de API
- Imagens mais realistas e profissionais
```

## Opção 2: Pollinations AI (GRATUITO - Backup)

```bash
# 100% GRATUITO, sem API key necessária
# Usar quando Gemini não estiver disponível
C:/Users/User/Desktop/Liftlio/.claude/scripts/pollinations-image.sh "prompt" "output_dir" "width" "height"

# Exemplo:
bash .claude/scripts/pollinations-image.sh "Purple tech dashboard, dark theme, modern UI" "liftlio-react/generated-images" "1200" "675"

# Tamanhos recomendados: 1200x675 (16:9)
```

---

## Remover Metadados (OBRIGATÓRIO!)

**Por que?** Imagens de AI contêm metadados que podem ser detectados. Remover para parecer mais natural.

```python
# Usar Python/PIL para remover metadados
from PIL import Image

img = Image.open('imagem_original.png')
clean_img = Image.new(img.mode, img.size)
clean_img.putdata(list(img.getdata()))
clean_img.save('imagem_limpa.png', 'PNG')
```

---

## Tamanhos por Plataforma

| Plataforma | Tamanho Ideal | Aspecto |
|------------|---------------|---------|
| LinkedIn | 1200x675 | 16:9 |
| Twitter/X | 1200x675 | 16:9 |
| Facebook | 1200x630 | 1.91:1 |
| Reddit | 1200x675 | 16:9 |

---

## Pasta de Imagens

**Todas as imagens geradas vão para:** `liftlio-react/generated-images/`

Naming convention:
- Gemini: `linkedin-consistency-gemini.png`
- Pollinations: `pollinations_YYYYMMDD_HHMMSS.jpg`

---

*Atualizado: 2026-01-08*
