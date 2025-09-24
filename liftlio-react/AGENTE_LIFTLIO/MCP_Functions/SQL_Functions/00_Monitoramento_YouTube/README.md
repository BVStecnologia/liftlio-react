# Funções SQL de Monitoramento de Canais

Esta pasta contém todas as funções SQL relacionadas ao sistema de monitoramento de canais do YouTube no Liftlio.

## 📁 Estrutura de Arquivos

### 📂 Subpastas Organizadas
- **`Edge_Functions/`** - Funções que chamam Edge Functions do Supabase (3 funções)
- **`Triggers/`** - Funções trigger para automação (2 triggers)
- **`Crons/`** - Documentação de Edge Functions agendadas

### 📄 Funções Principais (23 funções totais)

#### Obtenção de Dados
- **obter_comentarios_postados_por_projeto.sql** - Retorna mensagens de monitoramento direto
- **obter_canais_nao_registrados.sql** - Lista canais descobertos não registrados
- **obter_canal_e_videos.sql** - Obtém canal e seus vídeos
- **obter_dados_projeto_por_canal.sql** - Obtém dados do projeto através do canal

#### Gerenciamento de Canais
- **adicionar_canais_automaticamente.sql** - Adiciona canais descobertos ao sistema
- **processar_novos_canais_youtube.sql** - Processa e rankeia canais
- **atualizar_canais_ativos.sql** - Atualiza canais ativos por qtd de vídeos
- **fix_project_77_ranking.sql** - Corrige sistema de ranking

#### Métricas e Análise
- **get_project_metrics.sql** - Métricas detalhadas de projeto
- **get_channel_details.sql** - Detalhes de canais para análise
- **get_videos_by_channel_id.sql** - Vídeos de um canal específico
- **get_videos_by_project_id.sql** - Vídeos de um projeto com paginação
- **get_comments_and_messages_by_video_id.sql** - Comentários e mensagens por vídeo
- **get_top_content_categories.sql** - Top categorias de conteúdo
- **get_weekly_project_performance.sql** - Performance semanal

#### Processamento de Vídeos
- **verificar_novos_videos_youtube.sql** - Verifica novos vídeos para monitoramento
- **process_channel_videos.sql** - Processa vídeos de um canal
- **process_monitored_videos.sql** - Processa vídeos monitorados
- **monitor_top_channels_for_project.sql** - Monitora top canais

#### Criação de Mensagens
- **create_monitoring_message.sql** - Cria mensagem de monitoramento
- **create_initial_video_comment_with_claude.sql** - Gera comentário com Claude AI
- **create_and_save_initial_comment.sql** - Cria e salva comentário inicial

#### Edge Functions (movidas para Edge_Functions/)
- **call_youtube_channel_details.sql** - Obtém detalhes do canal via Edge Function
- **call_youtube_channel_monitor.sql** - Monitora canal via Edge Function
- **call_api_edge_function.sql** - Chama Edge Function de análise

#### Auxiliares
- **regenerate_single_comment_response.sql** - Regenera resposta com tipo específico
- **claude_complete.sql** - Helper para chamar Claude API

## 🔍 Sistema de Monitoramento

### Conceitos Chave

#### Tipos de Mensagem (tipo_msg)
- **tipo_msg = 1**: Mensagens de MONITORAMENTO (comentários diretos em vídeos)
- **tipo_msg = 2**: RESPOSTAS a comentários de usuários

#### Campo Comentario_Principais
- **NULL**: Mensagens de monitoramento direto
- **Preenchido**: Respostas a comentários

#### Sistema de Ranking
1. **ranking_score**: Pontuação de relevância (0-100)
2. **rank_position**: Posição no ranking
3. **qtdmonitoramento**: Quantidade de canais a monitorar (geralmente 30)

### Fluxo de Monitoramento

1. **Descoberta de Canais**
   - Canais são descobertos através de comentários
   - Armazenados em "Canais descobertos"

2. **Registro de Canais**
   - `adicionar_canais_automaticamente()` registra canais oficialmente
   - Vincula canais ao projeto

3. **Ranking de Canais**
   - `processar_novos_canais_youtube()` calcula relevância
   - Atribui ranking_score e rank_position

4. **Monitoramento de Vídeos**
   - `verificar_novos_videos_youtube()` busca novos vídeos
   - Top 30 canais (baseado em rank_position)

5. **Criação de Mensagens**
   - `create_initial_video_comment_with_claude()` gera comentários
   - Mensagens criadas com tipo_msg = 1

## ⚠️ Problemas Identificados

### Projeto 77
- Todos os 145 canais com ranking_score = NULL
- Nenhuma mensagem de monitoramento (tipo_msg = 1)
- Sistema travado por falta de ranking

### Solução
Execute `fix_project_77_ranking()` para:
1. Calcular ranking_score para todos os canais
2. Atribuir rank_position
3. Permitir monitoramento dos top 30

## 📝 Notas Importantes

- Sempre use `DROP FUNCTION IF EXISTS` antes de `CREATE OR REPLACE`
- Mantenha sincronização entre Supabase e arquivos locais
- Teste funções em ambiente de desenvolvimento primeiro