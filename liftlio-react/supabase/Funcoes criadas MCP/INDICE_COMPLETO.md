# 📚 Índice Completo - Funções MCP Liftlio

**Última atualização**: 13/01/2025

## 🚀 Edge Functions

### Sistema de Agente AI

1. **agente-liftlio_v12_cors_corrigido.ts.bak** (13/01/2025)
   - Versão mais recente do agente AI com Claude
   - Correção de CORS no tratamento de erros
   - Integração RAG melhorada com categorização de perguntas
   - Busca estatísticas reais do projeto
   - Suporta PT/EN automaticamente

2. **agente-liftlio_v11_rag_melhorado.ts** (12/01/2025)
   - Melhorias significativas na integração RAG
   - Categorização de perguntas para busca otimizada
   - Formatação melhorada do contexto RAG
   - Deduplicação e ranking de resultados

3. **agente-liftlio_v10_correcao_campo_video.ts** (11/01/2025)
   - Correção do campo 'video' na busca de vídeos únicos
   - Ajuste nos joins com tabela Videos

4. **agente-liftlio_v9_dados_reais_apenas.ts** (11/01/2025)
   - Sistema robusto para nunca inventar dados
   - Usa apenas dados reais do projectStats e ragContext

5. **agente-liftlio_v8_rag_idioma.ts** (10/01/2025)
   - Detecção automática de idioma
   - Integração inicial com sistema RAG

6. **agente-liftlio_v7_corrigido.ts** (10/01/2025)
   - Correções de sintaxe e melhorias gerais

7. **agente-liftlio_assistente_ai_claude_v6.ts.bak** (09/01/2025)
   - Versão anterior com funcionalidades básicas

### Sistema de Embeddings

1. **generate-embedding_openai.ts.bak** (10/01/2025)
   - Gera embeddings usando OpenAI
   - Suporta textos em múltiplos idiomas
   - Usado pelo sistema RAG

2. **process-rag-batch_processamento_em_lote.ts.bak** (10/01/2025)
   - Processa embeddings em lote
   - Otimizado para performance
   - Suporta múltiplas tabelas

## 📊 SQL Functions

### Sistema RAG - Busca e Embeddings

1. **search_project_rag_com_isolamento.sql** (10/01/2025)
   - Busca semântica com isolamento por projeto
   - Usa índice HNSW para performance
   - Threshold de similaridade configurável

2. **process_rag_embeddings_universal.sql** (10/01/2025)
   - Processa embeddings para qualquer tabela
   - Sistema genérico e flexível
   - Suporta campos dinâmicos

3. **prepare_rag_content_all_tables.sql** (11/01/2025)
   - Prepara conteúdo de todas as tabelas para RAG
   - Formatação consistente
   - Suporta 14 tabelas do sistema

4. **prepare_rag_content_settings_messages.sql** (11/01/2025)
   - Versão específica para Settings messages posts
   - Otimizada para mensagens postadas

5. **process_rag_batch_sql_v3_todas_tabelas.sql** (11/01/2025)
   - Processamento em lote v3
   - Suporta todas as tabelas

6. **process_rag_batch_sql_v4_settings_messages.sql** (11/01/2025)
   - Processamento em lote v4
   - Específico para Settings messages posts

### Monitoramento RAG

1. **rag_monitoring_functions.sql** (11/01/2025)
   - Funções para monitorar status do RAG
   - Estatísticas por tabela
   - Útil para debug

2. **setup_cron_rag_processing.sql** (11/01/2025)
   - Configuração de processamento automático
   - Agenda tarefas cron

3. **cron_rag_processing_ATIVO.sql** (11/01/2025)
   - Job cron ativo para processar RAG
   - Roda automaticamente

### Estatísticas e Dashboard

1. **get_project_dashboard_stats.sql** (Data não especificada)
   - Retorna estatísticas do dashboard
   - Conta mensagens postadas (Settings messages posts)
   - Usado pelo agente AI

## 📝 Documentação

### Melhores Práticas

1. **MELHORES_PRATICAS_MCP.md**
   - Guia completo de boas práticas
   - Padrões de nomenclatura
   - Fluxo de trabalho

### Análises e Roadmaps

1. **ANALISE_RAG_PROCESSAMENTO.md** (11/01/2025)
   - Análise detalhada do sistema RAG
   - Problemas identificados e soluções

2. **ARQUITETURA_SISTEMA_RAG.md** (10/01/2025)
   - Arquitetura completa do sistema RAG
   - Diagramas e fluxos

3. **IMPLEMENTACAO_RAG_COMPLETA.md** (10/01/2025)
   - Guia de implementação passo a passo
   - Código completo e exemplos

4. **MELHORIAS_RAG_V11.md** (12/01/2025)
   - Melhorias implementadas na v11
   - Categorização e ranking

5. **OTIMIZACAO_SISTEMA_RAG_12_01_2025.md** (12/01/2025)
   - Otimizações de performance
   - Melhorias na busca

### Status e Monitoramento

1. **EDGE_FUNCTIONS_ATIVAS.md**
   - Lista de Edge Functions em produção
   - Status e versões

2. **TABELAS_RAG_PROJECT_ID.md** (11/01/2025)
   - Lista de tabelas com suporte RAG
   - Campos e estrutura

3. **LIMPEZA_EDGE_FUNCTIONS.md**
   - Processo de limpeza e organização
   - Funções removidas

## 🔧 Scripts Auxiliares

1. **00_script_completo_sistema_rag.sql**
   - Script completo para setup do sistema RAG
   - Inclui todas as funções necessárias
   - Criar índices e configurações

## 📌 Notas Importantes

- **Sempre** salvar cópia das funções após criar/modificar via MCP
- **Usar** nomenclatura padrão: `nome_funcao_descricao.extensao`
- **Atualizar** este índice após mudanças
- **SDK Supabase** é obrigatório - nunca usar HTTP direto
- **Edge Functions** devem incluir CORS headers em todos os responses