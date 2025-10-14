CREATE OR REPLACE FUNCTION public.atualizar_integracao_projeto()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    antiga_integracao_id bigint;
BEGIN
    -- Verifica se o PROJETO id n�o � nulo
    IF NEW."PROJETO id" IS NOT NULL THEN
        -- Busca se j� existe uma integra��o associada a este projeto
        SELECT "Integra��es" INTO antiga_integracao_id
        FROM public."Projeto"
        WHERE id = NEW."PROJETO id";

        -- Se existe uma integra��o antiga e n�o � a mesma que estamos inserindo agora
        IF antiga_integracao_id IS NOT NULL AND antiga_integracao_id != NEW.id THEN
            -- Primeiro, define o campo "Integra��es" como NULL na tabela "Projeto"
            -- para evitar erro de chave estrangeira
            UPDATE public."Projeto"
            SET "Integra��es" = NULL
            WHERE id = NEW."PROJETO id";

            -- Agora define "PROJETO id" como NULL na integra��o antiga
            -- para evitar erro de chave estrangeira
            UPDATE public."Integra��es"
            SET "PROJETO id" = NULL
            WHERE id = antiga_integracao_id;

            -- Agora podemos apagar a integra��o antiga com seguran�a
            DELETE FROM public."Integra��es"
            WHERE id = antiga_integracao_id;
        END IF;

        -- Atualiza a tabela Projeto com o ID da nova integra��o
        UPDATE public."Projeto"
        SET "Integra��es" = NEW.id
        WHERE id = NEW."PROJETO id";
    END IF;

    RETURN NEW;
END;
$function$