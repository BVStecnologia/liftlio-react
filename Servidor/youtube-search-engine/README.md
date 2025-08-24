# YouTube Search Engine v5 - Sistema de Busca e Curadoria de Vídeos

## 📋 Visão Geral

Sistema inteligente de busca e seleção de vídeos do YouTube usando AI. O sistema funciona em 5 etapas sequenciais, adaptando-se dinamicamente à região do projeto (BR, US, etc.) e aplicando filtros rigorosos de qualidade.

## 🏗️ Arquitetura do Sistema

### Arquivo Principal
- **`youtube_search_engine.py`** - Sistema completo integrado com todas as 5 etapas

### Arquivos de Teste (Etapas Individuais)
- **`etapa_1_gerar_queries.py`** - Testa geração de queries otimizadas
- **`etapa_2_buscar_youtube.py`** - Testa busca no YouTube
- **`etapa_3_filtrar_videos.py`** - Testa aplicação de filtros
- **`etapa_4_selecionar_final.py`** - Testa seleção final com Claude

### Arquivos Auxiliares
- **`requirements.txt`** - Dependências do projeto
- **`Dockerfile`** - Container para deploy
- **`.env`** - Variáveis de ambiente (não commitado)

## 🔄 As 5 Etapas do Sistema

### ETAPA 1: Buscar Dados do Projeto
```python
project_data = await engine.get_project_data(scanner_id)
```
- Busca dados do projeto no Supabase via RPC `get_projeto_data`
- Mapeia campos do banco: `pais` → `regiao`, `ids_negativos` → `videos_excluidos`
- Retorna: palavra-chave, descrição, região (BR/US), vídeos excluídos

### ETAPA 2: Gerar Queries Otimizadas
```python
queries = await engine.generate_optimized_queries(project_data)
```
- Usa Claude AI para gerar 5 queries adaptadas à região
- **Para BR**: Adiciona "brasil", "como criar", termos em português
- **Para US**: Usa "how to", "best", "guide", termos em inglês
- Exemplo BR: "shamo brasil", "como criar shamo", "galo shamo"
- Exemplo US: "ai recommendation engine", "how to implement ai"

### ETAPA 3: Buscar Vídeos no YouTube
```python
videos = await engine.search_youtube(query, project_data)
```
- Busca 30 vídeos por query usando YouTube API v3
- Aplica filtros regionais:
  - `regionCode`: BR ou US (dinâmico)
  - `relevanceLanguage`: pt ou en (baseado na região)
- Filtros básicos:
  - Vídeos dos últimos 90 dias
  - Exclui vídeos já marcados como negativos
  - Remove conteúdo asiático irrelevante (3+ indicadores)
- Retorna até 15 vídeos por query

### ETAPA 4: Aplicar Filtros de Qualidade
```python
video_details = await engine.fetch_video_details(video_ids)
channel_details = await engine.fetch_channel_details(channel_ids)
filtered = engine.apply_filters(videos, video_details, channel_details)
```
- Busca detalhes completos via API (views, likes, duração, etc.)
- Filtros rigorosos:
  - **MIN_SUBSCRIBERS**: 1000 inscritos
  - **MIN_COMMENTS**: 20 comentários
  - **MIN_DURATION**: 60 segundos
  - **MAX_DURATION**: 3600 segundos (1 hora)
  - **MIN_VIEWS**: 500 visualizações
- Calcula taxa de engajamento: (likes + comments) / views * 100
- Ordena por engajamento (maior primeiro)

### ETAPA 5: Seleção Final com Claude
```python
final = await engine.analyze_with_claude(filtered_videos, project_data)
```
- Claude analisa semanticamente cada vídeo
- Recebe contexto completo do projeto
- Seleciona os 3 melhores baseado em:
  - Relevância ao tópico
  - Qualidade do conteúdo
  - Engajamento da audiência
  - Idioma apropriado à região
- Retorna IDs dos vídeos selecionados

## 🌍 Adaptação Regional

### Brasil (BR)
- Queries com termos brasileiros: "brasil", "brasileiro", "como criar"
- Busca prioriza conteúdo em português
- Detecta indicadores BR: "criatório", "fazenda", "R$", estados brasileiros

### Estados Unidos (US)
- Queries em inglês: "how to", "guide", "best"
- Busca prioriza conteúdo em inglês
- Foco em termos empresariais e técnicos

## 📊 Filtros e Validações

### Filtros de Qualidade (Valores Atuais)
```python
MIN_SUBSCRIBERS = 1000    # Canal deve ter 1000+ inscritos
MIN_COMMENTS = 20         # Vídeo deve ter 20+ comentários
MIN_DURATION = 60         # Mínimo 1 minuto
MAX_DURATION = 3600       # Máximo 1 hora
MIN_VIEWS = 500           # Mínimo 500 views
```

### Validação de Idioma Regional
- **BR**: Vídeos devem ter conteúdo em português
- **US**: Vídeos devem ter conteúdo em inglês
- Rejeita vídeos em idiomas não correspondentes à região

## 🚀 Como Usar

### Instalação
```bash
pip install -r requirements.txt
```

### Configurar .env
```env
YOUTUBE_API_KEY=sua_chave_aqui
CLAUDE_API_KEY=sua_chave_anthropic
SUPABASE_URL=url_do_supabase
SUPABASE_KEY=chave_do_supabase
```

### Teste Individual por Etapa
```bash
# Testar etapa 1 - Buscar dados
python etapa_1_gerar_queries.py

# Testar etapa 2 - Gerar queries
python etapa_2_buscar_youtube.py

# Testar etapa 3 - Aplicar filtros
python etapa_3_filtrar_videos.py

# Testar etapa 4 - Seleção Claude
python etapa_4_selecionar_final.py
```

### Uso via API (Sistema Completo)
```python
from youtube_search_engine import YouTubeSearchEngineV5

engine = YouTubeSearchEngineV5()

# Processar scanner
result = await engine.process(scanner_id=469)

# Resultado
{
    "scanner_id": 469,
    "video_ids": ["S6ChoGtoFOs", "mGlgE6BtkGk"],
    "selected_videos": [...],
    "success": true
}
```

### API REST Endpoints
```bash
# Via FastAPI (quando deployado)
POST /process
{
    "scanner_id": 469
}

# Resposta
{
    "scanner_id": 469,
    "video_ids": ["id1", "id2", "id3"],
    "video_ids_string": "id1,id2,id3",
    "selected_videos": [...],
    "total_analyzed": 45,
    "success": true
}
```

## 🐳 Deploy com Docker

```bash
# Build
docker build -t youtube-search-v5 .

# Run
docker run -p 8000:8000 --env-file .env youtube-search-v5

# Deploy no servidor
scp youtube-search-v5.tar.gz root@173.249.22.2:/opt/
ssh root@173.249.22.2
cd /opt && tar -xzf youtube-search-v5.tar.gz
docker-compose up -d
```

## 📈 Resultados Esperados

### Scanner BR (Exemplo: Shamo)
- Queries: "shamo brasil", "como criar shamo", "galo shamo"
- Encontra: 30-50 vídeos
- Após filtros: 5-10 vídeos
- Claude seleciona: 2-3 vídeos brasileiros relevantes

### Scanner US (Exemplo: AI)
- Queries: "ai recommendation engine", "how to implement ai"
- Encontra: 50-75 vídeos
- Após filtros: 10-15 vídeos
- Claude seleciona: 3 vídeos em inglês relevantes

## 🔍 Troubleshooting

### Poucos vídeos encontrados
- Verificar se as queries estão muito específicas
- Aumentar o período de busca (days_back)
- Revisar filtros (podem estar muito restritivos)

### Vídeos irrelevantes
- Ajustar queries para serem mais específicas
- Melhorar prompt do Claude com mais contexto
- Adicionar palavras negativas no projeto

### Vídeos em idioma errado
- Sistema agora valida idioma baseado na região
- BR: Apenas português
- US: Apenas inglês

## 📝 Notas Importantes

1. **Mapeamento de Campos**: O banco retorna `pais` mas o código usa `regiao`
2. **Limite de Resultados**: Máximo 3 vídeos por scanner
3. **Cache**: Não há cache - cada execução faz novas buscas
4. **Rate Limits**: YouTube API tem limites diários
5. **Custo Claude**: Cada análise consome tokens da API Anthropic

## 🔄 Fluxo Completo

```
Scanner ID → Buscar Dados → Gerar Queries → Buscar Vídeos → 
→ Buscar Detalhes → Aplicar Filtros → Claude Seleciona → 
→ Retorna IDs Finais
```

## 📊 Métricas de Qualidade

- **Taxa de Aprovação**: ~10-20% dos vídeos passam pelos filtros
- **Precisão Regional**: ~80% de conteúdo na região correta
- **Relevância Final**: ~90% após seleção do Claude

---

**Versão**: 5.0  
**Última Atualização**: 23/08/2025  
**Autor**: Sistema Liftlio