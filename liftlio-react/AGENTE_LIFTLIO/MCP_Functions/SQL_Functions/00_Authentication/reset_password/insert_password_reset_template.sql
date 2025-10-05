-- =============================================
-- Script: insert_password_reset_template.sql
-- Descrição: Cria template de email para reset de senha
-- Criado: 2025-10-04
-- Tabela: email_templates
-- =============================================

-- Remove template antigo se existir
DELETE FROM public.email_templates WHERE name = 'auth_password_reset';

-- Insere template de password reset
INSERT INTO public.email_templates (
  name,
  subject,
  html_content,
  text_content,
  variables,
  category,
  priority,
  is_active,
  description,
  tags
)
VALUES (
  'auth_password_reset',
  'Reset Your Liftlio Password',

  -- HTML Content (usando estilo Liftlio)
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #8b5cf6;
      font-size: 22px;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .content p {
      margin-bottom: 20px;
      color: #555;
      font-size: 16px;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
    }
    .security-notice {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .security-notice p {
      margin: 0;
      color: #856404;
      font-size: 14px;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      border-top: 1px solid #e9ecef;
    }
    .footer p {
      margin: 5px 0;
      color: #6c757d;
      font-size: 14px;
    }
    .footer a {
      color: #8b5cf6;
      text-decoration: none;
    }
    .alternative-link {
      margin-top: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 6px;
      word-break: break-all;
      font-size: 12px;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Liftlio</h1>
    </div>

    <div class="content">
      <h2>Reset Your Password</h2>

      <p>Hi {{userName}},</p>

      <p>We received a request to reset the password for your Liftlio account (<strong>{{userEmail}}</strong>).</p>

      <p>Click the button below to create a new password:</p>

      <div style="text-align: center;">
        <a href="{{resetUrl}}" class="button">Reset Password</a>
      </div>

      <div class="security-notice">
        <p><strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn''t request this reset, please ignore this email and your password will remain unchanged.</p>
      </div>

      <p>If you''re having trouble clicking the button, copy and paste this link into your browser:</p>

      <div class="alternative-link">
        {{resetUrl}}
      </div>

      <p>Need help? Contact our support team at <a href="mailto:support@liftlio.com">support@liftlio.com</a></p>
    </div>

    <div class="footer">
      <p><strong>Liftlio</strong> - AI-Powered Word-of-Mouth Marketing</p>
      <p>
        <a href="https://liftlio.com">Website</a> •
        <a href="https://liftlio.com/privacy">Privacy</a> •
        <a href="https://liftlio.com/terms">Terms</a>
      </p>
      <p style="margin-top: 15px; font-size: 12px;">
        This email was sent to {{userEmail}}. If you didn''t request this, please ignore it.
      </p>
    </div>
  </div>
</body>
</html>',

  -- Text Content (fallback para email clients que não suportam HTML)
  'Hi {{userName}},

We received a request to reset the password for your Liftlio account ({{userEmail}}).

Click the link below to create a new password:
{{resetUrl}}

⚠️ SECURITY NOTICE: This link will expire in 1 hour. If you didn''t request this reset, please ignore this email and your password will remain unchanged.

Need help? Contact our support team at support@liftlio.com

---
Liftlio - AI-Powered Word-of-Mouth Marketing
https://liftlio.com

This email was sent to {{userEmail}}. If you didn''t request this, please ignore it.',

  -- Variables (JSONB)
  '["userName", "userEmail", "resetUrl"]'::jsonb,

  -- Category
  'authentication',

  -- Priority
  1,  -- Essential (highest priority)

  -- Is Active
  true,

  -- Description
  'Email sent when user requests password reset. Contains secure link valid for 1 hour.',

  -- Tags
  '["auth", "password", "reset", "security"]'::jsonb
);

-- Verificar se foi inserido
SELECT
  id,
  name,
  subject,
  category,
  priority,
  is_active,
  array_length(array(SELECT jsonb_array_elements_text(variables)), 1) as num_variables
FROM public.email_templates
WHERE name = 'auth_password_reset';

-- =============================================
-- TESTE RÁPIDO:
-- =============================================

/*
-- Testar se o template foi criado corretamente
SELECT
  name,
  subject,
  variables,
  is_active
FROM email_templates
WHERE name = 'auth_password_reset';

-- Exemplo de envio usando send_auth_email
SELECT public.send_auth_email(
  'password_reset',
  'teste.liftlio.2025@gmail.com',
  jsonb_build_object(
    'resetUrl', 'https://liftlio.com/reset-password?token=abc123xyz'
  )
);
*/
