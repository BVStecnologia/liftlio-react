-- Function: prepare_rag_content_settings_messages
-- Descrição: Prepara conteúdo de Settings messages posts para embeddings RAG
-- Autor: Valdair & Claude
-- Data: 12/01/2025

CREATE OR REPLACE FUNCTION prepare_rag_content_settings_messages(p_id BIGINT)
RETURNS TEXT AS $$
DECLARE
    v_content TEXT;
BEGIN
    SELECT 
        COALESCE('Mensagem postada: ' || mensagem, '') || 
        CASE 
            WHEN justificativa IS NOT NULL THEN ' | Justificativa: ' || justificativa 
            ELSE '' 
        END ||
        CASE 
            WHEN tipo_msg IS NOT NULL THEN ' | Tipo: ' || tipo_msg 
            ELSE '' 
        END ||
        CASE 
            WHEN platform IS NOT NULL THEN ' | Plataforma: ' || platform 
            ELSE '' 
        END ||
        CASE 
            WHEN account IS NOT NULL THEN ' | Conta: ' || account 
            ELSE '' 
        END ||
        CASE 
            WHEN postado IS NOT NULL THEN ' | Data de postagem: ' || postado::TEXT 
            ELSE '' 
        END
    INTO v_content
    FROM "Settings messages posts"
    WHERE id = p_id;
    
    RETURN v_content;
END;
$$ LANGUAGE plpgsql;