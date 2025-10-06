# 🔗 AGENTE LINKEDIN MCP - REQUISITOS E IMPLEMENTAÇÃO

## 📋 O QUE PRECISA PARA INTEGRAR

### 🔑 1. CREDENCIAIS LINKEDIN API

## ⚡ **DECISÃO: USAR PERFIL PESSOAL** (não página da empresa)

**Por quê?**
- ✅ Posts pessoais têm 10x mais alcance
- ✅ Não precisa de página/permissões extras
- ✅ Tag @Liftlio nos posts leva tráfego pra página
- ✅ Você constrói autoridade pessoal + empresa

---

#### **Passo 1: Criar App no LinkedIn**
1. Acesse: https://www.linkedin.com/developers/apps
2. Clique em "Create app"
3. Preencher:
   - **App name**: `Liftlio LinkedIn Agent`
   - **LinkedIn Page**: ❌ **DEIXAR EM BRANCO** (não precisa!)
   - **Privacy policy URL**: https://liftlio.com/privacy
   - **App logo**: Logo do Liftlio (opcional)

#### **Passo 2: Obter Credenciais**
Após criar o app, você receberá:
- ✅ **Client ID**: `xxxxxxxxxxxxxxxxx`
- ✅ **Client Secret**: `xxxxxxxxxxxxxxxxx`
- ✅ **Redirect URI**: `http://localhost:3000/auth/linkedin/callback`

#### **Passo 3: Configurar Permissões (Scopes) - APENAS PERFIL PESSOAL**
Na aba "Products", solicitar acesso a:
- ✅ `w_member_social` - **OBRIGATÓRIO** (criar posts no SEU perfil)
- ✅ `r_liteprofile` - **OBRIGATÓRIO** (ler seu perfil básico)
- ❌ ~~`r_organization_social`~~ - NÃO precisa (é pra página)
- ❌ ~~`r_organization_social_analytics`~~ - NÃO precisa (é pra página)

#### **Passo 4: Obter Access Token**
```bash
# URL de autorização (abrir no browser)
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=w_member_social%20r_liteprofile%20r_organization_social

# Trocar code por access_token
curl -X POST https://www.linkedin.com/oauth/v2/accessToken \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_AUTH_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=YOUR_REDIRECT_URI"
```

---

### 🗂️ 2. ESTRUTURA DE PASTAS (igual Trello MCP)

```
/Users/valdair/Documents/Projetos/Liftlio/
├── .claude/
│   └── mcp-servers/
│       └── linkedin/
│           ├── index.js           # Servidor MCP principal
│           ├── linkedin-api.js    # Funções da API
│           ├── .env               # Credenciais
│           └── package.json
└── LINKEDIN_POSTS/                # Posts gerados
    ├── drafts/                    # Rascunhos
    ├── scheduled/                 # Agendados
    ├── published/                 # Publicados
    └── images/                    # Imagens geradas
```

---

### 📦 3. DEPENDÊNCIAS NPM

```json
{
  "name": "@liftlio/mcp-linkedin",
  "version": "1.0.0",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "axios": "^1.6.0",
    "dotenv": "^16.0.0",
    "form-data": "^4.0.0",
    "sharp": "^0.33.0"
  }
}
```

---

### ⚙️ 4. VARIÁVEIS DE AMBIENTE (.env)

```bash
# LinkedIn API
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_ACCESS_TOKEN=your_access_token
LINKEDIN_PERSON_URN=urn:li:person:YOUR_PERSON_ID

# OpenAI (para imagens)
OPENAI_API_KEY=sk-proj-xxx

# Paths
LINKEDIN_POSTS_DIR=/Users/valdair/Documents/Projetos/Liftlio/LINKEDIN_POSTS
```

---

### 🔧 5. CONFIGURAÇÃO MCP (claude_desktop_config.json)

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["/Users/valdair/Documents/Projetos/Liftlio/.claude/mcp-servers/linkedin/index.js"],
      "env": {
        "LINKEDIN_CLIENT_ID": "your_client_id",
        "LINKEDIN_CLIENT_SECRET": "your_client_secret",
        "LINKEDIN_ACCESS_TOKEN": "your_access_token",
        "LINKEDIN_PERSON_URN": "urn:li:person:YOUR_ID",
        "OPENAI_API_KEY": "sk-proj-xxx"
      }
    }
  }
}
```

---

## 📝 LISTA DE POSTS - PIPELINE DE 30 DIAS

### 🎯 CALENDÁRIO DE POSTS (1 post a cada 3 dias)

#### **Semana 1: Apresentação**
- **Dia 1** - Anúncio Liftlio (o que faz)
- **Dia 4** - Google Cloud Partner (2M quotas)

#### **Semana 2: Sistemas Técnicos**
- **Dia 7** - Analytics Proprietário (VPS + Docker)
- **Dia 10** - 282 SQL Functions (arquitetura backend)

#### **Semana 3: Diferenciais**
- **Dia 13** - Liftlio Trends (algoritmo proprietário)
- **Dia 16** - Sistema Financeiro Square

#### **Semana 4: Resultados**
- **Dia 19** - Como AI gera tráfego orgânico
- **Dia 22** - Casos de uso / transformação

#### **Semana 5+: Conteúdo Técnico**
- **Dia 25** - Thread sobre RAG System
- **Dia 28** - Infra: VPS + Docker + Cloudflare
- **Dia 31** - Lições construindo do zero

---

## 📋 POSTS PRONTOS (baseado em LINKEDIN_PERFIL_EXECUCAO.md)

### Post 1: Anúncio Liftlio ✅
```markdown
🚀 After 10 months building, I'm launching: Liftlio

An AI platform that generates organic traffic by analyzing millions of YouTube videos and creating authentic conversations at scale.

🎯 HOW IT WORKS:
AI watches videos → identifies potential customers in comments → creates emotional hooks → naturally introduces solutions → generates organic traffic without ads.

🏆 WHAT I BUILT:
• Google Cloud Partner (2M daily YouTube quotas)
• AI Lead Detection & Conversion Engine
• Custom Analytics on VPS Linux + Docker
• 282 SQL Functions across 15 modules
• RAG System with Claude Sonnet 4
• Liftlio Trends (proprietary algorithm)

📊 TECH STACK:
React 19, TypeScript, Supabase, PostgreSQL, Claude AI, OpenAI, Square, Docker, YouTube Data API (2M quotas/day)

From zero to Google Cloud Partner in 10 months.

Building at @Liftlio → https://liftlio.com

#AI #OrganicGrowth #SaaS #GoogleCloud #LeadGeneration
```

**Imagem sugerida:** Dashboard do Liftlio com métricas

---

### Post 2: Google Cloud Partner ✅
```markdown
🏆 2 MILLION daily YouTube Data API quotas

I got approved by Google Cloud for 2 MILLION daily requests on YouTube API.

For context:
• Normal projects: 10k quotas/day
• Liftlio: 2M quotas/DAY (200x more!)
• Google Cloud Partner status
• Enterprise-level infrastructure verified by Google

🎯 What this enables:
Processing millions of videos daily with AI analysis, no quota limitations.

Built with React 19, Supabase, Claude AI and a lot of architecture.

Building at @Liftlio → https://liftlio.com

#GoogleCloud #YouTubeAPI #AI #Engineering #Enterprise
```

**Imagem sugerida:** Google Cloud Partner badge + 2M em destaque

---

### Post 3: Analytics Proprietário ✅
```markdown
📊 Built our own analytics system from scratch

While most use Google Analytics, I decided to build a custom analytics system running on VPS Linux.

🔥 INFRASTRUCTURE:
• Dedicated VPS Linux + Docker
• Cloudflare Proxy + SSL
• PostgreSQL for storage
• Node.js + Express
• track.liftlio.com

📈 FEATURES:
• Automatic pageviews
• Custom events
• Conversions and goals
• E-commerce tracking
• User identification
• Performance monitoring
• Anti-bot detection
• Global traffic visualization

Millions of events processed. Zero third-party costs.

Building at @Liftlio → liftlio.com/liftlio-analytics

#Analytics #Docker #Infrastructure #VPS #CustomSolutions
```

**Imagem sugerida:** Screenshot do dashboard Analytics com globo

---

### Post 4: 282 SQL Functions ✅
```markdown
🗄️ Built 282 custom SQL Functions organized in 15 specialized modules

Instead of messy code, I built a complete backend with PostgreSQL functions.

📁 MODULES:
• Authentication & Security
• YouTube API (2M quotas/day)
• RAG Embeddings (14 tables)
• Payments & Square integration
• Analytics Engine
• Scanner & Pipeline
• Email automation
• Claude AI integration

🧠 HIGHLIGHTS:
• RAG System with Claude Sonnet 4
• Proprietary trends algorithm
• AI that reads, evaluates, and creates connections
• Automated pipeline processes

Everything modular, testable, and scalable.

Building at @Liftlio → https://liftlio.com

Stack: PostgreSQL, pgvector, Supabase Edge Functions, Deno

#PostgreSQL #Backend #Architecture #RAG #AI
```

**Imagem sugerida:** Diagrama de módulos do backend

---

### Post 5: Liftlio Trends ✅
```markdown
📈 Built a proprietary algorithm that detects viral patterns BEFORE they explode

Liftlio Trends analyzes millions of YouTube videos in real-time to identify emerging trends.

🎯 HOW IT WORKS:
• Real-time video engagement analysis
• AI-powered sentiment analysis
• Pattern detection across categories
• Trend prediction before mainstream

🔥 LIVE FEATURES:
• Explosive growth detection (500%+ spikes)
• Category intelligence (Gaming, Tech, Education)
• Sentiment tracking
• Real-time dashboard

100% proprietary logic. No external APIs.
Built from data patterns observed across millions of video interactions.

Building at @Liftlio → liftlio.com/trends

#AI #Trends #Algorithm #MachineLearning #DataScience
```

**Imagem sugerida:** Screenshot do Liftlio Trends com gráficos

---

## 🎯 ESTRATÉGIA DE TAG @Liftlio

### **Por que SEMPRE marcar @Liftlio nos posts?**

✅ **Benefícios:**
1. **Direciona tráfego**: Quem clica em @Liftlio vai pra página da empresa
2. **Aumenta alcance**: Algoritmo conta como menção, impulsiona post
3. **Constrói marca**: Associa você (fundador) + empresa
4. **Crescimento duplo**: Seu perfil cresce + página cresce junto

✅ **Formato padrão no final do post:**
```
Building at @Liftlio → https://liftlio.com
```

Isso:
- Mostra que você é o fundador
- Link clicável pra página Liftlio
- Link pro site (tráfego direto)
- Hashtags relevantes vêm depois

---

## 🤖 FUNCIONALIDADES DO AGENTE MCP

### ✅ Comandos Disponíveis:

#### 1. **Criar Post**
```bash
"Claude, crie um post LinkedIn sobre [tópico] com imagem"
```
→ Gera texto + imagem DALL-E 3 + mostra preview

#### 2. **Publicar Post**
```bash
"Claude, publique o post sobre Google Cloud Partner"
```
→ Publica direto no LinkedIn

#### 3. **Agendar Post**
```bash
"Claude, agende post sobre Analytics para dia 10/10 às 14h"
```
→ Salva como agendado

#### 4. **Listar Posts**
```bash
"Claude, liste meus últimos 5 posts"
```
→ Mostra posts publicados com métricas

#### 5. **Ver Métricas**
```bash
"Claude, quais posts tiveram mais engajamento?"
```
→ Ranking de posts por views/likes/comments

#### 6. **Sugerir Conteúdo**
```bash
"Claude, sugira 3 tópicos de post sobre Liftlio"
```
→ Analisa projetos e sugere conteúdo

#### 7. **Gerar Imagem**
```bash
"Claude, gere imagem para post sobre VPS + Docker"
```
→ Usa GPT-Image-1 (DALL-E 3)

---

## 📊 PIPELINE DE ENGAJAMENTO

### 🎯 Estratégia de Crescimento (30 dias)

#### **Fase 1: Base (Dias 1-7)**
- ✅ Atualizar perfil completo (SOBRE, Experiência, Projetos)
- ✅ Conectar com 50 pessoas (founders, AI engineers)
- ✅ Post 1: Anúncio Liftlio
- ✅ Post 2: Google Cloud Partner

#### **Fase 2: Conteúdo Técnico (Dias 8-14)**
- ✅ Conectar +50 pessoas (VCs, tech leads)
- ✅ Post 3: Analytics Proprietário
- ✅ Post 4: 282 SQL Functions

#### **Fase 3: Diferenciais (Dias 15-21)**
- ✅ Conectar +50 pessoas (potenciais clientes)
- ✅ Post 5: Liftlio Trends
- ✅ Post 6: Sistema Financeiro Square

#### **Fase 4: Resultados (Dias 22-30)**
- ✅ Engajar em posts relevantes (5 comentários/dia)
- ✅ Post 7: Como AI gera tráfego orgânico
- ✅ Post 8: Casos de uso / transformação

### 📈 Métricas de Sucesso:
- **Conexões**: 24 → 200+ em 30 dias
- **Posts**: 8 posts (1 a cada 3-4 dias)
- **Engajamento médio**: 50+ views, 10+ likes por post
- **Inbound**: 5+ mensagens de oportunidades

---

## 🔧 PRÓXIMOS PASSOS

### **1. VOCÊ PRECISA:**
- [ ] Criar App no LinkedIn Developers
- [ ] Obter Client ID + Client Secret
- [ ] Gerar Access Token
- [ ] Me passar as credenciais

### **2. EU IMPLEMENTO:**
- [ ] Servidor MCP LinkedIn
- [ ] Integração com API
- [ ] Geração de imagens (DALL-E 3)
- [ ] Sistema de agendamento
- [ ] Dashboard de métricas

### **3. TESTE:**
- [ ] Criar primeiro post via comando
- [ ] Gerar imagem
- [ ] Publicar no LinkedIn
- [ ] Ver métricas

### **4. PRODUÇÃO:**
- [ ] Pipeline automático de 30 dias
- [ ] 1 post a cada 3 dias
- [ ] Análise de performance
- [ ] Sugestões de conteúdo

---

## 💡 REFERÊNCIAS

- **LinkedIn API Docs**: https://learn.microsoft.com/en-us/linkedin/marketing/
- **OAuth Flow**: https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication
- **Share API**: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
- **Analytics API**: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/organizations/organization-access-control

---

**Status**: 📋 Requisitos prontos | ⏳ Aguardando credenciais LinkedIn
