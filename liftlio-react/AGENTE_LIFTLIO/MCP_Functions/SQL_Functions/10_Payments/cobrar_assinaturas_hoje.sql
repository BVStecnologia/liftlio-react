-- =============================================
-- Função: cobrar_assinaturas_hoje
-- Descrição: Processa cobrança das assinaturas que vencem hoje via Square API
-- Criado: 2025-01-23
-- Atualizado: Sistema completo de cobrança com retry e tratamento de erros
-- =============================================

DROP FUNCTION IF EXISTS cobrar_assinaturas_hoje(boolean, integer);

CREATE OR REPLACE FUNCTION public.cobrar_assinaturas_hoje(p_is_production boolean DEFAULT false, p_limit integer DEFAULT 50)
 RETURNS TABLE(subscription_id bigint, plan_name text, amount integer, payment_status text, payment_id text, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_sub RECORD;
    http_response http_response;
    response_json JSONB;
    v_items JSONB;
    v_total_amount INTEGER;
    request_body TEXT;
    timeout_ms INTEGER := 30000; -- 30 segundos
    v_next_billing_date DATE;
BEGIN
    -- Buscar assinaturas para cobrar hoje
    FOR v_sub IN
        SELECT
            s.id,
            s.plan_name,
            s.base_amount,
            s.extra_items,
            s.card_id,
            s.customer_id,
            s.payment_attempts,
            c.email,
            c.name
        FROM subscriptions s
        JOIN customers c ON c.id = s.customer_id
        WHERE s.status = 'active'
        AND s.next_billing_date <= CURRENT_DATE
        AND s.is_production = p_is_production
        AND s.card_id IS NOT NULL
        ORDER BY s.next_billing_date, s.id
        LIMIT p_limit
    LOOP
        BEGIN
            -- Calcular valor total (base + extras)
            v_total_amount := v_sub.base_amount;

            -- Montar array de items começando com o plano base
            v_items := jsonb_build_array(
                jsonb_build_object(
                    'name', v_sub.plan_name || ' - Monthly Subscription',
                    'amount', v_sub.base_amount
                )
            );

            -- Adicionar items extras se houver
            IF v_sub.extra_items IS NOT NULL AND jsonb_array_length(v_sub.extra_items) > 0 THEN
                -- Concatenar arrays
                v_items := v_items || v_sub.extra_items;

                -- Somar valores dos items extras ao total
                SELECT v_total_amount + COALESCE(SUM((item->>'amount')::INTEGER), 0)
                INTO v_total_amount
                FROM jsonb_array_elements(v_sub.extra_items) AS item;
            END IF;

            -- Preparar body para Edge Function
            request_body := jsonb_build_object(
                'card_id', v_sub.card_id,
                'amount', v_total_amount,
                'items', v_items,
                'subscription_id', v_sub.id,
                'isDev', NOT p_is_production
            )::text;

            -- Configurar timeout
            PERFORM http_set_curlopt('CURLOPT_TIMEOUT_MS', timeout_ms::text);

            -- Log para debug (comentar em produção)
            RAISE NOTICE 'Processando assinatura %: %', v_sub.id, request_body;

            -- Chamar Edge Function process-payment
            SELECT * INTO http_response
            FROM http((
                'POST',
                'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/process-payment',
                ARRAY[
                    http_header('Content-Type', 'application/json'),
                    http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjUwOTM0NCwiZXhwIjoyMDQyMDg1MzQ0fQ.O-RO8VMAjfxZzZmDcyJeKABJJ2cn9OfIpapuxDENH8c')
                ]::http_header[],
                'application/json',
                request_body
            )::http_request);

            -- Resetar opções CURL
            PERFORM http_reset_curlopt();

            -- Processar resposta
            IF http_response.status = 200 THEN
                response_json := http_response.content::jsonb;

                -- Verificar se foi sucesso
                IF (response_json->>'success')::boolean = true THEN
                    -- Calcular próxima data de cobrança (30 dias)
                    v_next_billing_date := CURRENT_DATE + INTERVAL '30 days';

                    -- Atualizar subscription com sucesso
                    UPDATE subscriptions
                    SET
                        next_billing_date = v_next_billing_date,
                        payment_attempts = 0,
                        last_payment_attempt = NOW(),
                        updated_at = NOW()
                    WHERE id = v_sub.id;

                    -- Retornar sucesso
                    subscription_id := v_sub.id;
                    plan_name := v_sub.plan_name;
                    amount := v_total_amount;
                    payment_status := 'completed';
                    payment_id := response_json->'payment'->>'square_payment_id';
                    error_message := NULL;

                    RAISE NOTICE 'Pagamento processado com sucesso para assinatura %', v_sub.id;
                ELSE
                    -- Edge Function retornou erro
                    error_message := COALESCE(response_json->>'error', 'Payment processing failed');

                    -- Incrementar tentativas
                    UPDATE subscriptions
                    SET
                        payment_attempts = COALESCE(v_sub.payment_attempts, 0) + 1,
                        last_payment_attempt = NOW(),
                        status = CASE
                            WHEN COALESCE(v_sub.payment_attempts, 0) + 1 >= 3 THEN 'payment_failed'
                            ELSE status
                        END,
                        updated_at = NOW()
                    WHERE id = v_sub.id;

                    -- Retornar falha
                    subscription_id := v_sub.id;
                    plan_name := v_sub.plan_name;
                    amount := v_total_amount;
                    payment_status := 'failed';
                    payment_id := NULL;

                    RAISE NOTICE 'Falha no pagamento para assinatura %: %', v_sub.id, error_message;
                END IF;
            ELSE
                -- HTTP error
                BEGIN
                    response_json := http_response.content::jsonb;
                    error_message := COALESCE(response_json->>'error', 'HTTP Error ' || http_response.status);
                EXCEPTION WHEN OTHERS THEN
                    error_message := 'HTTP Error ' || http_response.status;
                END;

                -- Incrementar tentativas
                UPDATE subscriptions
                SET
                    payment_attempts = COALESCE(v_sub.payment_attempts, 0) + 1,
                    last_payment_attempt = NOW(),
                    status = CASE
                        WHEN COALESCE(v_sub.payment_attempts, 0) + 1 >= 3 THEN 'payment_failed'
                        ELSE status
                    END,
                    updated_at = NOW()
                WHERE id = v_sub.id;

                -- Retornar erro
                subscription_id := v_sub.id;
                plan_name := v_sub.plan_name;
                amount := v_total_amount;
                payment_status := 'failed';
                payment_id := NULL;

                RAISE WARNING 'HTTP Error para assinatura %: %', v_sub.id, error_message;
            END IF;

            RETURN NEXT;

        EXCEPTION WHEN OTHERS THEN
            -- Erro não esperado
            PERFORM http_reset_curlopt();

            subscription_id := v_sub.id;
            plan_name := v_sub.plan_name;
            amount := v_total_amount;
            payment_status := 'error';
            payment_id := NULL;
            error_message := SQLERRM;

            RAISE WARNING 'Erro inesperado para assinatura %: %', v_sub.id, SQLERRM;

            -- Atualizar tentativa mesmo em erro
            UPDATE subscriptions
            SET
                payment_attempts = COALESCE(payment_attempts, 0) + 1,
                last_payment_attempt = NOW(),
                updated_at = NOW()
            WHERE id = v_sub.id;

            RETURN NEXT;
        END;
    END LOOP;
END;
$function$