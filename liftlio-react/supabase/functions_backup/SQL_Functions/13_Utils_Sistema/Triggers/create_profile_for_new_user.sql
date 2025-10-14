-- =============================================
-- Função: create_profile_for_new_user (TRIGGER)
-- Descrição: Cria perfil automaticamente para novos usuários
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.create_profile_for_new_user();

CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public."Perfil_user" (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$function$;