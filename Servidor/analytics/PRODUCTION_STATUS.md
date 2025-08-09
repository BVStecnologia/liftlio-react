# 📊 Liftlio Analytics - Status de Produção

## ✅ Sistema em Produção

**Data de Deploy**: 07/08/2025  
**Status**: 🟢 ATIVO E FUNCIONANDO

## 🔗 Endpoints de Produção

- **Health Check**: http://173.249.22.2:3100/health
- **Script de Rastreamento**: http://173.249.22.2:3100/track.js
- **API de Eventos**: http://173.249.22.2:3100/track (POST)

## 🐳 Informações do Container

```
Container: liftlio-analytics-prod
Porta: 3100
Rede: analytics-isolated-network
Localização: /opt/containers/liftlio-analytics/
```

## 📝 Como Usar

Adicione este script em qualquer página HTML que deseja rastrear:

```html
<script src="http://173.249.22.2:3100/track.js" data-project="58"></script>
```

## 🔧 Comandos de Manutenção

```bash
# Conectar ao servidor
ssh root@173.249.22.2

# Ver logs em tempo real
docker logs -f liftlio-analytics-prod

# Reiniciar container
docker restart liftlio-analytics-prod

# Ver status
docker ps | grep liftlio-analytics

# Parar container
docker stop liftlio-analytics-prod

# Iniciar container
cd /opt/containers/liftlio-analytics
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Verificar Eventos no Supabase

```sql
-- Últimos eventos do projeto 58
SELECT * FROM analytics 
WHERE project_id = 58 
ORDER BY created_at DESC 
LIMIT 100;

-- Total de eventos hoje
SELECT COUNT(*) as total_hoje
FROM analytics
WHERE project_id = 58
AND created_at >= CURRENT_DATE;

-- Eventos por tipo
SELECT event_type, COUNT(*) as total
FROM analytics
WHERE project_id = 58
GROUP BY event_type
ORDER BY total DESC;
```

## 🔐 Segurança

- ✅ Container isolado em rede própria
- ✅ Recursos limitados (CPU: 0.5, RAM: 512MB)
- ✅ Usuário não-root dentro do container
- ✅ Health checks automáticos
- ✅ Validação de project_id no servidor
- ✅ CORS habilitado para qualquer origem

## 📈 Métricas Rastreadas

- Pageviews automáticos
- Eventos customizados
- Tempo na página
- Cliques em links externos
- Erros JavaScript
- Performance (load time, first paint)
- Informações do dispositivo (browser, OS, resolução)
- Sessões e visitantes únicos

## 🚨 Monitoramento

Para verificar se o sistema está funcionando:

```bash
# Teste rápido de saúde
curl http://173.249.22.2:3100/health

# Deve retornar:
# {"status":"ok","service":"liftlio-analytics","timestamp":"..."}
```

## 📝 Notas

- O sistema usa a função SQL `track_event()` criada no Supabase
- Todos os eventos são salvos na tabela `analytics`
- Visitor ID é persistido no localStorage do navegador
- Session ID expira após 30 minutos de inatividade

---

**Última verificação**: 07/08/2025 14:00  
**Próxima manutenção**: A definir