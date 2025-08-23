# 🎥 YouTube Search Engine v4 - Liftlio

Sistema inteligente de busca semântica de vídeos no YouTube com análise profunda de comentários e transcrições por IA.

## ✨ Características Principais v4

- **🧠 Análise Semântica**: Usa descrição completa do projeto para contexto
- **🤖 IA Dupla**: Claude gera queries E seleciona os melhores vídeos
- **💬 Análise de Comentários**: IA analisa comentários para validar relevância
- **📝 Transcrições**: Busca e analisa transcrições quando disponíveis
- **🎯 Alta Precisão**: Seleção baseada em intenção de compra real
- **✅ Filtros Adaptativos**: Ajusta automaticamente para garantir resultados
- **🔄 Fallback Inteligente**: Queries simples quando semânticas falham
- **📊 Arquitetura Modular**: Componentes independentes para fácil manutenção
- **🚀 Performance**: Resposta em ~7-12 segundos com análise completa
- **🔌 API REST**: Compatível com Edge Functions do Supabase

## 📋 Filtros Adaptativos v4

| Filtro | Valor | Descrição |
|--------|-------|-----------|
| **Inscritos** | ≥ 1000 | Canal estabelecido |
| **Comentários** | ≥ 20 | Engajamento mínimo |
| **Duração** | > 60s | Sem shorts |
| **Data** | < 90 dias | Conteúdo recente |
| **IDs Excluídos** | ✓ | Nunca repete vídeos |
| **Quantidade** | ≤ 3 | Máximo por busca |
| **Análise IA** | ✓ | Claude seleciona os melhores |

## 🏗️ Arquitetura v4

```
youtube_search_engine.py (v4)
├── Config                    # Configurações centralizadas
├── ProjectDataFetcher        # Busca dados COMPLETOS com descrição
├── SemanticQueryGenerator    # Gera queries semânticas com contexto
├── YouTubeSearcher           # Interface com YouTube API v3
├── VideoDetailsFetcher       # Busca detalhes, comentários e transcrições
├── VideoFilter               # Filtros adaptativos de qualidade
├── AIVideoSelector           # Claude analisa e seleciona os melhores
├── YouTubeSearchEngineV4     # Orquestrador principal
└── FastAPI Server            # API REST
```

## 🚀 Instalação

### Pré-requisitos
- Python 3.9+
- Docker (opcional)
- APIs Keys necessárias

### 1. Clone e Configure

```bash
# Navegue para o diretório
cd /Users/valdair/Documents/Projetos/Liftlio/Servidor/youtube-search-engine

# Crie ambiente virtual
python3 -m venv venv
source venv/bin/activate

# Instale dependências
pip install -r requirements.txt

# Configure credenciais
cp .env.example .env
nano .env  # Adicione suas keys
```

### 2. Configuração do .env

```env
# YouTube Data API
YOUTUBE_API_KEY=your_youtube_api_key

# Claude API (Anthropic)
CLAUDE_API_KEY=your_claude_api_key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key
```

## 🧪 Testes

### Teste Rápido
```bash
# Ativar ambiente
source venv/bin/activate

# Testar scanner específico
python test_scanner_469.py
```

### Teste Completo
```bash
python test_complete_v3.py
```

### Servidor Local
```bash
# Iniciar servidor
python youtube_search_engine_v3.py

# API disponível em: http://localhost:8000
# Documentação: http://localhost:8000/docs
```

## 📡 API Endpoints

### POST /search
Busca vídeos para um scanner

**Request:**
```json
{
  "scannerId": "469"
}
```

**Response:**
```json
{
  "text": "videoId1,videoId2,videoId3",
  "success": true,
  "details": {
    "scanner_id": 469,
    "palavra_chave": "Combatente Shamo",
    "total_found": 25,
    "relevant_found": 3,
    "video_ids": "videoId1,videoId2,videoId3",
    "strategy_used": "claude_specific",
    "success": true
  }
}
```

### GET /health
Health check do serviço

## 🐳 Docker

### Build e Run
```bash
# Build
docker-compose build

# Run
docker-compose up -d

# Logs
docker-compose logs -f

# Stop
docker-compose down
```

## 🚀 Deploy em Produção

### 1. Preparar Arquivos
```bash
# Verificar configurações
cat .env  # Confirmar credenciais de produção
```

### 2. Copiar para Servidor
```bash
# Criar arquivo tar
tar -czf youtube-search-engine-v3.tar.gz \
  youtube_search_engine_v3.py \
  requirements.txt \
  Dockerfile \
  docker-compose.yml \
  .env.example

# Copiar para servidor
scp youtube-search-engine-v3.tar.gz root@173.249.22.2:/opt/
```

### 3. No Servidor
```bash
ssh root@173.249.22.2
cd /opt
tar -xzf youtube-search-engine-v3.tar.gz
mv youtube-search-engine-v3 youtube-search-engine

# Configurar .env com credenciais de produção
cp .env.example .env
nano .env

# Build e run
docker-compose up -d --build

# Verificar
docker-compose logs -f
```

### 4. Atualizar Supabase

Modificar a Edge Function ou SQL Function para chamar nosso serviço:

```sql
-- Exemplo de função SQL
CREATE OR REPLACE FUNCTION update_video_id_cache(scanner_id bigint)
RETURNS text AS $$
DECLARE
    response http_response;
    video_ids text;
BEGIN
    -- Chamar nosso serviço
    SELECT * INTO response
    FROM http((
        'POST',
        'http://173.249.22.2:8000/search',
        ARRAY[http_header('Content-Type', 'application/json')]::http_header[],
        'application/json',
        jsonb_build_object('scannerId', scanner_id::text)::text
    )::http_request);
    
    -- Processar resposta
    IF response.status = 200 THEN
        video_ids := (response.content::json)->>'text';
        
        IF video_ids IS NOT NULL AND video_ids != '' THEN
            UPDATE public."Scanner de videos do youtube"
            SET "ID cache videos" = video_ids,
                rodada = NULL
            WHERE id = scanner_id;
            
            RETURN 'OK: ' || video_ids;
        END IF;
    END IF;
    
    RETURN 'Erro';
END;
$$ LANGUAGE plpgsql;
```

## 📊 Sistema de Pontuação

### Pontos Positivos
- **Palavra completa no título**: +25 pontos
- **Termo específico no título**: +18 pontos
- **Termo na descrição**: +5-10 pontos
- **Vídeo recente** (< 7 dias): +5 pontos
- **Alto engajamento** (> 3%): +3 pontos
- **Muitos comentários** (> 100): +3 pontos

### Penalidades
- **Conteúdo genérico**: -2 a -3 pontos
- **Sem palavra-chave**: -10 pontos
- **Conteúdo não relacionado**: -15 pontos

## 🔄 Estratégias de Busca

1. **Claude Specific**: IA gera 5 queries inteligentes
2. **Fallback**: Queries básicas se Claude falhar
3. **Generic**: Busca ampla se poucos resultados

## 📈 Métricas de Sucesso

- ✅ **Taxa de Aprovação**: ~12% (3 de 25 vídeos)
- ✅ **Score Médio**: 15-20 pontos
- ✅ **Relevância**: 100% específicos ao produto
- ✅ **Tempo Resposta**: < 10 segundos
- ✅ **Zero Duplicatas**: IDs excluídos funcionando

## 🆚 Comparação com Langflow

| Aspecto | Langflow | Nossa Solução v3 |
|---------|----------|------------------|
| Vídeos encontrados | 0 para nichos | 3 relevantes |
| Filtros de qualidade | Nenhum | 6 obrigatórios |
| Inteligência | Queries fixas | Claude AI adaptativa |
| Relevância | Genéricos | Específicos ao produto |
| Arquitetura | Monolítica | Modular (9 partes) |

## 🐛 Troubleshooting

### "CLAUDE_API_KEY not configured"
- Adicione a chave no `.env`
- Obtenha em: https://console.anthropic.com/

### Poucos resultados
- Sistema tem fallback automático
- Verifique se palavra-chave não está muito específica

### Erro de conexão Supabase
- Verifique SUPABASE_URL e SUPABASE_KEY
- Confirme que o projeto está ativo

## 📝 Logs

```bash
# Ver logs locais
python youtube_search_engine_v3.py 2>&1 | tee app.log

# Ver logs Docker
docker-compose logs -f

# Logs com filtro
docker-compose logs -f | grep "Score\|Selecionados"
```

## 🔗 Recursos

- [YouTube Data API](https://developers.google.com/youtube/v3)
- [Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Supabase Docs](https://supabase.com/docs)

## 📄 Licença

Propriedade da Liftlio. Todos os direitos reservados.

---

**Versão**: 3.0
**Última Atualização**: 23/08/2025
**Status**: ✅ Produção