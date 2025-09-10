# 📊 Liftlio Analytics Server

Sistema de rastreamento de analytics para o Liftlio, com validação de projetos via Supabase e armazenamento centralizado de eventos.

## 🚨 ATENÇÃO: SERVIDOR REMOTO EM PRODUÇÃO

⚠️ **IMPORTANTE**: Este diretório contém o código-fonte do servidor analytics que está **RODANDO EM PRODUÇÃO NO SERVIDOR REMOTO 173.249.22.2**, não localmente!

### 📍 Localização do Servidor:
- **🖥️ Servidor Remoto**: 173.249.22.2 (VPS Linux)
- **📂 Caminho no Servidor**: `/opt/liftlio-analytics/`
- **🐳 Container Docker**: `liftlio-analytics-prod`
- **🔧 Acesso SSH**: `ssh -i ~/.ssh/contabo_key root@173.249.22.2`

### 🌐 URLs e Acessos:
- **URL Pública**: https://track.liftlio.com (via Cloudflare Proxy)
- **Porta no Servidor**: 3100
- **Health Check Direto**: http://173.249.22.2:3100/health (apenas para debug)

### ⚠️ Configuração Cloudflare (NÃO MEXER SEM NECESSIDADE):
- **Domínio**: track.liftlio.com
- **Tipo**: A Record apontando para 173.249.22.2
- **Proxy**: ✅ ATIVADO (nuvem laranja)
- **SSL Mode**: Flexible (via Configuration Rule específica)
- **Proteção DDoS**: Ativa

**❌ NUNCA usar o IP direto em produção! Sempre usar track.liftlio.com**
**❌ NUNCA rodar docker-compose localmente para produção!**

## 🚀 Características

- ✅ Validação de `project_id` contra Supabase
- 📊 Rastreamento automático de pageview
- 🔍 Detecção de browser, OS e tipo de dispositivo
- 💾 Persistência de visitor_id e session_id
- 🎯 Eventos customizados e goals
- 🛒 Rastreamento de compras
- 👤 Identificação de usuários
- ⚡ Performance tracking
- 🐛 Captura de erros JavaScript
- 🔗 Rastreamento de links externos
- 🐳 Docker ready

## 📋 Pré-requisitos

- Node.js 18+ (desenvolvimento local)
- Docker e Docker Compose (deploy)
- Acesso ao projeto Supabase

## 🔧 Como Fazer Alterações no Servidor de Produção

### ⚠️ FLUXO CORRETO para atualizar o servidor:

#### 🔑 ACESSO SSH (IMPORTANTE!)
- **Acesso SSH**: Apenas com chave (`~/.ssh/contabo_key`)
- **Diretório no servidor**: `/opt/containers/liftlio-analytics` (NÃO é git repo!)
- **Container Docker**: `liftlio-analytics-prod`

#### Deploy Rápido:
```bash
# Copiar arquivo alterado
scp -i ~/.ssh/contabo_key t.js root@173.249.22.2:/opt/containers/liftlio-analytics/

# Reiniciar container
ssh -i ~/.ssh/contabo_key root@173.249.22.2 "docker restart liftlio-analytics-prod"
```

#### Deploy Manual:
1. **Fazer alterações localmente** neste diretório
2. **Testar localmente** (opcional):
   ```bash
   npm install
   npm run dev  # Roda na porta 3000 local para teste
   ```
3. **Copiar arquivos para o servidor**:
   ```bash
   scp -i ~/.ssh/contabo_key *.js *.json root@173.249.22.2:/opt/containers/liftlio-analytics/
   ```
4. **Reiniciar container**:
   ```bash
   ssh -i ~/.ssh/contabo_key root@173.249.22.2
   docker restart liftlio-analytics-prod
   ```
5. **Verificar logs**:
   ```bash
   docker logs -f liftlio-analytics-prod
   ```

### ❌ O QUE NÃO FAZER:
- NÃO rodar `docker-compose up` localmente achando que vai afetar produção
- NÃO editar arquivos diretamente no servidor (sempre via Git)
- NÃO expor o IP 173.249.22.2 publicamente

## 🛠️ Instalação (APENAS PARA DESENVOLVIMENTO LOCAL)

### 1. Configurar variáveis de ambiente

Crie o arquivo `.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://suqjifkhmekcdflwowiw.supabase.co
SUPABASE_ANON_KEY=sua_anon_key_aqui

# Server Configuration
PORT=3000
NODE_ENV=production
```

### 2. Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Rodar servidor
npm start

# Ou com hot-reload
npm run dev
```

### 3. Deploy com Docker

```bash
# Build e iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

### 4. Deploy para Produção

```bash
# Usar script de deploy
./deploy-production.sh

# Ou manualmente via Docker local
docker-compose up -d
```

## 📝 Como Usar

### 1. Adicionar script no site

```html
<!-- IMPORTANTE: Sempre usar track.liftlio.com (Cloudflare Proxy) -->
<!-- O PROJECT_ID é gerado automaticamente na tabela Projeto -->
<script async src="https://track.liftlio.com/t.js" data-id="58"></script>

<!-- NUNCA usar o IP direto! -->
<!-- ❌ ERRADO: <script src="http://173.249.22.2:3100/track.js"> -->
<!-- ✅ CORRETO: <script src="https://track.liftlio.com/t.js"> -->
```

### 2. API JavaScript

O script expõe a seguinte API global:

```javascript
// Rastreamento básico (já feito automaticamente)
liftlio.track('pageview');

// Evento customizado
liftlio.trackEvent('button_click', {
    button: 'subscribe',
    value: 29.99
});

// Rastrear goal/conversão
liftlio.trackGoal('newsletter_signup', 1);

// Rastrear compra
liftlio.trackPurchase('ORDER-123', 299.99, [
    { id: 'PROD-1', name: 'Plano Premium', price: 299.99 }
]);

// Identificar usuário
liftlio.setUser('user-123', {
    name: 'João Silva',
    email: 'joao@example.com',
    plan: 'premium'
});
```

## 🧪 Teste

1. Abra `test-local.html` no navegador
2. Verifique o console para logs
3. Teste os diferentes botões de eventos
4. Verifique no Supabase se os eventos foram salvos

## 📊 Estrutura de Dados

### Evento enviado ao servidor:

```json
{
  "project_id": "58",
  "event_type": "pageview",
  "visitor_id": "visitor_abc123",
  "session_id": "session_xyz789",
  "page_url": "https://example.com/page",
  "page_title": "Página Exemplo",
  "referrer": "https://google.com",
  "user_agent": "Mozilla/5.0...",
  "screen_resolution": "1920x1080",
  "viewport_size": "1920x969",
  "device_type": "desktop",
  "browser": "Chrome",
  "os": "macOS",
  "custom_data": {
    "timezone": "America/Sao_Paulo",
    "language": "pt-BR"
  }
}
```

## 🔒 Segurança

- Validação de `project_id` no servidor
- CORS habilitado para qualquer origem (ajuste em produção se necessário)
- Container Docker roda com usuário não-root
- Health checks configurados
- Logs limitados para evitar uso excessivo de disco

## 📁 Estrutura de Arquivos

```
analytics/
├── server.js              # Servidor Express principal
├── track.js              # Script cliente para rastreamento  
├── package.json          # Dependências Node.js
├── Dockerfile            # Imagem Docker
├── docker-compose.yml    # Configuração Docker Compose local
├── .env                  # Variáveis de ambiente (não commitar!)
├── .gitignore            # Arquivos ignorados pelo Git
├── test-local.html       # Página de teste local
├── deploy-production.sh  # Script de deploy para produção
└── README.md            # Esta documentação
```

## 🚀 Deploy em Produção

### Opção 1: Servidor com Docker

```bash
ssh root@seu-servidor
cd /opt
git clone [seu-repo]
cd analytics
cp .env.example .env
# Editar .env com suas credenciais
docker-compose up -d
```

### Opção 2: Nginx Proxy

Adicione ao nginx.conf:

```nginx
location /analytics/ {
    proxy_pass http://localhost:3001/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Opção 3: Atualizar Script no Banco

```sql
-- Atualizar todos os projetos
UPDATE "Projeto" 
SET analytics_script = '<script src="https://seu-dominio.com/analytics/track.js" data-project="' || id || '"></script>'
WHERE ativo = true;

-- Ou projeto específico
UPDATE "Projeto" 
SET analytics_script = '<script src="https://seu-dominio.com/analytics/track.js" data-project="58"></script>'
WHERE id = 58;
```

## 🔍 Monitoramento

### Verificar saúde do serviço:

```bash
curl http://localhost:3001/health
```

### Ver logs do Docker:

```bash
docker-compose logs -f liftlio-analytics
```

### Verificar eventos no Supabase:

```sql
-- Últimos eventos
SELECT * FROM analytics 
WHERE project_id = 58 
ORDER BY created_at DESC 
LIMIT 100;

-- Estatísticas por tipo
SELECT event_type, COUNT(*) as total
FROM analytics
WHERE project_id = 58
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY total DESC;
```

## ⚠️ IMPORTANTE: Problema CORS com Cloudflare

### Problema Comum: Headers CORS Duplicados
Se você ver o erro:
```
The 'Access-Control-Allow-Origin' header contains multiple values '*, *', but only one is allowed
```

### Causa:
O Cloudflare Proxy adiciona seus próprios headers CORS, duplicando com os do servidor.

### Solução Implementada:
O servidor detecta automaticamente se está atrás do Cloudflare:
- **COM Cloudflare**: NÃO adiciona CORS (Cloudflare adiciona)
- **SEM Cloudflare**: Adiciona CORS normalmente

### Como Testar:
1. Abra o arquivo `test-cors.html` no navegador
2. Clique nos botões de teste na ordem
3. Verifique se não há duplicação de headers

### Para Outras Plataformas:
O código já está preparado para funcionar em:
- ✅ Cloudflare (detecta automaticamente)
- ✅ Servidor direto (adiciona CORS)
- ✅ Vercel/Netlify (adiciona CORS)
- ✅ Nginx/Apache proxy (adiciona CORS)

## 🐛 Troubleshooting

### Erro 521 no Cloudflare (Web server is down)
**Problema**: Cloudflare não consegue conectar ao servidor
**Soluções**:
1. Verificar se o container está rodando no servidor:
   ```bash
   ssh root@173.249.22.2
   docker ps | grep analytics
   ```
2. Verificar Configuration Rule no Cloudflare:
   - Ir em Rules → Configuration Rules
   - Confirmar que track.liftlio.com está com SSL = Flexible
3. Testar direto no servidor:
   ```bash
   curl http://173.249.22.2:3100/health
   ```

### Container não inicia NO SERVIDOR REMOTO
- SSH no servidor: `ssh root@173.249.22.2`
- Verificar logs: `docker logs liftlio-analytics-prod`
- Reiniciar: `docker restart liftlio-analytics-prod`

### Eventos não chegam ao Supabase
- Verificar função RPC `track_event` no Supabase
- Checar se há funções duplicadas (pode causar conflito)
- Verificar logs: `mcp__supabase__get_logs` com service='api'

### Script não carrega no site
- URL correta: `https://track.liftlio.com/t.js`
- Verificar no Console do navegador (F12)
- Confirmar `data-id="58"` no script tag

## 📝 Licença

MIT

## 👥 Suporte

Para dúvidas ou problemas, abra uma issue ou contate a equipe Liftlio.