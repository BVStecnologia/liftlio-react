-- =============================================
-- Trigger: trigger_manage_default_card
-- Descrição: Garante que apenas um cartão seja marcado como padrão por cliente
-- Tabela: cards
-- Evento: BEFORE INSERT OR UPDATE
-- Criado: 2025-01-24
-- =============================================

-- Remover trigger se existir
DROP TRIGGER IF EXISTS trigger_manage_default_card ON cards;

-- Criar trigger
CREATE TRIGGER trigger_manage_default_card
    BEFORE INSERT OR UPDATE ON cards
    FOR EACH ROW
    EXECUTE FUNCTION manage_default_card();

-- Comentários
COMMENT ON TRIGGER trigger_manage_default_card ON cards IS
    'Gerencia automaticamente cartões padrão, garantindo que apenas um cartão por cliente seja marcado como default';