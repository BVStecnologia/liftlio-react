-- =============================================
-- Trigger: trigger_atualizar_canais_ativos
-- Descrição: Trigger que atualiza canais ativos quando novo vídeo é inserido
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS trigger_atualizar_canais_ativos() CASCADE;

CREATE OR REPLACE FUNCTION trigger_atualizar_canais_ativos()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    projeto_id BIGINT;
BEGIN
    -- Obter o ID do projeto associado ao canal deste vídeo
    SELECT c."Projeto" INTO projeto_id
    FROM public."Canais do youtube" c
    WHERE c.channel_id = NEW.channel_id_yotube;

    -- Se encontrou o projeto, chama a função de atualização apenas para este projeto
    IF projeto_id IS NOT NULL THEN
        PERFORM atualizar_canais_ativos(projeto_id);
    END IF;

    RETURN NEW;
END;
$$;

-- Criar o trigger se não existir
DROP TRIGGER IF EXISTS trigger_videos_atualizar_canais ON public."Videos";

CREATE TRIGGER trigger_videos_atualizar_canais
    AFTER INSERT ON public."Videos"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_atualizar_canais_ativos();