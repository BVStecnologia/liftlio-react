# 15_Blog - Funcoes SQL e Sistema SSR do Blog

## Arquitetura Blog SSR (Server-Side Rendering)

```
                                    FLUXO DE REQUISICAO
                                    ===================

 Google Bot / Usuario                    Fly.io                         Supabase
        |                                   |                               |
        |  GET /blog/meu-artigo             |                               |
        |---------------------------------->|                               |
        |                                   |                               |
        |                              nginx.conf                           |
        |                        (proxy_pass para Edge Function)            |
        |                                   |                               |
        |                                   |  POST /functions/v1/blog-ssr  |
        |                                   |  ?slug=meu-artigo             |
        |                                   |------------------------------>|
        |                                   |                               |
        |                                   |                    Edge Function
        |                                   |                    blog-ssr.ts
        |                                   |                         |
        |                                   |                         | RPC
        |                                   |                         v
        |                                   |                   get_blog_html()
        |                                   |                         |
        |                                   |                         | SELECT
        |                                   |                         v
        |                                   |                   blog_posts
        |                                   |                   .html_rendered
        |                                   |                         |
        |                                   |<------------------------+
        |                                   |      HTML completo
        |<----------------------------------|
        |       HTML puro (SEO ready)


                                    FLUXO DE CRIACAO/UPDATE
                                    =======================

     BlogAdmin.tsx                         Supabase
          |                                    |
          |  INSERT/UPDATE blog_posts          |
          |----------------------------------->|
          |                                    |
          |                             TRIGGER dispara
          |                      trigger_generate_blog_html_fn()
          |                                    |
          |                                    v
          |                           generate_blog_html()
          |                                    |
          |                                    v
          |                           markdown_to_html()
          |                                    |
          |                                    v
          |                           html_rendered = HTML
          |<-----------------------------------|
          |       Post salvo com HTML pronto
```

---

## Por que este sistema?

1. **SEO Perfeito**: Google recebe HTML puro, sem JavaScript
2. **Custo Zero**: SQL Functions sao gratuitas via PostgREST
3. **Deploy Zero para Novos Posts**: HTML gerado automaticamente no INSERT/UPDATE
4. **Performance**: HTML pre-renderizado, sem processamento em tempo real
5. **Edge Function Minima**: Apenas busca HTML do banco (nao processa)

---

## Funcoes SQL - Sistema SSR

### generate_blog_html(post blog_posts)
Gera HTML completo e SEO-otimizado para um post.

**Arquivo:** generate_blog_html.sql

**Inclui:**
- Meta tags SEO (title, description, keywords)
- Open Graph e Twitter Cards
- Schema.org JSON-LD (Article)
- Canonical URL
- CSS inline (nao depende de arquivos externos)
- Conteudo convertido de Markdown para HTML

**Uso:** Chamado automaticamente pelo trigger.

---

### markdown_to_html(md TEXT)
Converte Markdown basico para HTML.

**Arquivo:** generate_blog_html.sql

**Suporta:** Headers, Bold, Italic, Links, Code blocks, Lists, Paragraphs

---

### get_blog_html(p_slug TEXT)
Retorna HTML pre-renderizado de um post.

**Arquivo:** get_blog_html.sql | **Custo:** GRATIS

**Uso via HTTP:** GET https://liftlio.com/blog/[slug]

---

### get_blog_list_html()
Retorna HTML da pagina de listagem do blog.

**Arquivo:** get_blog_html.sql

---

### trigger_generate_blog_html_fn()
Trigger function que gera HTML automaticamente.

**Arquivo:** trigger_generate_blog_html.sql

**Dispara em:** INSERT e UPDATE de campos SEO em blog_posts

---

## Edge Function: blog-ssr

**Arquivo:** ../Edge_Functions/blog-ssr.ts

**Rotas:**
- GET /blog-ssr - Listagem do blog
- GET /blog-ssr?slug=my-post - Post especifico

---

## Testando o Sistema

1. Verificar HTML gerado:
```sql
SELECT slug, LENGTH(html_rendered) as html_size FROM blog_posts WHERE status = 'published';
```

2. Regenerar HTML de um post:
```sql
UPDATE blog_posts SET updated_at = NOW() WHERE slug = 'meu-post';
```

3. Regenerar TODOS os posts:
```sql
UPDATE blog_posts SET html_rendered = generate_blog_html(blog_posts.*) WHERE status = 'published';
```

---

## Arquivos na Pasta

| Arquivo | Descricao |
|---------|-----------|
| README.md | Esta documentacao |
| METODOLOGIA_ARTIGOS.md | Processo de criacao de artigos |
| generate_blog_html.sql | Geracao HTML SEO + markdown_to_html |
| get_blog_html.sql | Servir HTML (single + listing) |
| trigger_generate_blog_html.sql | Auto-geracao no INSERT/UPDATE |
| get_blog_sitemap_xml.sql | Sitemap dinamico |
| get_blog_comments.sql | Comentarios com dados usuario |

---

## IMPORTANTE

- Edge Function blog-ssr: NAO processa, apenas busca HTML pronto
- Trigger: Gera HTML automaticamente, novos posts aparecem instantaneamente
- SQL Functions: TODAS gratuitas via PostgREST

---

Criado: 2026-01-03 | Sistema: Blog SSR v1.0
