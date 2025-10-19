# Serviço de Transcrição YouTube - Liftlio

## 📋 Visão Geral

Serviço FastAPI para transcrição de vídeos do YouTube usando `youtube-transcript-api` com proxy DataImpulse para evitar bloqueios.

**Deploy:** VPS 173.249.22.2 + Cloudflare DNS-only
**URL Produção:** https://transcricao.liftlio.com/transcribe
**Container:** `liftlio-transcricao` (porta 8081)

---

## 🏗️ Arquitetura

```
Cliente/Supabase
    ↓ HTTPS
Cloudflare DNS-only (sem proxy, sem timeout 30s)
    ↓ HTTPS (Let's Encrypt)
Nginx reverse proxy (porta 443 → 8081)
    ↓ HTTP
Docker container FastAPI (porta 8081)
    ↓ HTTP com proxy
DataImpulse Proxy → YouTube API
```

---

## 🚀 Deploy

### Automático (Recomendado)
```bash
cd /Users/valdair/Documents/Projetos/Liftlio/Servidor/transcricao
./deploy-vps.sh
```

### Manual
```bash
# 1. SSH no servidor
ssh -i ~/.ssh/contabo_key root@173.249.22.2

# 2. Ir para diretório
cd /opt/liftlio-transcricao

# 3. Build e start
docker-compose down
docker-compose up -d --build

# 4. Verificar logs
docker logs liftlio-transcricao --tail 50
```

---

## 🔧 Configuração

### Variáveis de Ambiente (.env)
```env
DATAIMPULSE_LOGIN=2e6fd60c4b7ca899cef0
DATAIMPULSE_PASSWORD=5742ea9e468dae46
DATAIMPULSE_HOST=gw.dataimpulse.com
DATAIMPULSE_PORT=10000
```

### Nginx (Gerenciado por Certbot)
- **Config:** `/etc/nginx/sites-available/transcricao.liftlio.com`
- **SSL:** Let's Encrypt (auto-renew via cron)
- **Timeouts:** 300s (5 minutos)

### Cloudflare DNS
- **Tipo:** A
- **Nome:** transcricao
- **IP:** 173.249.22.2
- **Proxy:** ❌ Desativado (DNS-only, nuvem cinza)
- **SSL Mode:** N/A (direto no servidor)

---

## 📡 Endpoints

### POST /transcribe
Transcreve vídeo do YouTube (formato simplificado).

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "transcription": "TRANSCRIÇÃO DO VÍDEO\n...",
  "video_id": "VIDEO_ID",
  "contem": true
}
```

### POST /process
Transcreve vídeo do YouTube (formato completo com metadados).

### GET /docs
Documentação interativa Swagger UI.

---

## 🧪 Testes

### Teste Local (VPS)
```bash
ssh -i ~/.ssh/contabo_key root@173.249.22.2

# Teste direto no container
curl -X POST http://localhost:8081/transcribe \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"}'

# Teste via Nginx
curl -X POST http://localhost/transcribe \
  -H 'Host: transcricao.liftlio.com' \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"}'
```

### Teste Remoto
```bash
# HTTPS (produção)
curl -X POST https://transcricao.liftlio.com/transcribe \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"}'
```

---

## 🔍 Troubleshooting

### Container não inicia
```bash
# Ver logs
docker logs liftlio-transcricao

# Rebuild
cd /opt/liftlio-transcricao
docker-compose down
docker-compose up -d --build
```

### SSL não funciona
```bash
# Verificar certificado
certbot certificates

# Renovar manualmente
certbot renew --nginx

# Verificar Nginx
nginx -t
systemctl reload nginx
```

### Timeout / Slow response
```bash
# Verificar se DataImpulse está configurado
docker exec liftlio-transcricao env | grep DATAIMPULSE

# Ver logs do container
docker logs liftlio-transcricao --tail 100
```

### DNS não resolve
```bash
# Verificar DNS
dig transcricao.liftlio.com

# Deve retornar: 173.249.22.2
# Se retornar IPs do Cloudflare, proxy está ativado (errado!)
```

---

## 📊 Performance

- **Resposta média:** 4-5 segundos
- **Cold start:** N/A (always-on)
- **Timeout máximo:** 300s (configurado no Nginx)
- **Concurrent requests:** Até 5 simultâneas

---

## ⚠️ Importante

### Por que DNS-only (sem proxy Cloudflare)?

**Cloudflare tem timeout FIXO de 30 segundos para POST requests.**

- ❌ Com proxy (nuvem laranja): Timeout após 30s → FALHA
- ✅ Sem proxy (nuvem cinza): Sem limite → FUNCIONA

### Comparação com outros serviços

| Serviço | Cloudflare Proxy | Por quê? |
|---------|------------------|----------|
| track.liftlio.com | ✅ Ativado | Requisições rápidas (< 1s) |
| transcricao.liftlio.com | ❌ Desativado | Requisições longas (20-30s) |

Ambos têm HTTPS! A diferença é QUEM fornece o SSL:
- track = SSL do Cloudflare
- transcricao = SSL do servidor (Let's Encrypt)

---

## 🔄 Migração Fly.io → VPS

**Antes:**
```
https://youtube-transcribe.fly.dev/transcribe
```

**Depois:**
```
https://transcricao.liftlio.com/transcribe
```

**Benefícios:**
- ⚡ Mais rápido (~4-5s vs ~8-9s)
- ∞ Sem timeout de 30s
- 💰 Custo zero (VPS já pago)
- 🔒 SSL próprio (Let's Encrypt)
- 🌐 Mesmo proxy DataImpulse

---

## 📚 Referências

- **Função SQL:** `/liftlio-react/supabase/functions_backup/SQL_Functions/01_YouTube/youtube_transcribe.sql`
- **Nginx Config:** `/etc/nginx/sites-available/transcricao.liftlio.com` (no VPS)
- **SSL Cert:** `/etc/letsencrypt/live/transcricao.liftlio.com/` (no VPS)

---

## 📅 Histórico

- **2025-10-19**: Deploy inicial no VPS, configuração SSL Let's Encrypt, DNS-only Cloudflare
- **2025-01-23**: Versão original criada no Fly.io
