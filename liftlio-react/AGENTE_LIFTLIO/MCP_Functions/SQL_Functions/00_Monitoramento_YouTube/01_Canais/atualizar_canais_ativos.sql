-- =============================================
-- Função: atualizar_canais_ativos
-- Descrição: Atualiza canais ativos baseado em quantidade de vídeos
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS atualizar_canais_ativos(BIGINT);

CREATE OR REPLACE FUNCTION atualizar_canais_ativos(projeto_id_param bigint DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    projeto_record RECORD;
    qtd_monitoramento INTEGER;
    youtube_active BOOLEAN;
BEGIN
    -- Se projeto_id_param for fornecido, processa apenas esse projeto
    -- Caso contrário, processa todos os projetos
    FOR projeto_record IN
        SELECT id, qtdmonitoramento, "Youtube Active"
        FROM public."Projeto"
        WHERE id = COALESCE(projeto_id_param, id)
    LOOP
        -- Verifica se YouTube está ativo para este projeto
        youtube_active := COALESCE(projeto_record."Youtube Active", false);

        -- Obtém a quantidade de canais a serem monitorados para este projeto
        qtd_monitoramento := COALESCE(projeto_record.qtdmonitoramento, 30);  -- Usa 30 como padrão se for NULL

        -- Primeiro, atualize o campo qtd_videos para todos os canais do projeto
        UPDATE public."Canais do youtube" c
        SET qtd_videos = subquery.num_videos::text
        FROM (
            SELECT
                c_inner.id as canal_id,
                COUNT(v.id) as num_videos
            FROM
                public."Canais do youtube" c_inner
            LEFT JOIN
                public."Videos" v ON v.channel_id_yotube = c_inner.channel_id
            WHERE
                c_inner."Projeto" = projeto_record.id
            GROUP BY
                c_inner.id
        ) AS subquery
        WHERE c.id = subquery.canal_id;

        IF NOT youtube_active THEN
            -- Se YouTube não estiver ativo, desativa todos os canais deste projeto
            UPDATE public."Canais do youtube" c
            SET is_active = false
            WHERE c."Projeto" = projeto_record.id
            AND c.desativado_pelo_user = false
            AND c.is_active = true;
        ELSE
            -- YouTube está ativo, aplica a lógica normal
            WITH canais_ordenados AS (
                SELECT
                    c.id as canal_id,
                    c.is_active as atual_is_active,
                    -- Convertendo qtd_videos para integer para ordenação correta
                    ROW_NUMBER() OVER (ORDER BY COALESCE(c.qtd_videos::integer, 0) DESC) as posicao
                FROM
                    public."Canais do youtube" c
                WHERE
                    c."Projeto" = projeto_record.id
                    AND c.desativado_pelo_user = false  -- Ignorar canais desativados pelo usuário
            )
            UPDATE public."Canais do youtube" c
            SET is_active = (co.posicao <= qtd_monitoramento)
            FROM canais_ordenados co
            WHERE c.id = co.canal_id
            AND (c.is_active != (co.posicao <= qtd_monitoramento))  -- Atualiza apenas se o status for diferente
            AND c.desativado_pelo_user = false;  -- Segurança adicional
        END IF;
    END LOOP;
END;
$$;