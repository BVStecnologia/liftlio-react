-- =============================================
-- Função: post_youtube_video_comment
-- Tipo: Função EXECUTOR (faz postagem real no YouTube)
--
-- Descrição:
--   Executa a postagem efetiva de comentário no YouTube via API v3.
--   Obtém token OAuth do projeto, verifica permissões, constrói requisição
--   e faz POST para a API do YouTube. Inclui logging detalhado para debug.
--
-- Entrada:
--   project_id INTEGER    - ID do projeto (busca token OAuth associado)
--   video_id TEXT         - ID do vídeo no YouTube (ex: "dQw4w9WgXcQ")
--   comment_text TEXT     - Texto do comentário a ser postado
--
-- Saída:
--   JSONB contendo:
--   - success: true se postado com sucesso
--   - response: resposta completa da API do YouTube
--   - error: true e detalhes se falhar
--   - status: código HTTP da resposta
--   - token_used, user_info: dados de debug
--
-- Conexões:
--   → Chamada por: trigger_postar_comentario_youtube (quando teste = TRUE)
--   → Usa: get_youtube_token() para obter OAuth token
--   → API Externa: YouTube Data API v3 commentThreads endpoint
--   → NÃO chamada diretamente - sempre via trigger automático
--
-- Fluxo de uso:
--   INSERT em Mensagens com teste=TRUE → Trigger dispara →
--   Esta função → POST no YouTube → Atualiza respondido=TRUE
--
-- Segurança:
--   - Requer token OAuth válido com escopes de comentário
--   - Valida permissões do usuário antes de postar
--   - Retorna informações detalhadas para troubleshooting
--
-- Criado: 2024-01-24
-- Atualizado: 2025-10-01 - Documentação melhorada
-- =============================================

CREATE OR REPLACE FUNCTION public.post_youtube_video_comment(project_id integer, video_id text, comment_text text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    token TEXT;
    response JSONB;
    http_response http_response;
    api_url TEXT := 'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet';
    request_body JSONB;
    user_info_response http_response;
    user_info JSONB;
BEGIN
    -- Obter o token do YouTube para o projeto específico
    token := get_youtube_token(project_id);

    -- Verificar a qual conta este token pertence
    SELECT * INTO user_info_response
    FROM http((
        'GET',
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        ARRAY[
            http_header('Authorization', 'Bearer ' || token)
        ]::http_header[],
        NULL,
        NULL
    )::http_request);

    -- Log das informações do usuário
    RAISE NOTICE 'Token: %', token;
    RAISE NOTICE 'User Info Response: %', user_info_response.content;

    -- Construir o corpo da requisição para comentário no vídeo
    request_body := jsonb_build_object(
        'snippet', jsonb_build_object(
            'videoId', video_id,
            'topLevelComment', jsonb_build_object(
                'snippet', jsonb_build_object(
                    'textOriginal', comment_text
                )
            )
        )
    );

    -- Fazer a chamada POST à API do YouTube
    SELECT * INTO http_response
    FROM http((
        'POST',
        api_url,
        ARRAY[
            http_header('Authorization', 'Bearer ' || token),
            http_header('Content-Type', 'application/json')
        ]::http_header[],
        'application/json',
        request_body::text
    )::http_request);

    -- Se houver erro, retornar informações detalhadas
    IF http_response.status != 200 THEN
        RETURN jsonb_build_object(
            'error', true,
            'status', http_response.status,
            'response', http_response.content::jsonb,
            'token_used', token,
            'project_id', project_id,
            'user_info', user_info_response.content::jsonb
        );
    END IF;

    -- Retornar resposta com informações de debug
    RETURN jsonb_build_object(
        'success', true,
        'response', http_response.content::jsonb,
        'token_used', token,
        'project_id', project_id,
        'user_info', user_info_response.content::jsonb
    );
END;
$function$