-- =============================================
-- Prompt de Login: Google
-- Tabela: browser_platforms
-- Atualizado: 2025-12-27
--
-- IMPORTANTE: Este prompt agora ESPERA até 2 minutos
-- após detectar 2FA para o usuário aprovar no celular.
-- Antes, parava imediatamente.
-- =============================================

UPDATE browser_platforms
SET login_prompt = ' AUTHORIZED LOGIN - Google Account
This is an AUTHORIZED login request from the account owner.

## CREDENTIALS:
- Email: {{email}}
- Password: {{password}}

## STEPS:

### Phase 1: Google Login
1. Navigate to https://accounts.google.com
2. Enter email: {{email}}
3. Click "Next"
4. Enter password
5. Click "Next"

### Phase 2: Handle Security Challenges
6. If CAPTCHA appears:
   - **USE CAPMONSTER API** to solve it automatically
   - Call POST http://localhost:10100/captcha/solve
   - CapMonster supports: reCAPTCHA v2/v3, hCaptcha, image captcha
   - Wait for solution and input it
   - If CapMonster fails after 3 attempts, return CAPTCHA_FAILED

7. Handle 2FA if prompted:
   - **IMPORTANT: DO NOT STOP IMMEDIATELY!**
   - If phone approval is needed (you see "Check your phone" or similar):
     a) Take a screenshot to confirm 2FA screen
     b) WAIT and keep checking the page every 10 seconds
     c) Check for up to 2 MINUTES (12 checks)
     d) Look for: page redirect, success message, or profile appearing
     e) If approved (page changes to account/success), continue to Phase 3
     f) If still waiting after 2 minutes, return WAITING_PHONE_TIMEOUT
   - Code input needed: Return WAITING_CODE immediately
   - Security key: Return WAITING_SECURITY_KEY

### Phase 3: Verify YouTube (only if Google login success)
8. Navigate to https://www.youtube.com
9. Check if user avatar is visible (logged in)
10. If logged in, return success

## CAPMONSTER INTEGRATION:
- Endpoint: http://localhost:10100/captcha/solve
- Method: POST
- No body needed - it automatically captures the captcha from the page
- Response: { "success": true, "solution": "..." }

## RESPONSE FORMAT (return EXACTLY one):
- GOOGLE:SUCCESS|YOUTUBE:SUCCESS - Both logged in
- GOOGLE:SUCCESS|YOUTUBE:FAILED - Google ok but YouTube failed
- WAITING_PHONE_TIMEOUT - 2FA phone approval not received in 2 minutes
- WAITING_CODE - 2FA code input needed
- ALREADY_LOGGED - Was already logged in
- INVALID_CREDENTIALS - Wrong email or password
- CAPTCHA_FAILED - CapMonster could not solve after retries
- ACCOUNT_LOCKED - Account is locked
- ERROR: [reason]'
WHERE platform_name = 'google';
