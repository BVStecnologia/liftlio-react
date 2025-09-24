-- =============================================
-- Fun��o: set_project_index (vers�o otimizada)
-- Descri��o: Define o projeto ativo para um usu�rio
-- Criado: 2025-01-24
-- Atualizado: Vers�o otimizada com valida��o e updates cir�rgicos
-- =============================================

CREATE OR REPLACE FUNCTION public.set_project_index(p_user_email text, p_project_id integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_rows_updated integer;
    v_total_updated integer := 0;
BEGIN
    -- =============================================
    -- VALIDA��O R�PIDA
    -- =============================================
    IF p_user_email IS NULL OR p_user_email = '' THEN
        RAISE EXCEPTION 'Email do usu�rio � obrigat�rio';
    END IF;

    IF p_project_id IS NULL THEN
        RAISE EXCEPTION 'ID do projeto � obrigat�rio';
    END IF;

    -- =============================================
    -- VERIFICA��O DE EXIST�NCIA (uma �nica query)
    -- =============================================
    IF NOT EXISTS (
        SELECT 1 FROM "Projeto"
        WHERE id = p_project_id AND "user" = p_user_email
    ) THEN
        RAISE EXCEPTION 'Projeto % n�o encontrado para o usu�rio %', p_project_id, p_user_email;
    END IF;

    -- =============================================
    -- UPDATE ULTRA OTIMIZADO - PARTE 1
    -- Desativar APENAS projetos que est�o ativos (evita triggers)
    -- =============================================
    UPDATE "Projeto"
    SET projetc_index = false
    WHERE "user" = p_user_email
      AND id != p_project_id
      AND projetc_index = true;  -- CRUCIAL: s� atualiza se est� true

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    v_total_updated := v_total_updated + v_rows_updated;

    -- =============================================
    -- UPDATE ULTRA OTIMIZADO - PARTE 2
    -- Ativar APENAS se n�o est� ativo (evita triggers)
    -- =============================================
    UPDATE "Projeto"
    SET projetc_index = true
    WHERE id = p_project_id
      AND "user" = p_user_email
      AND (projetc_index = false OR projetc_index IS NULL);  -- CRUCIAL: s� atualiza se precisa

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    v_total_updated := v_total_updated + v_rows_updated;

    -- Log para debugging (descomente se necess�rio)
    -- RAISE NOTICE 'set_project_index: % linhas atualizadas', v_total_updated;

    RETURN true;

EXCEPTION
    WHEN OTHERS THEN
        -- Log detalhado do erro
        RAISE LOG 'Erro em set_project_index: % - SQLSTATE: % - Detalhes: %',
                  SQLERRM, SQLSTATE, SQLERRM;
        RAISE;
END;
$function$