# 🔗 LinkedIn Content Creator - Status e Próximos Passos

## ✅ O QUE FOI CRIADO

### 📁 Estrutura de Arquivos
```
/Users/valdair/Documents/Projetos/Liftlio/
├── .claude/
│   ├── agents/
│   │   └── linkedin-content-creator.md ✅ (Agente criado)
│   └── scripts/
│       └── linkedin/
│           ├── credentials.sh ✅ (Credenciais LinkedIn)
│           ├── posts-templates.md ✅ (5 posts prontos)
│           └── README.md ✅ (Este arquivo)
```

### 🔑 Credenciais Configuradas
- ✅ **Client ID**: 77cn4p31cats0z
- ✅ **Access Token**: Válido até 2 meses (expira em 1764879050 UTC)
- ✅ **Scope**: w_member_social (criar posts no perfil pessoal)

### 🎨 Agente Criado
- ✅ Segue padrão do `trello-epic-creator.md`
- ✅ Gera imagens com GPT-Image-1 (DALL-E 3)
- ✅ Usa paleta roxa Liftlio (#8b5cf6 → #a855f7)
- ✅ 5 posts prontos em templates
- ✅ Sempre tag @Liftlio no final

## ⚠️ LIMITAÇÃO ATUAL: Person URN

### 🚨 Problema Identificado
O Access Token gerado só tem scope `w_member_social` (escrever posts), mas **NÃO TEM** `r_liteprofile` (ler perfil).

**Impacto:**
- ❌ Não conseguimos pegar o Person URN via API
- ❌ API retorna erro 403: "Not enough permissions"
- ✅ Mas conseguimos criar posts (w_member_social funciona)

### 🔧 SOLUÇÕES POSSÍVEIS:

#### **OPÇÃO 1: Adicionar r_liteprofile ao App (RECOMENDADO)**
1. Voltar em: https://www.linkedin.com/developers/apps
2. Selecionar app "Liftlio"
3. Na aba "Products", adicionar:
   - ✅ Sign In with LinkedIn using OpenID Connect
4. Isso dá acesso ao scope `r_liteprofile`
5. Regerar token com novo scope
6. Poderemos pegar Person URN automaticamente

#### **OPÇÃO 2: Pegar Person URN Manualmente (RÁPIDO)**
1. Ir no seu perfil LinkedIn
2. URL será algo como: `linkedin.com/in/valdair-demello-xxxxx`
3. O ID numérico está no final da URL ou via inspecionar elemento
4. Adicionar manualmente no `credentials.sh`:
   ```bash
   export LINKEDIN_PERSON_URN="urn:li:person:SEU_ID_AQUI"
   ```

#### **OPÇÃO 3: Usar Token de Teste (TEMPORÁRIO)**
LinkedIn tem um "Token Generator" que cria token com todos os scopes para teste.

## 📋 PRÓXIMOS PASSOS

### 1️⃣ **OBTER PERSON URN** (escolher uma opção acima)

### 2️⃣ **TESTAR CRIAÇÃO DE POST**
```bash
# Carregar credenciais
source /Users/valdair/Documents/Projetos/Liftlio/.claude/scripts/linkedin/credentials.sh

# Testar criação de post
curl -X POST "https://api.linkedin.com/rest/posts" \
  -H "Authorization: Bearer $LINKEDIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "LinkedIn-Version: 202401" \
  -H "X-Restli-Protocol-Version: 2.0.0" \
  -d '{
    "author": "urn:li:person:SEU_PERSON_ID",
    "commentary": "🧪 Teste de integração LinkedIn API via Claude Code",
    "visibility": "PUBLIC",
    "distribution": {
      "feedDistribution": "MAIN_FEED"
    },
    "lifecycleState": "PUBLISHED"
  }'
```

### 3️⃣ **GERAR PRIMEIRA IMAGEM**
```bash
# Exportar OpenAI key
export OPENAI_API_KEY="$(grep OPENAI_API_KEY /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/.env | cut -d'=' -f2)"

# Gerar imagem teste
/Users/valdair/Documents/Projetos/Liftlio/.claude/scripts/gpt-image-1.sh \
  "LinkedIn integration test, purple gradient #8b5cf6 to #a855f7, Liftlio branding" \
  "1536x1024" \
  "high"
```

### 4️⃣ **CRIAR POST COMPLETO COM IMAGEM**
Seguir workflow completo no agente:
1. Gerar imagem → Upload para LinkedIn
2. Criar post com imagem
3. Publicar

## 📊 STATUS ATUAL

| Item | Status | Nota |
|------|--------|------|
| Estrutura de pastas | ✅ Pronto | `.claude/scripts/linkedin/` |
| Agente criado | ✅ Pronto | `linkedin-content-creator.md` |
| Credenciais LinkedIn | ✅ Pronto | Client ID + Token |
| Templates de posts | ✅ Pronto | 5 posts prontos |
| Geração de imagens | ✅ Pronto | GPT-Image-1 funciona |
| Person URN | ⚠️ Pendente | Precisa adicionar r_liteprofile |
| Upload imagem para LinkedIn | ⏳ Aguardando | Precisa Person URN |
| Publicação de post | ⏳ Aguardando | Precisa Person URN |

## 🚀 PARA USAR O AGENTE

### Via Claude Code:
```bash
# Chamar o agente
"Claude, use o agente linkedin-content-creator para criar post sobre Google Cloud Partner"
```

O agente vai:
1. ✅ Buscar template em posts-templates.md
2. ✅ Gerar imagem roxa com GPT-Image-1
3. ⚠️ Tentar publicar no LinkedIn (precisa Person URN)

## 🔑 COMANDOS ÚTEIS

### Verificar credenciais
```bash
source /Users/valdair/Documents/Projetos/Liftlio/.claude/scripts/linkedin/credentials.sh
echo "Client ID: $LINKEDIN_CLIENT_ID"
echo "Token (primeiros 20 chars): ${LINKEDIN_ACCESS_TOKEN:0:20}..."
```

### Verificar token expiração
```bash
# Token expira em: 1764879050 (UTC timestamp)
date -r 1764879050  # Ver data de expiração
```

### Listar posts gerados
```bash
ls -lh /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/generated-images/
```

## 📝 TEMPLATES DISPONÍVEIS

1. **Post 1**: Liftlio Launch (apresentação)
2. **Post 2**: Google Cloud Partner (2M quotas)
3. **Post 3**: Custom Analytics (VPS + Docker)
4. **Post 4**: 282 SQL Functions (backend)
5. **Post 5**: Liftlio Trends (algoritmo proprietário)

Todos em `/Users/valdair/Documents/Projetos/Liftlio/.claude/scripts/linkedin/posts-templates.md`

---

**Status**: ✅ Agente criado | ⚠️ Aguardando Person URN para publicação

**Próximo passo**: Adicionar scope `r_liteprofile` ou pegar Person URN manualmente
