-- =============================================
-- Trigger: trigger_payment_success_email
-- Descrição: Envia email de confirmação após pagamento bem-sucedido
-- Tabela: payments
-- Evento: AFTER INSERT
-- Criado: 2025-01-24
-- =============================================

-- Remover trigger se existir
DROP TRIGGER IF EXISTS trigger_payment_success_email ON payments;

-- Criar trigger
CREATE TRIGGER trigger_payment_success_email
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION send_payment_success_email();

-- Comentários
COMMENT ON TRIGGER trigger_payment_success_email ON payments IS
    'Envia automaticamente email de recibo quando um novo pagamento é registrado com sucesso';