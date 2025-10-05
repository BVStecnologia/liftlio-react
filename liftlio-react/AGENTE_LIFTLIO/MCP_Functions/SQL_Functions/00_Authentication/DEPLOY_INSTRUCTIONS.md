# Instruções de Deploy - Função request_password_reset

## Como aplicar no Supabase Dashboard

### 1. Acesse o Supabase Dashboard
- URL: https://supabase.com/dashboard/project/suqjifkhmekcdflwowiw
- Navegue até: **SQL Editor**

### 2. Execute o SQL da função
1. Copie todo o conteúdo do arquivo `request_password_reset.sql`
2. Cole no SQL Editor
3. Clique em **Run** (ou pressione Cmd/Ctrl + Enter)

### 3. Teste a função

Execute o seguinte comando no SQL Editor para testar:

```sql
-- Teste com email existente
SELECT public.request_password_reset('valdair3d@gmail.com');

-- Teste com email não existente (deve retornar sucesso por segurança)
SELECT public.request_password_reset('naoexiste@exemplo.com');
```

### 4. Verificar resultado esperado

Para um email válido, você deve receber:
```json
{
  "success": true,
  "message": "Password reset link sent successfully.",
  "email_sent": "true"
}
```

### 5. Verificar logs (opcional)

Para verificar se o email foi enviado, execute:

```sql
-- Ver últimos logs de email
SELECT * FROM public.email_send_logs
WHERE template_name = 'auth_password_reset'
ORDER BY created_at DESC
LIMIT 5;
```

### 6. Verificar token criado (debug)

```sql
-- Verificar se token foi salvo no user metadata
SELECT
  email,
  raw_user_meta_data->>'password_reset_token' as reset_token,
  raw_user_meta_data->>'password_reset_expires' as expires_at
FROM auth.users
WHERE email = 'valdair3d@gmail.com';
```

## Dependências

Esta função depende de:
1. **send_auth_email** - Função que envia emails usando templates
2. **auth.users** - Tabela de usuários do Supabase Auth
3. **pgcrypto extension** - Para gen_random_bytes() (geralmente já habilitada)

## Troubleshooting

### Erro: "function send_auth_email does not exist"
- Certifique-se de que a função `send_auth_email` foi criada primeiro
- Verifique no arquivo `send_auth_email.sql` na mesma pasta

### Erro: "permission denied for schema auth"
- A função precisa ter `SECURITY DEFINER` definido
- Verifique se está usando `SET search_path = public, auth`

### Email não chega
- Verifique configurações SMTP no Supabase Dashboard
- Verifique logs com: `SELECT * FROM public.email_send_logs ORDER BY created_at DESC LIMIT 10;`

## Notas de Segurança

1. A função sempre retorna sucesso mesmo para emails não existentes (evita enumeration attack)
2. Tokens expiram em 1 hora
3. Tokens são únicos e criptograficamente seguros (32 bytes)
4. URL de reset usa a configuração do site ou localhost como fallback

## Próximos Passos

Após criar esta função, você precisará:
1. Implementar a página `/reset-password` no frontend
2. Criar a função `reset_password_with_token` para processar o token
3. Configurar o template de email `auth_password_reset` se ainda não existir