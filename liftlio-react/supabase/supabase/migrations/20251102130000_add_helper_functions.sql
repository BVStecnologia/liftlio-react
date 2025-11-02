-- =============================================
-- Helper Functions para URLs dinâmicas
-- Deploy: 2025-11-02
-- =============================================

CREATE OR REPLACE FUNCTION get_edge_functions_url()
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Detecta ambiente: se existe tabela típica de local dev, retorna localhost
    -- Caso contrário, retorna URL do LIVE
    IF EXISTS (SELECT 1 FROM pg_database WHERE datname = 'postgres' AND pg_database_size('postgres') < 1000000000) THEN
        -- Database pequeno = ambiente local
        RETURN 'http://host.docker.internal:54321/functions/v1';
    ELSE
        -- Database grande = LIVE
        RETURN 'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_edge_functions_anon_key()
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Detecta ambiente e retorna anon key apropriada
    IF EXISTS (SELECT 1 FROM pg_database WHERE datname = 'postgres' AND pg_database_size('postgres') < 1000000000) THEN
        -- Local
        RETURN 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
    ELSE
        -- LIVE
        RETURN 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';
    END IF;
END;
$$;
