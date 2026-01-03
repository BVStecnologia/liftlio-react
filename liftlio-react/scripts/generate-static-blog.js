#!/usr/bin/env node
/**
 * Static Blog Generator for Liftlio
 * Generates static HTML pages from Supabase blog posts for SEO
 *
 * Run: node scripts/generate-static-blog.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Supabase config (anon key - safe for public)
const SUPABASE_URL = 'https://suqjifkhmekcdflwowiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'build', 'blog');

/**
 * Make HTTP request to Supabase
 */
function supabaseRequest(endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, SUPABASE_URL);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: body ? 'POST' : 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Convert Markdown to HTML (simple implementation)
 */
function markdownToHtml(markdown) {
  if (!markdown) return '';

  let html = markdown
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 id="$1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 id="$1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 id="$1">$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Unordered lists
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive li in ul
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    // Clean up header IDs (make URL-safe)
    .replace(/id="([^"]+)"/g, (match, id) => {
      const cleanId = id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      return `id="${cleanId}"`;
    });

  // Wrap in paragraph
  html = '<p>' + html + '</p>';

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  // Fix paragraphs around block elements
  html = html.replace(/<p>(<h[1-6])/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');
  html = html.replace(/<p>(<blockquote)/g, '$1');
  html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');
  html = html.replace(/<p>(<hr>)/g, '$1');
  html = html.replace(/(<hr>)<\/p>/g, '$1');

  return html;
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Generate Table of Contents from content
 */
function generateTOC(content) {
  const headings = content.match(/^#{1,3}\s+.+$/gm) || [];
  return headings.map(h => {
    const level = (h.match(/^#+/) || [''])[0].length;
    const text = h.replace(/^#+\s+/, '');
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return { id, text, level };
  });
}

/**
 * Generate HTML for single blog post
 */
function generatePostHtml(post) {
  const toc = generateTOC(post.content || '');
  const contentHtml = markdownToHtml(post.content || '');

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.meta_description || post.excerpt,
    image: post.cover_image_url || post.og_image_url,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: {
      '@type': 'Person',
      name: post.author_name || 'Liftlio Team',
      url: 'https://liftlio.com'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Liftlio',
      logo: {
        '@type': 'ImageObject',
        url: 'https://liftlio.com/logo.png'
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://liftlio.com/blog/${post.slug}`
    },
    wordCount: post.word_count || (post.content ? post.content.split(/\s+/).length : 0)
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://liftlio.com' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://liftlio.com/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: `https://liftlio.com/blog/${post.slug}` }
    ]
  };

  const tocHtml = toc.length > 0 ? `
    <nav class="toc">
      <h3>Table of Contents</h3>
      <ul>
        ${toc.map(item => `<li class="level-${item.level}"><a href="#${item.id}">${item.text}</a></li>`).join('\n        ')}
      </ul>
    </nav>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.meta_title || post.title} | Liftlio Blog</title>
  <meta name="description" content="${(post.meta_description || post.excerpt || '').replace(/"/g, '&quot;')}">
  ${post.focus_keyword ? `<meta name="keywords" content="${post.focus_keyword}">` : ''}
  <link rel="canonical" href="${post.canonical_url || `https://liftlio.com/blog/${post.slug}`}">

  <!-- Open Graph -->
  <meta property="og:title" content="${post.meta_title || post.title}">
  <meta property="og:description" content="${(post.meta_description || post.excerpt || '').replace(/"/g, '&quot;')}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://liftlio.com/blog/${post.slug}">
  <meta property="og:image" content="${post.og_image_url || post.cover_image_url || ''}">
  <meta property="article:published_time" content="${post.published_at || ''}">
  <meta property="article:author" content="${post.author_name || 'Liftlio Team'}">
  ${post.category_name ? `<meta property="article:section" content="${post.category_name}">` : ''}

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${post.meta_title || post.title}">
  <meta name="twitter:description" content="${(post.meta_description || post.excerpt || '').replace(/"/g, '&quot;')}">
  <meta name="twitter:image" content="${post.og_image_url || post.cover_image_url || ''}">

  <!-- Schema.org -->
  <script type="application/ld+json">${JSON.stringify(schemaData)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>

  <style>
    :root {
      --purple: #8b5cf6;
      --purple-dark: #7c3aed;
      --bg-primary: #0f0f1a;
      --bg-secondary: #1a1a2e;
      --text-primary: #ffffff;
      --text-secondary: rgba(255,255,255,0.8);
      --text-muted: rgba(255,255,255,0.6);
      --border: rgba(255,255,255,0.1);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
    }

    a { color: var(--purple); text-decoration: none; }
    a:hover { text-decoration: underline; }

    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      padding: 100px 24px 80px;
      position: relative;
    }

    .header-content {
      max-width: 800px;
      margin: 0 auto;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      margin-bottom: 24px;
    }

    .breadcrumb a { color: rgba(255,255,255,0.7); }
    .breadcrumb span { color: rgba(255,255,255,0.4); }

    .category-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      background: var(--purple);
      color: white;
      text-transform: uppercase;
      margin-bottom: 16px;
    }

    .title {
      font-size: 48px;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 16px;
    }

    .subtitle {
      font-size: 20px;
      color: var(--text-secondary);
      margin-bottom: 24px;
    }

    .meta {
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }

    .author {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .author img {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      object-fit: cover;
    }

    .author-name { font-weight: 600; }
    .author-date { font-size: 13px; color: var(--text-muted); }

    .stats {
      display: flex;
      gap: 16px;
      font-size: 14px;
      color: var(--text-muted);
    }

    .main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 48px 24px;
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: 48px;
    }

    @media (max-width: 1024px) {
      .main { grid-template-columns: 1fr; }
      .sidebar { display: none; }
      .title { font-size: 32px; }
    }

    .article { max-width: 100%; }

    .cover-image {
      width: 100%;
      height: auto;
      max-height: 500px;
      object-fit: cover;
      border-radius: 16px;
      margin-bottom: 32px;
    }

    .content {
      font-size: 18px;
      line-height: 1.8;
    }

    .content h1, .content h2, .content h3 {
      margin: 32px 0 16px;
      font-weight: 600;
      line-height: 1.3;
    }

    .content h1 { font-size: 32px; }
    .content h2 { font-size: 28px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
    .content h3 { font-size: 24px; }

    .content p { margin: 0 0 20px; }

    .content ul, .content ol {
      margin: 16px 0;
      padding-left: 24px;
    }

    .content li { margin: 8px 0; }

    .content blockquote {
      margin: 24px 0;
      padding: 16px 24px;
      border-left: 4px solid var(--purple);
      background: var(--bg-secondary);
      border-radius: 0 8px 8px 0;
      font-style: italic;
      color: var(--text-secondary);
    }

    .content img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 24px 0;
    }

    .content pre {
      margin: 24px 0;
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 12px;
      overflow-x: auto;
    }

    .content code {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 14px;
    }

    .content :not(pre) > code {
      background: var(--bg-secondary);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .content hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 32px 0;
    }

    .sidebar {
      position: sticky;
      top: 24px;
      height: fit-content;
    }

    .sidebar-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .sidebar-card h3 {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 16px;
    }

    .toc ul {
      list-style: none;
      padding: 0;
    }

    .toc li { margin: 8px 0; }

    .toc a {
      display: block;
      padding: 8px 12px;
      font-size: 14px;
      color: var(--text-secondary);
      border-radius: 6px;
      border-left: 2px solid transparent;
      transition: all 0.2s;
    }

    .toc a:hover {
      background: rgba(139, 92, 246, 0.1);
      color: var(--purple);
      border-left-color: var(--purple);
      text-decoration: none;
    }

    .toc .level-2 a { padding-left: 12px; }
    .toc .level-3 a { padding-left: 24px; font-size: 13px; }

    .cta-box {
      background: linear-gradient(135deg, var(--purple) 0%, var(--purple-dark) 100%);
      border-radius: 16px;
      padding: 24px;
      text-align: center;
    }

    .cta-box h3 {
      color: white !important;
      margin-bottom: 12px;
    }

    .cta-box p {
      color: rgba(255,255,255,0.9);
      font-size: 14px;
      margin-bottom: 16px;
    }

    .cta-button {
      display: inline-block;
      padding: 12px 24px;
      background: white;
      color: var(--purple-dark);
      font-weight: 600;
      border-radius: 10px;
      transition: transform 0.2s;
    }

    .cta-button:hover {
      transform: translateY(-2px);
      text-decoration: none;
    }

    .footer {
      background: var(--bg-secondary);
      border-top: 1px solid var(--border);
      padding: 40px 24px;
      text-align: center;
      margin-top: 80px;
    }

    .footer-links {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-bottom: 16px;
    }

    .footer-links a {
      color: var(--text-secondary);
      font-size: 14px;
    }

    .footer p {
      color: var(--text-muted);
      font-size: 13px;
    }

    /* React app will take over after hydration */
    .react-app-link {
      display: none;
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-content">
      <nav class="breadcrumb">
        <a href="/">Home</a>
        <span>/</span>
        <a href="/blog">Blog</a>
        ${post.category_name ? `<span>/</span><a href="/blog?category=${post.category_slug}">${post.category_name}</a>` : ''}
      </nav>

      ${post.category_name ? `<span class="category-badge">${post.category_name}</span>` : ''}

      <h1 class="title">${post.title}</h1>
      ${post.subtitle ? `<p class="subtitle">${post.subtitle}</p>` : ''}

      <div class="meta">
        <div class="author">
          ${post.author_avatar_url ? `<img src="${post.author_avatar_url}" alt="${post.author_name || 'Author'}">` : ''}
          <div>
            <div class="author-name">${post.author_name || 'Liftlio Team'}</div>
            <div class="author-date">${formatDate(post.published_at)}</div>
          </div>
        </div>
        <div class="stats">
          <span>${post.reading_time_minutes || 5} min read</span>
          <span>${post.view_count || 0} views</span>
        </div>
      </div>
    </div>
  </header>

  <main class="main">
    <article class="article">
      ${post.cover_image_url ? `<img class="cover-image" src="${post.cover_image_url}" alt="${post.cover_image_alt || post.title}">` : ''}

      <div class="content">
        ${contentHtml}
      </div>

      <div class="cta-box" style="margin-top: 48px;">
        <h3>Ready to boost your YouTube engagement?</h3>
        <p>Join Liftlio and start monitoring videos that matter to your brand.</p>
        <a href="/register" class="cta-button">Get Started Free</a>
      </div>
    </article>

    <aside class="sidebar">
      ${tocHtml ? `<div class="sidebar-card">${tocHtml}</div>` : ''}

      <div class="sidebar-card cta-box">
        <h3>Try Liftlio Free</h3>
        <p>AI-powered video monitoring for smarter engagement.</p>
        <a href="/register" class="cta-button">Start Now</a>
      </div>
    </aside>
  </main>

  <footer class="footer">
    <div class="footer-links">
      <a href="/">Home</a>
      <a href="/features">Features</a>
      <a href="/pricing">Pricing</a>
      <a href="/blog">Blog</a>
      <a href="/contact">Contact</a>
    </div>
    <p>&copy; ${new Date().getFullYear()} Liftlio. All rights reserved.</p>
  </footer>

  <!-- Progressive Enhancement: Load React app for interactivity -->
  <script>
    // Track page view
    if (typeof gtag === 'function') {
      gtag('event', 'page_view', {
        page_title: '${post.title.replace(/'/g, "\\'")}',
        page_location: window.location.href
      });
    }
  </script>
</body>
</html>`;
}

/**
 * Generate HTML for blog list page
 */
function generateListHtml(posts) {
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Liftlio Blog',
    description: 'Articles about video marketing, AI analytics, and content strategy',
    url: 'https://liftlio.com/blog',
    publisher: {
      '@type': 'Organization',
      name: 'Liftlio',
      logo: {
        '@type': 'ImageObject',
        url: 'https://liftlio.com/logo.png'
      }
    },
    blogPost: posts.map(post => ({
      '@type': 'BlogPosting',
      headline: post.title,
      url: `https://liftlio.com/blog/${post.slug}`,
      datePublished: post.published_at,
      image: post.cover_image_url
    }))
  };

  const postsHtml = posts.map(post => `
    <article class="post-card" onclick="window.location='/blog/${post.slug}'">
      <div class="post-image" style="background-image: url('${post.cover_image_url || ''}')">
        ${post.category_name ? `<span class="post-category">${post.category_name}</span>` : ''}
      </div>
      <div class="post-content">
        <h2 class="post-title">${post.title}</h2>
        <p class="post-excerpt">${post.excerpt || post.meta_description || ''}</p>
        <div class="post-meta">
          <span>${post.author_name || 'Liftlio Team'}</span>
          <span>${post.reading_time_minutes || 5} min read</span>
        </div>
      </div>
    </article>
  `).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog | Liftlio - Video Monitoring & AI Insights</title>
  <meta name="description" content="Explore articles about video marketing, AI-powered analytics, sentiment analysis, and YouTube growth strategies. Stay updated with the latest insights from Liftlio.">
  <meta name="keywords" content="video marketing, YouTube analytics, AI insights, sentiment analysis, video monitoring, content strategy">
  <link rel="canonical" href="https://liftlio.com/blog">

  <!-- Open Graph -->
  <meta property="og:title" content="Liftlio Blog - Video Marketing & AI Insights">
  <meta property="og:description" content="Discover strategies for video marketing, AI analytics, and growing your YouTube presence.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://liftlio.com/blog">
  <meta property="og:image" content="https://liftlio.com/og-blog.png">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Liftlio Blog - Video Marketing & AI Insights">
  <meta name="twitter:description" content="Discover strategies for video marketing, AI analytics, and growing your YouTube presence.">

  <!-- Schema.org -->
  <script type="application/ld+json">${JSON.stringify(schemaData)}</script>

  <style>
    :root {
      --purple: #8b5cf6;
      --purple-dark: #7c3aed;
      --bg-primary: #0f0f1a;
      --bg-secondary: #1a1a2e;
      --text-primary: #ffffff;
      --text-secondary: rgba(255,255,255,0.8);
      --text-muted: rgba(255,255,255,0.6);
      --border: rgba(255,255,255,0.1);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
    }

    a { color: var(--purple); text-decoration: none; }
    a:hover { text-decoration: underline; }

    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      padding: 80px 0 60px;
      text-align: center;
    }

    .header-content {
      max-width: 800px;
      margin: 0 auto;
      padding: 0 24px;
    }

    .logo {
      font-size: 24px;
      font-weight: 700;
      color: white;
      margin-bottom: 24px;
      display: inline-block;
    }

    .logo span {
      background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .title {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .subtitle {
      font-size: 18px;
      color: var(--text-muted);
      max-width: 600px;
      margin: 0 auto;
    }

    .main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 24px;
    }

    .posts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }

    @media (max-width: 768px) {
      .posts-grid { grid-template-columns: 1fr; }
      .title { font-size: 32px; }
    }

    .post-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s;
    }

    .post-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(139, 92, 246, 0.15);
      border-color: rgba(139, 92, 246, 0.3);
    }

    .post-image {
      height: 200px;
      background-size: cover;
      background-position: center;
      background-color: var(--bg-secondary);
      position: relative;
    }

    .post-category {
      position: absolute;
      top: 16px;
      left: 16px;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      background: var(--purple);
      color: white;
      text-transform: uppercase;
    }

    .post-content {
      padding: 24px;
    }

    .post-title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 12px;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .post-excerpt {
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 16px;
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .post-meta {
      display: flex;
      gap: 16px;
      font-size: 13px;
      color: var(--text-muted);
    }

    .footer {
      background: var(--bg-secondary);
      border-top: 1px solid var(--border);
      padding: 40px 24px;
      text-align: center;
      margin-top: 80px;
    }

    .footer-links {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-bottom: 16px;
    }

    .footer-links a {
      color: var(--text-secondary);
      font-size: 14px;
    }

    .footer p {
      color: var(--text-muted);
      font-size: 13px;
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-content">
      <a href="/" class="logo"><span>Liftlio</span> Blog</a>
      <h1 class="title">Insights & Strategies</h1>
      <p class="subtitle">Discover the latest in video marketing, AI-powered analytics, and content strategies to grow your online presence.</p>
    </div>
  </header>

  <main class="main">
    <div class="posts-grid">
      ${postsHtml}
    </div>
  </main>

  <footer class="footer">
    <div class="footer-links">
      <a href="/">Home</a>
      <a href="/features">Features</a>
      <a href="/pricing">Pricing</a>
      <a href="/blog">Blog</a>
      <a href="/contact">Contact</a>
    </div>
    <p>&copy; ${new Date().getFullYear()} Liftlio. All rights reserved.</p>
  </footer>
</body>
</html>`;
}

/**
 * Main function
 */
async function main() {
  console.log('Static Blog Generator');
  console.log('=====================\n');

  try {
    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log(`Created directory: ${OUTPUT_DIR}`);
    }

    // Fetch all published posts
    console.log('Fetching posts from Supabase...');
    const posts = await supabaseRequest('/rest/v1/blog_posts?status=eq.published&order=published_at.desc&select=*');

    if (!Array.isArray(posts)) {
      throw new Error('Failed to fetch posts: ' + JSON.stringify(posts));
    }

    console.log(`Found ${posts.length} published posts\n`);

    // Generate individual post pages
    for (const post of posts) {
      const html = generatePostHtml(post);
      const filePath = path.join(OUTPUT_DIR, `${post.slug}.html`);
      fs.writeFileSync(filePath, html);
      console.log(`Generated: ${post.slug}.html`);
    }

    // Generate list page
    const listHtml = generateListHtml(posts);
    const listPath = path.join(OUTPUT_DIR, 'index.html');
    fs.writeFileSync(listPath, listHtml);
    console.log(`Generated: index.html (blog list)`);

    console.log('\n=====================');
    console.log(`Success! Generated ${posts.length + 1} static HTML files`);
    console.log(`Output: ${OUTPUT_DIR}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run
main();
