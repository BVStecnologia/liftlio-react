# Guia de Deploy e Servidores

## 🖥️ Servidores e Ambientes

### Frontend Principal
- **Local**: `/liftlio-react/` (desenvolvimento)
- **Produção**: Fly.io (app: liftlio, região: sjc)
- **URL**: https://liftlio.com

### Analytics Server (SERVIDOR REMOTO!)
- **Código-fonte**: `/Servidor/analytics/` (apenas código, NÃO roda local)
- **Servidor Remoto**: 173.249.22.2 (VPS Linux)
- **Container**: Docker `liftlio-analytics-prod`
- **URL Pública**: https://track.liftlio.com (via Cloudflare)
- **⚠️ IMPORTANTE**: Alterações em `/Servidor/analytics/` precisam ser deployadas via SSH no servidor remoto!

### WordPress/Blog
- **URL**: https://blog.liftlio.com
- **Server**: Cloudways (wordpress-1319296-5689133.cloudwaysapps.com)
- **Acesso**: Via MCP WordPress tools

## Deployment

### Frontend (Fly.io)
- **App**: `liftlio`
- **Região**: `sjc`
- **Docker**: Multi-stage build com Node 20 + Nginx
- **Build**: `npm run build` com `--legacy-peer-deps`

```bash
# Deploy
cd liftlio-react
fly deploy
```

### Backend (Supabase)
- **Project ID**: `suqjifkhmekcdflwowiw`
- **PostgreSQL** com RLS habilitado
- **Edge Functions** em Deno
- **pgvector** para embeddings
- **Realtime** para atualizações
- **Storage** para arquivos

## 📊 Sistema de Analytics (track.liftlio.com)

### Arquitetura
- **Servidor**: VPS Linux em 173.249.22.2 (NÃO local!)
- **Proxy**: Cloudflare com SSL Flexible (Configuration Rule específica)
- **Container**: Docker rodando `liftlio-analytics-prod`
- **Banco**: Tabela `analytics` no Supabase
- **RPC**: Função `track_event` para inserir eventos

### Como Usar
```html
<!-- Tag de tracking para sites -->
<script async src="https://track.liftlio.com/t.js" data-id="58"></script>
```

### Troubleshooting Analytics
- **Erro 521**: Verificar Configuration Rule no Cloudflare (SSL = Flexible)
- **Eventos não salvam**: Verificar função RPC `track_event` (pode ter duplicatas)
- **Bot detected**: Servidor tem proteção anti-bot agressiva

### Deploy de Mudanças no Analytics
```bash
# NO SERVIDOR REMOTO (não local!)
ssh root@173.249.22.2
cd /opt/liftlio-analytics
git pull
docker-compose down && docker-compose up -d --build
```

## Variáveis de Ambiente

### Frontend (.env)
```bash
# Nunca commitar!
REACT_APP_GOOGLE_CLIENT_ID=xxx
REACT_APP_GOOGLE_CLIENT_SECRET=xxx
REACT_APP_SUPABASE_URL=xxx
REACT_APP_SUPABASE_ANON_KEY=xxx
```

### Supabase Vault
- `CLAUDE_API_KEY` - Para Edge Functions
- `OPENAI_API_KEY` - Para embeddings e AI

## Notas de Deploy
- Fly.io configurado com auto-stop/start para economia
- Cold start ~3-5s (considerar warm-up)
- Sempre verificar credenciais antes de fazer commit
