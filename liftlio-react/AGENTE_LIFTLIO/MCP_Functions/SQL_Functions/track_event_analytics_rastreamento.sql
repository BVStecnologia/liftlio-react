-- Função para rastrear eventos de analytics
-- Criada em: 07/08/2025
-- Propósito: Receber e validar eventos de analytics do servidor Node.js
-- Atualizada: Mapeamento correto para estrutura existente da tabela analytics

-- Remover função existente (todas as sobrecargas)
DROP FUNCTION IF EXISTS public.track_event CASCADE;

-- Criar função para rastrear eventos de analytics
CREATE OR REPLACE FUNCTION public.track_event(
    project_id INTEGER,
    event_type TEXT DEFAULT 'pageview',
    visitor_id TEXT DEFAULT NULL,
    session_id TEXT DEFAULT NULL,
    page_url TEXT DEFAULT NULL,
    page_title TEXT DEFAULT NULL,
    referrer TEXT DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    screen_resolution TEXT DEFAULT NULL,
    viewport_size TEXT DEFAULT NULL,
    device_type TEXT DEFAULT NULL,
    browser TEXT DEFAULT NULL,
    os TEXT DEFAULT NULL,
    country TEXT DEFAULT NULL,
    city TEXT DEFAULT NULL,
    custom_data JSONB DEFAULT '{}'::jsonb
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    
    -- Inserir evento na tabela analytics (usando as colunas existentes)
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
        NOW()
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$;

-- Comentário sobre a função
COMMENT ON FUNCTION public.track_event IS 'Função para rastrear eventos de analytics com validação de projeto';

-- Grant execute permission para anon
GRANT EXECUTE ON FUNCTION public.track_event TO anon;
GRANT EXECUTE ON FUNCTION public.track_event TO authenticated;

-- Exemplo de uso:
-- SELECT track_event(
--     project_id := 58,
--     event_type := 'pageview',
--     visitor_id := 'visitor_abc123',
--     page_url := 'https://example.com/page',
--     page_title := 'Example Page',
--     browser := 'Chrome',
--     os := 'macOS',
--     custom_data := '{"action": "button_click"}'::jsonb
-- );