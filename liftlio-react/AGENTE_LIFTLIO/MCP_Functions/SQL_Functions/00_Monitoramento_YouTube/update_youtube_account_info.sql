-- =============================================
-- Função: update_youtube_account_info
-- Descrição: Atualiza informações da conta YouTube após OAuth
-- Criado: 2025-01-18T18:00:00.000Z
-- Uso: Chamada após autenticação OAuth para salvar dados do canal
-- =============================================

CREATE OR REPLACE FUNCTION update_youtube_account_info(
    p_integration_id BIGINT,
    p_youtube_email TEXT,
    p_youtube_channel_id TEXT,
    p_youtube_channel_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se a integração existe
    IF NOT EXISTS (
        SELECT 1
        FROM "Integrações" i
        WHERE i.id = p_integration_id
    ) THEN
        RAISE EXCEPTION 'Integração não encontrada';
    END IF;

    -- Atualizar informações da conta
    UPDATE "Integrações"
    SET
        youtube_email = p_youtube_email,
        youtube_channel_id = p_youtube_channel_id,
        youtube_channel_name = p_youtube_channel_name,
        "Ultima atualização" = NOW()
    WHERE id = p_integration_id;

    RETURN true;
END;
$$;

COMMENT ON FUNCTION update_youtube_account_info(BIGINT, TEXT, TEXT, TEXT) IS
'Atualiza as informações da conta YouTube (email, channel_id, channel_name) após autenticação OAuth';