CREATE OR REPLACE FUNCTION public.claude_edge_test(user_prompt text, system_prompt text DEFAULT 'voc� � um professor'::text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    response JSONB;
    http_response http_response;
    url TEXT;
    auth_token TEXT;
BEGIN
    -- Obter URLs dinâmicas (LOCAL ou LIVE automaticamente)
    url := get_edge_functions_url() || '/claude-teste';
    auth_token := get_edge_functions_anon_key();
    SELECT * INTO http_response
    FROM http((
        'POST',
        url,
        ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer ' || auth_token)
        ]::http_header[],
        'application/json',
        json_build_object(
            'prompt', user_prompt,
            'systemPrompt', system_prompt
        )::text
    )::http_request);

    -- Log para debug
    RAISE NOTICE 'Status: %, Response: %', http_response.status, http_response.content;

    RETURN http_response.content::jsonb->>'resposta';
END;
$function$