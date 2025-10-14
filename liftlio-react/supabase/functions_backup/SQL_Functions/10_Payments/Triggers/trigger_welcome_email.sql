-- =============================================
-- Trigger: trigger_welcome_email
-- Descrição: Envia email de boas-vindas quando novo cliente é criado
-- Tabela: customers
-- Evento: AFTER INSERT
-- Criado: 2025-01-24
-- =============================================

-- Remover trigger se existir
DROP TRIGGER IF EXISTS trigger_welcome_email ON customers;

-- Criar trigger
CREATE TRIGGER trigger_welcome_email
    AFTER INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION send_welcome_email_on_customer_create();

-- Comentários
COMMENT ON TRIGGER trigger_welcome_email ON customers IS
    'Envia automaticamente email de boas-vindas para novos clientes cadastrados na plataforma';