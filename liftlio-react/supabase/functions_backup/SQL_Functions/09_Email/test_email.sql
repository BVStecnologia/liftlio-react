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
                '<h1>Teste Simples</h1><p>Este � um teste b�sico.</p>',
                'Este � um teste b�sico.',
                NULL, NULL, NULL, NULL, 'simple'
            );

        WHEN 2 THEN
            -- Email com vari�veis
            RETURN send_email(
                'teste@example.com',
                'Teste 2 - Com Vari�veis',
                '<h1>Ol� {{userName}}</h1><p>Voc� tem {{count}} novas mensagens.</p>',
                NULL,
                NULL,
                '{"userName": "Jo�o", "count": 5}'::jsonb,
                NULL, NULL, 'simple'
            );

        WHEN 3 THEN
            -- Email com modifica��es HTML
            RETURN send_email(
                'teste@example.com',
                'Teste 3 - Modifica��es HTML',
                '<div class="box"><h1>T�tulo Original</h1><p class="content">Conte�do original</p></div>',
                NULL,
                NULL,
                NULL,
                '[
                    {"type": "replace", "selector": "h1", "content": "T�tulo Modificado"},
                    {"type": "addStyle", "selector": ".box", "value": "border: 2px solid blue; padding: 20px;"}
                ]'::jsonb,
                NULL,
                'medium'
            );

        ELSE
            RETURN jsonb_build_object('error', 'N�mero de teste inv�lido (use 1-3)');
    END CASE;
END;
$function$