# 🏠 Branch: dev-supabase-local

## 📋 Overview

Esta branch está configurada para usar **100% Supabase local** rodando no Docker.

**Nenhuma requisição vai para produção** - tudo roda no seu MacBook.

---

## 🔧 Configuração Inicial

### 1. Certifique-se que o Supabase está rodando

```bash
cd liftlio-react/supabase
supabase status
```

Se não estiver rodando:
```bash
supabase start
```

### 2. Verifique as URLs

Você deve ver:
```
         API URL: http://127.0.0.1:54321
      Studio URL: http://127.0.0.1:54323
    Database URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
 Publishable key: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
```

### 3. Configure as variáveis de ambiente

O arquivo `.env.local` já está configurado com:
- ✅ `REACT_APP_SUPABASE_URL=http://127.0.0.1:54321`
- ✅ `REACT_APP_SUPABASE_ANON_KEY=sb_publishable_...`

**Você precisa adicionar:**
- ❌ `REACT_APP_GOOGLE_CLIENT_ID` (do Google Console)
- ❌ `REACT_APP_GOOGLE_CLIENT_SECRET` (do Google Console)
- ❌ `OPENAI_API_KEY` (se usar AI features)

---

## 🔐 Google OAuth - Configuração Local

### Passo 1: Google Cloud Console

Acesse: https://console.cloud.google.com/apis/credentials

### Passo 2: Adicionar Redirect URIs

No seu OAuth 2.0 Client ID, adicione estas URLs:

```
http://localhost:3000
http://127.0.0.1:3000
http://127.0.0.1:54321/auth/v1/callback
http://localhost:54321/auth/v1/callback
```

### Passo 3: Configurar no Supabase Local

No Studio (http://127.0.0.1:54323):
1. Vá em **Authentication** > **Providers**
2. Ative **Google**
3. Cole seu Client ID e Client Secret
4. Salve

**Ou via SQL:**
```sql
-- No Studio > SQL Editor
INSERT INTO auth.config (
    key,
    value
) VALUES
    ('external_google_enabled', 'true'),
    ('external_google_client_id', 'SEU_CLIENT_ID'),
    ('external_google_secret', 'SEU_CLIENT_SECRET')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

### Passo 4: Atualizar .env.local

```bash
cd liftlio-react
nano .env.local
```

Adicione suas credenciais:
```env
REACT_APP_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
REACT_APP_GOOGLE_CLIENT_SECRET=GOCSPX-xyz123
```

---

## ⚡ Edge Functions - Como Funcionam Localmente

### Status Atual

✅ **Edge Functions funcionam normalmente no local!**

Elas rodam no container `supabase_edge_runtime_Supabase` (Deno).

### Como Testar uma Edge Function

#### Exemplo 1: Função Existente

Se você tem uma função em `/supabase/functions/agente-liftlio/`:

```bash
# Invocar via curl
curl http://127.0.0.1:54321/functions/v1/agente-liftlio \
  -H "Authorization: Bearer sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH" \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello"}'
```

#### Exemplo 2: Criar Nova Edge Function

```bash
cd liftlio-react/supabase
supabase functions new test-local

# Editar o arquivo
nano supabase/functions/test-local/index.ts
```

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  return new Response(
    JSON.stringify({
      message: "Hello from LOCAL Edge Function!",
      timestamp: new Date().toISOString()
    }),
    { headers: { "Content-Type": "application/json" } }
  )
})
```

**Deploy local (automático):**
```bash
# Apenas salve o arquivo - hot reload está ativado!
# A função já está disponível em:
# http://127.0.0.1:54321/functions/v1/test-local
```

**Testar:**
```bash
curl http://127.0.0.1:54321/functions/v1/test-local \
  -H "Authorization: Bearer sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
```

### Debugging Edge Functions

Ver logs em tempo real:
```bash
docker logs -f supabase_edge_runtime_Supabase
```

Ou no Studio:
1. Acesse http://127.0.0.1:54323
2. Vá em **Edge Functions**
3. Clique na função
4. Veja **Logs** tab

### Secrets para Edge Functions

Adicionar secrets localmente:

```bash
# No supabase/config.toml
[edge_runtime.secrets]
CLAUDE_API_KEY = "env(CLAUDE_API_KEY)"
OPENAI_API_KEY = "env(OPENAI_API_KEY)"
```

Ou criar arquivo `.env` no root do supabase/:
```bash
cd liftlio-react/supabase
echo "CLAUDE_API_KEY=sk-ant-..." >> .env
echo "OPENAI_API_KEY=sk-..." >> .env
```

---

## 🚀 Rodando o App React

### 1. Instalar dependências (se necessário)

```bash
cd liftlio-react
npm install --legacy-peer-deps
```

### 2. Iniciar desenvolvimento

```bash
npm start
```

O app abrirá em http://localhost:3000 e vai usar o Supabase local!

### 3. Verificar conexão

No console do navegador (F12), você deve ver requisições para:
- `http://127.0.0.1:54321/...` ✅

Se vir requisições para `https://suqjifkhmekcdflwowiw.supabase.co`, algo está errado!

---

## 🧪 Testando Funções SQL

### No Studio UI

1. Abra http://127.0.0.1:54323
2. Vá em **SQL Editor**
3. Execute:

```sql
-- Testar função customizada
SELECT * FROM add_to_waitlist(
    'Test User',
    'test@local.dev',
    'https://example.com',
    'Local Testing'
);

-- Ver todas as funções customizadas
SELECT p.proname, pg_get_function_arguments(p.oid)
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname NOT LIKE 'vector%'
  AND p.proname NOT LIKE 'hstore%'
ORDER BY p.proname;
```

### Via JavaScript (no app)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'http://127.0.0.1:54321',
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
)

// Chamar função SQL
const { data, error } = await supabase.rpc('add_to_waitlist', {
  p_name: 'Test User',
  p_email: 'test@local.dev',
  p_website_url: 'https://example.com',
  p_discovery_source: 'Local Testing'
})
```

---

## 📊 Dados de Teste

### Seed Data

Crie dados de teste no arquivo:
```bash
nano liftlio-react/supabase/supabase/seed.sql
```

Exemplo:
```sql
-- Inserir usuário de teste
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'test@local.dev',
    crypt('password123', gen_salt('bf')),
    NOW()
);

-- Inserir projeto de teste
INSERT INTO "Projeto" (
    id,
    name,
    user_id
) VALUES (
    1,
    'Test Project Local',
    '00000000-0000-0000-0000-000000000001'
);
```

Aplicar seed:
```bash
supabase db reset  # Reaplica migrations + seed
```

---

## 🔍 Troubleshooting

### Problema: "Failed to fetch"

**Causa:** Supabase local não está rodando
**Solução:**
```bash
cd liftlio-react/supabase
supabase start
```

### Problema: "Invalid API key"

**Causa:** .env.local com chave errada
**Solução:** Verifique que está usando `sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH`

### Problema: Google OAuth não funciona

**Causa:** Redirect URIs não configuradas
**Solução:** Adicione todos os 4 URIs no Google Console (veja seção OAuth acima)

### Problema: Edge Function retorna 404

**Causa:** Função não existe ou nome errado
**Solução:**
```bash
# Listar funções disponíveis
ls -la liftlio-react/supabase/supabase/functions/

# Ver logs
docker logs supabase_edge_runtime_Supabase
```

### Problema: Funções SQL não existem

**Causa:** Apenas 19/287 foram importadas
**Solução:** Importe o restante via supabase CLI:
```bash
cd liftlio-react/supabase
supabase login
supabase link --project-ref suqjifkhmekcdflwowiw
supabase db pull
supabase db reset
```

---

## 📁 Estrutura da Branch

```
dev-supabase-local/
├── liftlio-react/
│   ├── .env.local                    ← Configuração local
│   ├── src/
│   │   └── lib/
│   │       └── supabaseClient.ts     ← Usa .env.local
│   └── supabase/
│       ├── setup-local.sh
│       ├── LOCAL_DEV_SETUP.md
│       └── supabase/
│           ├── config.toml            ← Otimizado M2 8GB
│           ├── functions/             ← Edge Functions
│           └── migrations/            ← Schema + SQL functions
└── DEV_SUPABASE_LOCAL_SETUP.md       ← Este arquivo
```

---

## ✅ Checklist Rápido

Antes de começar a desenvolver:

- [ ] Supabase local rodando (`supabase status`)
- [ ] .env.local configurado
- [ ] Google OAuth URIs adicionadas (se usar login)
- [ ] Funções SQL importadas (19+/287)
- [ ] Edge Functions testadas
- [ ] Dados seed criados (opcional)
- [ ] App React conectando no local (não produção)

---

## 🎯 Próximos Passos

### 1. Importar Funções Restantes

```bash
cd liftlio-react/supabase
supabase login
supabase link --project-ref suqjifkhmekcdflwowiw
supabase db pull
supabase db reset
```

Isso importa todas as 287 funções do LIVE.

### 2. Desenvolver Features

Agora você pode:
- ✅ Modificar schema sem medo
- ✅ Testar Edge Functions localmente
- ✅ Criar dados de teste
- ✅ Fazer queries SQL diretamente
- ✅ Debug completo no Studio

### 3. Quando Terminar

Para voltar ao ambiente de produção:
```bash
git checkout main
```

Para merge das mudanças:
```bash
# Criar migration das mudanças locais
supabase db diff -f nome_da_migration

# Commit
git add .
git commit -m "feat: nova feature desenvolvida localmente"

# Merge
git checkout main
git merge dev-supabase-local
```

---

## 🚨 Importante

- ❌ **NÃO faça push do .env.local** (já está gitignored)
- ✅ **Sempre use supabase db diff** antes de merge
- ✅ **Teste no DEV remoto** antes de aplicar no LIVE
- ✅ **Documente mudanças** nas migrations

---

**Branch criada em:** 2025-11-01 18:30
**Supabase Local:** Funcionando ✅
**Docker Memory:** 973MB ✅
**Edge Functions:** Funcionais ✅

**Divirta-se desenvolvendo localmente! 🚀**
