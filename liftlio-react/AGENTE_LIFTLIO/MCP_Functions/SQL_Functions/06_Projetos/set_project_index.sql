-- =============================================
-- Função: set_project_index (versão otimizada)
-- Descrição: Define o projeto ativo para um usuário
-- Criado: 2025-01-24
-- Atualizado: Versão otimizada com validação e updates cirúrgicos
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
    -- VALIDAÇÃO RÁPIDA
    -- =============================================
    IF p_user_email IS NULL OR p_user_email = '' THEN
        RAISE EXCEPTION 'Email do usuário é obrigatório';
    END IF;

    IF p_project_id IS NULL THEN
        RAISE EXCEPTION 'ID do projeto é obrigatório';
    END IF;

    -- =============================================
    -- VERIFICAÇÃO DE EXISTÊNCIA (uma única query)
    -- =============================================
    IF NOT EXISTS (
        SELECT 1 FROM "Projeto"
        WHERE id = p_project_id AND "user" = p_user_email
    ) THEN
        RAISE EXCEPTION 'Projeto % não encontrado para o usuário %', p_project_id, p_user_email;
    END IF;

    -- =============================================
    -- UPDATE ULTRA OTIMIZADO - PARTE 1
    -- Desativar APENAS projetos que estão ativos (evita triggers)
    -- =============================================
    UPDATE "Projeto"
    SET projetc_index = false
    WHERE "user" = p_user_email
      AND id != p_project_id
      AND projetc_index = true;  -- CRUCIAL: só atualiza se está true

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    v_total_updated := v_total_updated + v_rows_updated;

    -- =============================================
    -- UPDATE ULTRA OTIMIZADO - PARTE 2
    -- Ativar APENAS se não está ativo (evita triggers)
    -- =============================================
    UPDATE "Projeto"
    SET projetc_index = true
    WHERE id = p_project_id
      AND "user" = p_user_email
      AND (projetc_index = false OR projetc_index IS NULL);  -- CRUCIAL: só atualiza se precisa

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    v_total_updated := v_total_updated + v_rows_updated;

    -- Log para debugging (descomente se necessário)
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