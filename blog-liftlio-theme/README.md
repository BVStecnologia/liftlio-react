# Blog Liftlio Theme - WordPress

Esta pasta contém todos os arquivos relacionados ao tema WordPress do blog Liftlio (blog.liftlio.com).

## 📦 Versões do Tema

### ⭐ VERSÃO ATUAL (USAR ESTA!)
- **`liftlio-wp-theme-v3.2-menu-support.zip`** - v3.2 (25/01/2025)
  - ✅ Suporte completo para menus do WordPress
  - ✅ Menu dropdown/submenu funcionando
  - ✅ Fallback automático quando não há menu configurado
  - ✅ Botões CTA personalizados via classes CSS
  - ✅ Correção de overflow de imagens mantida
  - ✅ URLs canônicas funcionando
  - ✅ Instruções detalhadas incluídas (MENU-INSTRUCTIONS.md)

### 📂 Versões Anteriores
- **`liftlio-wp-theme-v3.1-image-overflow-fix.zip`** - v3.1 (23/07/2025)
  - Correção de overflow de imagens
  - CSS responsivo para imagens em posts e páginas
  - URLs canônicas funcionando
  - Tags H1 verificadas em todos os templates
- **`liftlio-wp-theme-v3.0-seo-completo-USAR-ESTE.zip`** - v3.0 (23/07/2025)
  - URLs canônicas funcionando para blog.liftlio.com
  - Tags H1 verificadas em todos os templates
  - Funções de debug incluídas
  - Compatível com subdomínios
- **`liftlio-wp-theme-v2.0-seo-parcial.zip`** - v2.0 (23/07/2025)
  - Primeira tentativa de correção SEO
  - URLs canônicas parcialmente implementadas
  
- **`liftlio-wp-theme-v1.0-inicial.zip`** - v1.0 (22/07/2025)
  - Versão inicial do tema
  - Sem correções SEO

### 📁 Arquivos de Referência
- `wp-theme-variation-1.html` - Mockup HTML original
- `liftlio-wp-theme-update.md` - Notas de atualização
- `temp-theme/` - Arquivos descompactados do tema v3.0 para referência

## Correções SEO Implementadas (v3.0)

### ✅ URLs Canônicas
- Adicionadas automaticamente em todas as páginas
- Compatível com subdomínio blog.liftlio.com
- Respeita HTTPS e configurações do WordPress

### ✅ Tags H1
- Verificadas em todos os templates
- Presente em page.php, single.php, archive.php, etc.

## Como Instalar

1. Faça backup do tema atual
2. No WordPress Admin, vá para **Aparência > Temas > Adicionar novo**
3. Clique em **Enviar tema**
4. Selecione o arquivo `liftlio-wp-theme-v3.2-menu-support.zip`
5. Clique em **Instalar agora** e depois **Ativar**

## Como Configurar o Menu (NOVO na v3.2!)

1. Vá para **Aparência > Menus** no WordPress Admin
2. Crie um novo menu ou edite o existente
3. Adicione páginas, posts, links personalizados, categorias
4. Para criar botão CTA: adicione classe CSS `menu-item-cta` ao item
5. Marque **"Primary Menu"** em Locais de exibição
6. Salve o menu

**Instruções detalhadas**: Veja o arquivo `MENU-INSTRUCTIONS.md` dentro do tema

## Como Testar as Correções

### Verificar com Debug (incluído no tema)
```
https://blog.liftlio.com/about?debug_canonical=1&debug_h1=1
```

### Verificar manualmente
```bash
# URLs Canônicas
curl -s https://blog.liftlio.com/about | grep canonical

# Tags H1
curl -s https://blog.liftlio.com/about | grep "<h1"
```

## Documentação Adicional

Consulte o arquivo `SEO-FIXES-README.md` dentro do tema para instruções detalhadas de debug e solução de problemas.

---
**Última atualização**: 25/01/2025