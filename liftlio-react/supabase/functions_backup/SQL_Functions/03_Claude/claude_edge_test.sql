CREATE OR REPLACE FUNCTION public.claude_edge_test(user_prompt text, system_prompt text DEFAULT 'você é um professor'::text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    response JSONB;
    http_response http_response;
    url TEXT := 'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/claude-teste';
    auth_token TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';
BEGIN
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