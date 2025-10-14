-- =============================================
-- Função: track_event
-- Descrição: Rastreia eventos de analytics
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.track_event(integer, text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, boolean);

CREATE OR REPLACE FUNCTION public.track_event(
    project_id integer,
    event_type text DEFAULT 'pageview',
    visitor_id text DEFAULT NULL,
    session_id text DEFAULT NULL,
    page_url text DEFAULT NULL,
    page_title text DEFAULT NULL,
    referrer text DEFAULT NULL,
    user_agent text DEFAULT NULL,
    screen_resolution text DEFAULT NULL,
    viewport_size text DEFAULT NULL,
    device_type text DEFAULT NULL,
    browser text DEFAULT NULL,
    os text DEFAULT NULL,
    country text DEFAULT NULL,
    city text DEFAULT NULL,
    custom_data jsonb DEFAULT '{}',
    is_organic boolean DEFAULT NULL
)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_event_id INTEGER;
    v_project_exists BOOLEAN;
    v_final_custom_data JSONB;
BEGIN
    -- Verificar se o projeto existe
    SELECT EXISTS(
        SELECT 1 FROM public."Projeto" 
        WHERE id = project_id
    ) INTO v_project_exists;
    
    IF NOT v_project_exists THEN
        RAISE EXCEPTION 'Invalid project_id: %', project_id;
    END IF;
    
    -- Combinar dados extras no custom_data
    v_final_custom_data := COALESCE(custom_data, '{}'::jsonb) || 
        jsonb_build_object(
            'page_title', page_title,
            'user_agent', user_agent,
            'screen_resolution', screen_resolution,
            'viewport_size', viewport_size,
            'os', os,
            'city', city
        );
    
    -- Inserir evento na tabela analytics
    INSERT INTO public.analytics (
        project_id,
        event_type,
        visitor_id,
        session_id,
        url,  -- mapeando page_url para url
        referrer,
        device_type,
        browser,
        country,
        custom_data,
        is_organic,
        created_at
    ) VALUES (
        project_id,
        COALESCE(event_type, 'pageview'),
        visitor_id,
        session_id,
        page_url,  -- page_url vai para url
        referrer,
        device_type,
        browser,
        country,
        v_final_custom_data,
        is_organic,
        NOW()
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$function$;