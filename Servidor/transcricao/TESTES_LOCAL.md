# 🧪 Guia de Testes Locais - API Transcrição com Cache

## 📋 Pré-requisitos

1. Docker instalado e rodando
2. Python 3.x instalado
3. Git Bash ou terminal similar

## 🚀 Como Rodar os Testes

### Passo 1: Configurar Variáveis de Ambiente

```bash
cp .env.test .env
nano .env  # Ou use seu editor preferido
```

**Importante:** Configure o `SUPABASE_SERVICE_KEY` pegando do Dashboard Supabase:
- Vá em: https://supabase.com/dashboard/project/suqjifkhmekcdflwowiw/settings/api
- Copie a chave `service_role` (secret)
- Cole no `.env`

**Se NÃO configurar Supabase:**
- Cache ficará DESABILITADO
- API funcionará normalmente (sem cache)
- Logs mostrarão: "⚠️  Supabase cache DESABILITADO"

### Passo 2: Buildar Imagem Docker

```bash
docker build -t liftlio-transcricao-cache:test .
```

### Passo 3: Rodar Container de Testes

```bash
# Rodar em porta DIFERENTE da produção (8082 vs 8081)
docker run -d \
  -p 8082:8080 \
  --env-file .env \
  --name transcricao-test \
  liftlio-transcricao-cache:test
```

### Passo 4: Aguardar Inicialização (5-10 segundos)

```bash
# Ver logs em tempo real
docker logs -f transcricao-test

# Aguarde até ver:
# "Uvicorn running on http://0.0.0.0:8080"
```

### Passo 5: Executar Testes Automatizados

```bash
./test_cache.sh
```

## 📊 O Que os Testes Verificam

### Teste 1: Cache HIT
- Vídeo: `JBeQDU6WIPU` (existe no cache)
- Espera-se: `"from_cache": true`
- Latência: ~100-200ms

### Teste 2: Cache MISS
- Vídeo: `dQw4w9WgXcQ` (Rick Roll - pode não estar no cache)
- Espera-se: `"from_cache": false`
- Latência: 2-10 segundos (chama YouTube API)
- Após primeira execução, vira cache HIT!

### Teste 3: Vídeo Sem Transcrição
- Vídeo: `test123` (inválido)
- Espera-se: `"contem": false`
- Erro esperado

## ✅ Resultado Esperado

### Se cache HABILITADO:
```
✅ Supabase cache HABILITADO
✅ CACHE HIT: JBeQDU6WIPU
❌ CACHE MISS: dQw4w9WgXcQ
✅ CACHE SAVED: dQw4w9WgXcQ
```

### Se cache DESABILITADO (sem credenciais):
```
⚠️  Supabase cache DESABILITADO (credenciais não configuradas)
❌ CACHE MISS: JBeQDU6WIPU
❌ CACHE MISS: dQw4w9WgXcQ
```

## 🐛 Debugging

### Ver logs completos:
```bash
docker logs transcricao-test --tail 100
```

### Testar endpoint manualmente:
```bash
curl -X POST http://localhost:8082/transcribe \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=JBeQDU6WIPU"}' \
  | python -m json.tool
```

### Verificar se Supabase está conectando:
```bash
docker logs transcricao-test 2>&1 | grep -i supabase
```

Deve mostrar:
- `✅ Supabase cache HABILITADO` (se configurado)
- `⚠️  Supabase cache DESABILITADO` (se não configurado)

## 🧹 Limpeza Após Testes

```bash
# Parar e remover container
docker stop transcricao-test
docker rm transcricao-test

# Remover imagem de teste (opcional)
docker rmi liftlio-transcricao-cache:test
```

## 🚀 Próximo Passo: Deploy VPS

Se testes passaram:
1. Commit das mudanças no Git
2. Deploy no VPS usando `./deploy-vps.sh`
3. Monitorar logs em produção

## ⚠️ Importante

- **NUNCA** commite `.env` no Git (está no .gitignore)
- Use porta 8082 para testes (8081 é produção)
- Testes locais usam LIVE Supabase (mesma tabela de produção)
- Cache HIT economiza chamadas ao YouTube (proxy DataImpulse)
