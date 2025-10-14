CREATE OR REPLACE FUNCTION public.test_email(test_number integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
BEGIN
    CASE test_number
        WHEN 1 THEN
            -- Email simples
            RETURN send_email(
                'teste@example.com',
                'Teste 1 - Email Simples',
                '<h1>Teste Simples</h1><p>Este é um teste básico.</p>',
                'Este é um teste básico.',
                NULL, NULL, NULL, NULL, 'simple'
            );

        WHEN 2 THEN
            -- Email com variáveis
            RETURN send_email(
                'teste@example.com',
                'Teste 2 - Com Variáveis',
                '<h1>Olá {{userName}}</h1><p>Você tem {{count}} novas mensagens.</p>',
                NULL,
                NULL,
                '{"userName": "João", "count": 5}'::jsonb,
                NULL, NULL, 'simple'
            );

        WHEN 3 THEN
            -- Email com modificações HTML
            RETURN send_email(
                'teste@example.com',
                'Teste 3 - Modificações HTML',
                '<div class="box"><h1>Título Original</h1><p class="content">Conteúdo original</p></div>',
                NULL,
                NULL,
                NULL,
                '[
                    {"type": "replace", "selector": "h1", "content": "Título Modificado"},
                    {"type": "addStyle", "selector": ".box", "value": "border: 2px solid blue; padding: 20px;"}
                ]'::jsonb,
                NULL,
                'medium'
            );

        ELSE
            RETURN jsonb_build_object('error', 'Número de teste inválido (use 1-3)');
    END CASE;
END;
$function$