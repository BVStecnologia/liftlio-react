-- =============================================
-- Trigger: trigger_subscription_status_email
-- Descrição: Envia email quando status da assinatura muda (cancelada, suspensa, reativada)
-- Tabela: subscriptions
-- Evento: AFTER UPDATE
-- Criado: 2025-01-24
-- =============================================

-- Remover trigger se existir
DROP TRIGGER IF EXISTS trigger_subscription_status_email ON subscriptions;

-- Criar trigger
CREATE TRIGGER trigger_subscription_status_email
    AFTER UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION send_subscription_status_email();

-- Comentários
COMMENT ON TRIGGER trigger_subscription_status_email ON subscriptions IS
    'Notifica cliente por email sobre mudanças no status da assinatura (cancelamento, suspensão, reativação)';