# 🎬 Video Qualifier - Sistema de Qualificação de Vídeos

Sistema Python que qualifica vídeos de canais YouTube para identificar oportunidades de engagement usando análise semântica com Claude Sonnet 4.5.

## 🎯 Funcionalidade

O sistema:
1. Busca vídeos de canais específicos (via YouTube Data API v3)
2. Obtém transcrições completas (via API própria)
3. Analisa semanticamente com Claude Sonnet 4.5
4. Retorna apenas vídeos EXTREMAMENTE relevantes para o produto/serviço

**Caso de Uso:** Identificar vídeos onde comentar/promover um produto seria natural e esperado.

## 🏗️ Arquitetura

```
Scanner ID (Supabase)
    ↓
┌─── Buscar Dados Projeto ────┐
│   • Nome produto             │
│   • Descrição                │
│   • País                     │
└──────────┬──────────────────┘
           │
┌─── Buscar Canal + Vídeos ───┐
│   • Channel ID (YouTube)     │
│   • Lista vídeos excluídos   │
└──────────┬──────────────────┘
           │
┌─── YouTube API v3 ───────────┐
│   • Buscar vídeos do canal   │
│   • Filtros: data, excluded  │
│   • Detalhes: views, likes   │
└──────────┬──────────────────┘
           │
┌─── Transcrição API ──────────┐
│   • http://173.249.22.2:8081 │
│   • Batch parallel (5 concurrent) │
└──────────┬──────────────────┘
           │
┌─── Claude Sonnet 4.5 ────────┐
│   • Análise semântica        │
│   • Regras estritas          │
│   • Output: IDs ou "NOT"     │
└──────────┬──────────────────┘
           │
      Vídeos Qualificados
```

## 🚀 Quick Start

### Requisitos
- Python 3.12+
- Docker & Docker Compose
- Chaves API: YouTube, Claude, Supabase

### Instalação Local

```bash
# Clone/Navigate
cd "/Users/valdair/Documents/Projetos/Liftlio/Servidor/Monitormanto de canais"

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run
uvicorn main:app --reload --port 8000
```

### Docker

```bash
# Build
docker build -t video-qualifier .

# Run
docker-compose up -d

# Logs
docker-compose logs -f

# Health check
curl http://localhost:8000/health
```

## 📡 API Endpoints

### POST /qualify-videos

Qualifica vídeos de um canal para engagement.

**Request:**
```json
{
  "scanner_id": 123
}
```

**Response:**
```json
{
  "scanner_id": 123,
  "qualified_video_ids": ["abc123", "xyz789"],
  "qualified_video_ids_csv": "abc123,xyz789",
  "total_analyzed": 20,
  "execution_time_seconds": 45.3,
  "success": true
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "video-qualifier",
  "version": "1.0.0"
}
```

## 🔧 Configuração

### Variáveis de Ambiente (.env)

```env
# YouTube Data API v3
YOUTUBE_API_KEY=your_youtube_api_key_here

# Claude API (Anthropic)
CLAUDE_API_KEY=your_claude_api_key_here

# Supabase
SUPABASE_URL=https://suqjifkhmekcdflwowiw.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Transcrição API
TRANSCRIPT_API_URL=http://173.249.22.2:8081

# Server
PORT=8000
LOG_LEVEL=INFO
```

## 🧪 Testes

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test
pytest tests/test_qualifier.py -v
```

## 📊 Performance

- **Tempo médio:** ~45-60s para 10 vídeos (com transcrições)
- **YouTube Quota:** ~500 units por execução (10 vídeos)
- **Claude Tokens:** ~5000 input + 50 output tokens
- **Custo estimado:** ~$0.15 por execução

### Quota YouTube (2M units/dia)
- Capacidade: **~4000 execuções/dia** ou **40,000 vídeos/dia**
- Bem dentro do limite! 🚀

## 🚢 Deploy Produção

### Servidor: 173.249.22.2 (Contabo VPS)

```bash
# Deploy script
chmod +x deploy.sh
./deploy.sh

# Manual deploy
ssh root@173.249.22.2
cd /opt/containers/video-qualifier
docker-compose up -d
```

### Health Check Remoto

```bash
curl http://173.249.22.2:8000/health
```

### Teste Produção

```bash
curl -X POST http://173.249.22.2:8000/qualify-videos \
  -H "Content-Type: application/json" \
  -d '{"scanner_id": 123}'
```

## 🛠️ Troubleshooting

### API não responde
```bash
# Check logs
docker-compose logs -f video-qualifier

# Restart
docker-compose restart
```

### Erro de quota YouTube
```bash
# Check quota usage
# API Console: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas

# Esperar reset (meia-noite PST)
```

### Timeout transcrição
```bash
# Verificar API transcrição
curl http://173.249.22.2:8081/health

# Aumentar timeout em transcript_service.py (default 300s)
```

## 📚 Documentação Adicional

- **IMPLEMENTATION_PLAN.md** - Checklist completo de implementação
- **services/** - Documentação de cada serviço
- **tests/** - Exemplos de uso e testes

## 🎯 Vantagens vs Langflow

| Aspecto | Langflow | Video Qualifier |
|---------|----------|----------------|
| RAM | 2GB | 200MB (10x menor) |
| Performance | Baseline | 30% mais rápido |
| Manutenção | JSON 3419 linhas | Código Python testável |
| Debug | UI apenas | Logs estruturados |
| Versionamento | Diff inútil | Git tradicional |
| Testes | Impossível | Unitários + Integração |

## 📝 License

Liftlio - Internal Tool
© 2025 Liftlio

## 🤝 Support

Para issues ou dúvidas, contatar equipe Liftlio.
