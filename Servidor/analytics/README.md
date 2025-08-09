# 📊 Liftlio Analytics Server

Sistema de rastreamento de analytics para o Liftlio, com validação de projetos via Supabase e armazenamento centralizado de eventos.

## 🚀 Status: EM PRODUÇÃO

- **Servidor**: 173.249.22.2
- **Porta**: 3100
- **Container**: liftlio-analytics-prod
- **Health**: http://173.249.22.2:3100/health

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

## 🛠️ Instalação

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
<!-- Substitua PROJECT_ID pelo ID do seu projeto -->
<script src="https://seu-dominio.com/track.js" data-project="58"></script>
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

## 🐛 Troubleshooting

### Container não inicia
- Verifique se a porta 3001 está livre: `lsof -i :3001`
- Verifique logs: `docker-compose logs`

### Eventos não chegam ao Supabase
- Verifique credenciais no `.env`
- Teste conexão: `curl http://localhost:3001/health`
- Verifique logs do servidor

### Script não carrega no site
- Verifique CORS no navegador (F12 > Console)
- Confirme que `data-project` está presente
- Teste com `test-local.html` primeiro

## 📝 Licença

MIT

## 👥 Suporte

Para dúvidas ou problemas, abra uma issue ou contate a equipe Liftlio.