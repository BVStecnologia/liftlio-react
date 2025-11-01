set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.add_subscription_item(sub_id bigint, description text, amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE subscriptions
  SET extra_items = extra_items || jsonb_build_object(
    'description', description,
    'amount', amount,
    'added_at', NOW()
  )
  WHERE id = sub_id
  AND EXISTS (
    SELECT 1 FROM customers
    WHERE customers.id = subscriptions.customer_id
    AND customers.user_id = auth.uid()
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.add_to_waitlist(p_name text, p_email text, p_website_url text DEFAULT NULL::text, p_discovery_source text DEFAULT 'Other'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_position INTEGER;
    v_waitlist_id BIGINT;
    v_email_result JSONB;
BEGIN
    -- ========================================
    -- 1. VALIDAÇÕES
    -- ========================================

    -- Validar formato de email
    IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid email format'
        );
    END IF;

    -- Validar nome (mínimo 2 caracteres)
    IF LENGTH(TRIM(p_name)) < 2 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Name must be at least 2 characters'
        );
    END IF;

    -- Verificar se email já existe na waitlist
    IF EXISTS (SELECT 1 FROM public.waitlist WHERE email = LOWER(TRIM(p_email))) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Email already registered on waitlist',
            'code', 'EMAIL_ALREADY_EXISTS'
        );
    END IF;

    -- ========================================
    -- 2. CALCULAR POSIÇÃO NA FILA
    -- ========================================

    SELECT COALESCE(MAX(position_in_queue), 0) + 1 INTO v_position
    FROM public.waitlist;

    -- ========================================
    -- 3. INSERIR NA TABELA
    -- ========================================

    INSERT INTO public.waitlist (
        name,
        email,
        website_url,
        discovery_source,
        position_in_queue,
        status
    ) VALUES (
        TRIM(p_name),
        LOWER(TRIM(p_email)),
        NULLIF(TRIM(p_website_url), ''),
        TRIM(p_discovery_source),
        v_position,
        'pending'
    )
    RETURNING id INTO v_waitlist_id;

    -- ========================================
    -- 4. ENVIAR EMAIL DE CONFIRMAÇÃO
    -- ========================================

    BEGIN
        -- Chamar send_waitlist_email
        v_email_result := public.send_waitlist_email(
            LOWER(TRIM(p_email)),
            TRIM(p_name)
        );

        -- Log do resultado do email (para debugging)
        RAISE NOTICE 'Email result: %', v_email_result;

    EXCEPTION WHEN OTHERS THEN
        -- Se falhar ao enviar email, registrar mas não falhar a inscrição
        RAISE WARNING 'Failed to send confirmation email: %', SQLERRM;
        v_email_result := jsonb_build_object(
            'success', false,
            'error', 'Email not sent: ' || SQLERRM
        );
    END;

    -- ========================================
    -- 5. RETORNAR SUCESSO
    -- ========================================

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully added to waitlist!',
        'data', jsonb_build_object(
            'waitlist_id', v_waitlist_id,
            'position', v_position,
            'email', LOWER(TRIM(p_email)),
            'name', TRIM(p_name),
            'email_sent', COALESCE(v_email_result->>'success', 'false')::boolean
        )
    );

EXCEPTION WHEN OTHERS THEN
    -- Erro genérico
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Error processing signup: ' || SQLERRM,
        'code', 'INTERNAL_ERROR'
    );
END;
$function$
;


