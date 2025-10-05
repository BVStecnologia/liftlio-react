# Funções de Autenticação - Password Reset

## Funções Ativas no Supabase

### 1. `request_password_reset(p_email TEXT)`
Solicita reset de senha para um usuário.

**Funcionalidade:**
- Gera token único criptograficamente seguro (32 bytes)
- Token expira em 1 hora
- Envia email com link de reset
- Funciona em DEV (localhost:3000) e PROD (liftlio.com)
- Sempre retorna sucesso por segurança (evita enumeration attack)

**Exemplo de uso:**
```sql
SELECT public.request_password_reset('usuario@exemplo.com');
```

**Retorno esperado:**
```json
{
  "success": true,
  "message": "Password reset link sent successfully.",
  "email_sent": "true"
}
```

---

### 2. `validate_and_reset_password(p_token TEXT, p_new_password TEXT)`
Valida o token e reseta a senha do usuário.

**Funcionalidade:**
- Valida se o token existe e não expirou
- Atualiza a senha do usuário usando Supabase Auth
- Remove o token do metadata após uso

**Exemplo de uso:**
```sql
SELECT public.validate_and_reset_password(
  'token_aqui',
  'nova_senha_segura'
);
```

---

### 3. `trigger_password_reset_email()`
Função de trigger que envia email automaticamente.

---

## Dependências

- **send_auth_email** - Função para envio de emails usando templates
- **auth.users** - Tabela de usuários do Supabase Auth
- **pgcrypto extension** - Para gen_random_bytes()

---

## Scripts de Manutenção

Os arquivos `.sql` nesta pasta são scripts de verificação e limpeza:

- `CHECK_AND_CLEANUP_PASSWORD_FUNCTIONS.sql` - Verifica e lista funções
- `cleanup_old_password_reset_functions.sql` - Remove funções antigas
- `EXECUTE_CLEANUP_NOW.sql` - Cleanup rápido
- `drop_old_password_functions.sql` - Remove funções específicas

**Funções antigas já removidas:**
- ~~`validate_reset_token(TEXT)`~~
- ~~`reset_password_with_token(TEXT, TEXT)`~~
- ~~`check_recent_tokens()`~~

---

## Como Testar

### 1. Solicitar reset de senha
```sql
SELECT public.request_password_reset('seu_email@exemplo.com');
```

### 2. Verificar token criado
```sql
SELECT
  email,
  raw_user_meta_data->>'password_reset_token' as token,
  raw_user_meta_data->>'password_reset_expires' as expires_at
FROM auth.users
WHERE email = 'seu_email@exemplo.com';
```

### 3. Verificar logs de email
```sql
SELECT * FROM public.email_send_logs
WHERE template_name = 'auth_password_reset'
ORDER BY created_at DESC
LIMIT 5;
```

---

## Segurança

1. ✅ Sempre retorna sucesso (evita enumeration attack)
2. ✅ Tokens expiram em 1 hora
3. ✅ Tokens criptograficamente seguros (32 bytes)
4. ✅ Tokens são removidos após uso
5. ✅ Função usa SECURITY DEFINER com search_path seguro

---

## Troubleshooting

**Email não chega:**
- Verificar configurações SMTP no Supabase Dashboard
- Verificar logs: `SELECT * FROM public.email_send_logs ORDER BY created_at DESC`

**Erro "function send_auth_email does not exist":**
- Criar função `send_auth_email` primeiro

**Token expirado:**
- Token válido por apenas 1 hora
- Solicitar novo reset de senha
