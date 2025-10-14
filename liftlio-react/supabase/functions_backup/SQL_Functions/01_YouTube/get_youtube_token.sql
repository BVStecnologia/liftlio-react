-- =============================================
-- Função: get_youtube_token
-- Descrição: Obtém token YouTube válido para o projeto
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_youtube_token(bigint);

CREATE OR REPLACE FUNCTION public.get_youtube_token(p_projeto_id bigint)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_token VARCHAR;
    v_refresh_token VARCHAR;
    v_expira_em INT4;
    v_ultima_atualizacao TIMESTAMP;
    v_refresh_result JSONB;
    v_integracao_id INT8;
    v_token_status TEXT;
    http_response http_response;
    is_valid BOOLEAN;
BEGIN
    -- Busca os dados da integração
    SELECT i."Token", i."Refresh token", i."expira em", i."Ultima atualização", i.id
    INTO v_token, v_refresh_token, v_expira_em, v_ultima_atualizacao, v_integracao_id
    FROM "Projeto" p
    JOIN "Integrações" i ON p."Integrações" = i.id
    WHERE p.id = p_projeto_id
      AND LOWER(i."Tipo de integração") = 'youtube'
    LIMIT 1;

    -- Verifica se encontrou uma integração
    IF v_token IS NULL THEN
        RETURN NULL; -- Não joga exceção, retorna NULL
    END IF;

    -- Verifica se o token atual é válido
    SELECT is_youtube_token_valid(v_token) INTO v_token_status;

    -- Se não for válido, tenta refresh
    IF v_token_status NOT LIKE 'VÁLIDO%' THEN
        BEGIN
            SELECT refresh_youtube_token(v_refresh_token) INTO v_refresh_result;
        EXCEPTION WHEN OTHERS THEN
            -- Qualquer erro no refresh: DESATIVA IMEDIATAMENTE
            UPDATE "Integrações" SET ativo = FALSE WHERE id = v_integracao_id;
            UPDATE "Projeto" SET integracao_valida = FALSE WHERE id = p_projeto_id;
            RETURN NULL; -- RETORNA NULL ao invés de jogar exceção
        END;

        -- Se o refresh funcionou, verifica se o novo token é válido
        SELECT is_youtube_token_valid(v_refresh_result->>'access_token') INTO v_token_status;

        IF v_token_status NOT LIKE 'VÁLIDO%' THEN
            -- Novo token inválido: DESATIVA
            UPDATE "Integrações" SET ativo = FALSE WHERE id = v_integracao_id;
            UPDATE "Projeto" SET integracao_valida = FALSE WHERE id = p_projeto_id;
            RETURN NULL; -- RETORNA NULL ao invés de jogar exceção
        END IF;

        -- Atualiza o token na tabela
        UPDATE "Integrações"
        SET "Token" = v_refresh_result->>'access_token',
            "expira em" = (v_refresh_result->>'expires_in')::int4,
            "Ultima atualização" = CURRENT_TIMESTAMP
        WHERE id = v_integracao_id;

        v_token := v_refresh_result->>'access_token';
    END IF;

    -- Marcar o projeto como válido
    UPDATE "Projeto" SET integracao_valida = TRUE WHERE id = p_projeto_id;

    RETURN v_token;
END;
$function$;