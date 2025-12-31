// =============================================
// Edge Function: analyze-url
// Versão: 39
// Descrição: Analisa URLs de websites e gera simulações de marketing com Claude AI
// Atualizado: 2025-12-31 - Salvando simulações completas na tabela url_analyzer_rate_limit
//
// MUDANÇAS v39:
// - Nova função recordRequestWithSimulation() que salva dados da simulação
// - Novos campos: simulation_video, simulation_comment, simulation_response
// - Novos campos: simulation_language, product_info
// - Removido salvamento na tabela agent_conversations
// =============================================

// BACKUP LOCAL - Para versão completa, ver deploy no Supabase
// Consultar: mcp__supabase__get_edge_function({ function_slug: 'analyze-url' })
//
// Principais funções:
// - scrapeWithJina(): Scraping de websites com fallback www/non-www
// - checkRateLimit(): Verifica rate limit (3 req/24h)
// - recordRequestWithSimulation(): NOVA - Salva simulação completa
// - generateDynamicNumbers(): Gera números realistas para simulação
// - detectLanguage(): Detecta idioma do conteúdo
// - extractSiteInfo(): Extrai informações do site (produto, tópico, benefícios)
//
// Endpoints:
// - POST /analyze-url { url, language, additionalContent, ip }
// - Retorna: { success, simulation, productInfo, ... }
//
// Rate Limiting:
// - 3 requisições por IP a cada 24 horas
// - IPs localhost são isentos
//
// Campos salvos em url_analyzer_rate_limit:
// - ip_address, url_analyzed, request_timestamp
// - simulation_video (JSONB): { title, channel, views, comments, ... }
// - simulation_comment (JSONB): { author, text, lead_score, ... }
// - simulation_response (JSONB): { message, sentiment_score, ... }
// - simulation_language (TEXT): 'pt' ou 'en'
// - product_info (JSONB): { name, topic, category, benefits }
