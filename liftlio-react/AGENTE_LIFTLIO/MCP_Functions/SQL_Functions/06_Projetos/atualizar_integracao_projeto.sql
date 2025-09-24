CREATE OR REPLACE FUNCTION public.atualizar_integracao_projeto()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    antiga_integracao_id bigint;
BEGIN
    -- Verifica se o PROJETO id não é nulo
    IF NEW."PROJETO id" IS NOT NULL THEN
        -- Busca se já existe uma integração associada a este projeto
        SELECT "Integrações" INTO antiga_integracao_id
        FROM public."Projeto"
        WHERE id = NEW."PROJETO id";

        -- Se existe uma integração antiga e não é a mesma que estamos inserindo agora
        IF antiga_integracao_id IS NOT NULL AND antiga_integracao_id != NEW.id THEN
            -- Primeiro, define o campo "Integrações" como NULL na tabela "Projeto"
            -- para evitar erro de chave estrangeira
            UPDATE public."Projeto"
            SET "Integrações" = NULL
            WHERE id = NEW."PROJETO id";

            -- Agora define "PROJETO id" como NULL na integração antiga
            -- para evitar erro de chave estrangeira
            UPDATE public."Integrações"
            SET "PROJETO id" = NULL
            WHERE id = antiga_integracao_id;

            -- Agora podemos apagar a integração antiga com segurança
            DELETE FROM public."Integrações"
            WHERE id = antiga_integracao_id;
        END IF;

        -- Atualiza a tabela Projeto com o ID da nova integração
        UPDATE public."Projeto"
        SET "Integrações" = NEW.id
        WHERE id = NEW."PROJETO id";
    END IF;

    RETURN NEW;
END;
$function$