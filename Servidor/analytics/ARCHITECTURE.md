# 🏗️ Arquitetura do Sistema Analytics Liftlio

## 📁 Estrutura de Arquivos

```
/Servidor/analytics/
├── server.js           # Servidor principal com todas proteções
├── server-backup.js    # Backup da versão anterior
├── t.js                # Script cliente (aceita data-id)
├── track.js            # Script cliente (legacy, aceita data-project)
├── package.json        # Dependências
├── Dockerfile          # Container Docker
├── docker-compose.yml  # Orquestração
├── .env               # Variáveis de ambiente (com SSH credentials)
├── test-analytics.html # Página de teste
├── ARCHITECTURE.md    # Este documento
└── PRODUCTION_STATUS.md # Status de produção
```

## ✅ Sistema Implementado (PRODUÇÃO)

### 🛡️ FASE 1: Sistema Anti-Bot (COMPLETO)
**Status**: ✅ Em produção desde 12/08/2025

#### Detecção de Bots Implementada
- ✅ Lista de 40+ user-agents de bots bloqueados
- ✅ Verifica navegador/OS real
- ✅ Bloqueia user-agents vazios ou genéricos
- ✅ Rejeita: curl, wget, python, scrapers, crawlers
- ✅ Rate limiting: 30 eventos/min por visitor

#### Validação de Eventos
- ✅ Deduplicação: cache de 5 segundos
- ✅ Valida project_id existe no Supabase
- ✅ Eventos rejeitados retornam `rejected: true`
- ✅ Logs no console para debug

### 📍 FASE 2: Identificação de Origem (COMPLETO)
**Status**: ✅ Em produção desde 12/08/2025

#### Origem do Tráfego Implementada
```javascript
// Categorização automática no server.js:
- Google/Bing/Yahoo/DuckDuckGo → "Google Search", "Bing Search", etc
- Facebook/Twitter/LinkedIn → "Facebook", "Twitter/X", "LinkedIn"
- Sem referrer → "Direct"
- Outros sites → "External Site"
- Liftlio.com → "Liftlio Internal"
```

#### UTM Parameters
- ✅ Extrai automaticamente: utm_source, utm_medium, utm_campaign
- ✅ Salva em `custom_data.utm_params`
- ✅ Identifica campanhas pagas vs orgânico

### 🔍 IMPORTANTE: Search Orgânico vs Ads

**Como diferenciar na tabela analytics:**

```sql
-- Search ORGÂNICO (gerado pelo Liftlio)
SELECT * FROM analytics 
WHERE custom_data->>'traffic_source' LIKE '%Search%'
  AND custom_data->'utm_params'->>'utm_medium' IS NULL;

-- Search PAGO (Ads)
SELECT * FROM analytics 
WHERE custom_data->>'traffic_source' LIKE '%Search%'
  AND custom_data->'utm_params'->>'utm_medium' = 'cpc';

-- Ou verificar utm_source
WHERE custom_data->'utm_params'->>'utm_source' = 'google-ads';
```

**Regra Simples:**
- ✅ **Tem UTM com medium=cpc** → É Ad pago
- ✅ **Sem UTM + veio do Google** → É orgânico (mérito Liftlio)
- ✅ **utm_campaign presente** → Campanha específica

## 🛠️ Stack Tecnológica

### Backend (Node.js) - IMPLEMENTADO
```javascript
// Bibliotecas em uso:
express         // ✅ Servidor web
cors           // ✅ CORS habilitado
crypto         // ✅ Fingerprinting
@supabase/supabase-js // ✅ Conexão com banco
```

### Armazenamento (Supabase)
```javascript
// Tabela principal: analytics
{
  id: bigint,
  project_id: bigint,
  visitor_id: varchar,
  session_id: varchar,
  event_type: varchar,
  url: text,
  referrer: text,
  custom_data: jsonb {
    traffic_source: "Google Search",
    utm_params: { source, medium, campaign },
    fingerprint: "hash",
    is_bot: false,
    validated_at: "timestamp"
  }
}
```

### Cliente (JavaScript)
```javascript
// Script t.js melhorado
- Fingerprinting
- Eventos de interação
- Performance metrics
- Error tracking
- Session management
```

## 🔒 Segurança

### Anti-Bot
1. **User-Agent Check**: Lista negra de bots conhecidos
2. **Behavior Analysis**: Cliques muito rápidos, sem mouse movement
3. **Honeypot**: Campo invisível que só bots preenchem
4. **Rate Limiting**: Max 30 eventos/min por visitor
5. **IP Reputation**: Bloquear IPs conhecidos de bots

### Privacidade
1. **Anonimização**: Não salvar dados pessoais
2. **GDPR Compliance**: Respeitar Do Not Track
3. **Cookie-less**: Usar localStorage/sessionStorage
4. **Opt-out**: Opção de não ser rastreado

## 📊 Fluxo de Dados

```
Visitante → Script t.js → POST /track → Node.js Server
                                            ↓
                                    [Validação Anti-Bot]
                                            ↓
                                    Bot? → Rejeitar
                                     ↓
                                   Válido
                                     ↓
                              [Enriquecimento]
                              - Origem tráfego
                              - Geolocalização
                              - Device info
                                     ↓
                              [Salvar Supabase]
                              - analytics table
                              - customer_journey
                                     ↓
                              [Dashboard React]
                              - Visualizações
                              - Insights
```

## 🚀 Próximos Passos

1. **Aprovar este plano**
2. **Implementar Fase 1** (Anti-Bot)
3. **Testar com tráfego real**
4. **Implementar Fases 2-4**
5. **Deploy em produção**

## 📈 Métricas de Sucesso

- ✅ < 1% de eventos de bots salvos
- ✅ 100% de origem de tráfego identificada
- ✅ Jornada completa de 95% dos visitantes
- ✅ Dashboard carrega em < 2 segundos
- ✅ Zero dados pessoais coletados