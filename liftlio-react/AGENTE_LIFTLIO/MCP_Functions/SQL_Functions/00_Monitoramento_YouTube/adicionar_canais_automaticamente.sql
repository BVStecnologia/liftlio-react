-- =============================================
-- Função: adicionar_canais_automaticamente
-- Descrição: Adiciona automaticamente canais descobertos ao sistema de monitoramento
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS adicionar_canais_automaticamente(BIGINT);

CREATE OR REPLACE FUNCTION adicionar_canais_automaticamente(id_projeto BIGINT)
RETURNS JSONB AS $$
DECLARE
    v_canais_adicionados INT := 0;
    v_canal RECORD;
BEGIN
    -- Loop pelos canais não registrados
    FOR v_canal IN
        SELECT DISTINCT
            cd."Canal" AS canal_id,
            cd."Nome do canal" AS nome_canal
        FROM "Canais descobertos" cd
        LEFT JOIN "Canais do youtube" cy ON cd."Canal" = cy.channel_id
        WHERE
            cd.projeto = id_projeto
            AND cy.id IS NULL
    LOOP
        -- Inserir o canal
        INSERT INTO "Canais do youtube" (
            channel_id,
            "Nome",
            created_at,
            updated_at
        ) VALUES (
            v_canal.canal_id,
            v_canal.nome_canal,
            NOW(),
            NOW()
        ) ON CONFLICT (channel_id) DO NOTHING;

        -- Vincular ao projeto
        INSERT INTO "Canais do youtube_Projeto" (
            "Canais do youtube_id",
            "Projeto_id",
            created_at
        )
        SELECT
            cy.id,
            id_projeto,
            NOW()
        FROM "Canais do youtube" cy
        WHERE cy.channel_id = v_canal.canal_id
        ON CONFLICT DO NOTHING;

        v_canais_adicionados := v_canais_adicionados + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'canais_adicionados', v_canais_adicionados,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;