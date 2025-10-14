-- =============================================
-- Função: trigger_project_keywords_update
-- Descrição: Trigger para atualizar keywords do projeto
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.trigger_project_keywords_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    -- Chamar a função update_project_keywords() com o ID do projeto
    perform update_project_keywords(new.id);

    return new;
end;
$function$