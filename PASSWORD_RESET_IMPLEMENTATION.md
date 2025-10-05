# 📧 Implementação do Sistema de Password Reset

## 📋 Status Atual

### ✅ O que já está pronto:
1. **Template de Email**: Template `auth_password_reset` já existe no banco de dados
   - Nome: `auth_password_reset`
   - Assunto: "Reset your password - Liftlio"
   - Variáveis: `userName`, `userEmail`, `resetUrl`
   - Status: Ativo

### ❌ O que precisa ser criado:
1. **Função `request_password_reset`**: Não existe no banco de dados
2. **Tabela `password_reset_tokens`**: Provavelmente não existe
3. **Funções auxiliares**: `validate_reset_token`, `reset_password_with_token`

## 🚀 Passos para Implementar

### Passo 1: Execute no Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/suqjifkhmekcdflwowiw/sql/new
2. Cole e execute o SQL do arquivo:
   ```
   /liftlio-react/AGENTE_LIFTLIO/MCP_Functions/SQL_Functions/00_Authentication/request_password_reset.sql
   ```

### Passo 2: Atualizar o Template de Email (Opcional)

Se quiser um template mais moderno, execute:
```
/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/SQL_Functions/00_Authentication/update_email_template.sql
```

### Passo 3: Testar a Função

No SQL Editor do Supabase, execute:

```sql
-- Testar envio de email
SELECT public.request_password_reset('valdair3d@gmail.com');

-- Verificar tokens criados
SELECT * FROM public.check_recent_tokens();

-- Ver logs de email
SELECT * FROM public.email_send_logs
WHERE template_name = 'auth_password_reset'
ORDER BY created_at DESC
LIMIT 5;
```

## 🔍 Resultados da Análise

### 1. ✅ Template de Email
- **Status**: EXISTE e está ATIVO
- **Verificado em**: 2025-10-04
- **Variáveis**: Precisa de `userName`, `userEmail`, `resetUrl`

### 2. ❌ Função `request_password_reset`
- **Status**: NÃO EXISTE
- **Erro**: "Could not find the function public.request_password_reset(p_email)"
- **Ação**: Executar SQL de criação

### 3. ❓ Tabela `password_reset_tokens`
- **Status**: Não verificado
- **Ação**: O SQL de criação inclui CREATE TABLE IF NOT EXISTS

## 📝 Arquivos Criados

Todos os arquivos necessários foram salvos em:
```
/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/SQL_Functions/00_Authentication/
├── request_password_reset.sql      # Função principal e tabelas
└── update_email_template.sql       # Template de email atualizado
```

## ⚙️ Funcionalidades do Sistema

### 1. **request_password_reset(email)**
- Gera token seguro de 64 caracteres
- Salva token com expiração de 1 hora
- Envia email usando template `auth_password_reset`
- Retorna mensagem genérica por segurança

### 2. **validate_reset_token(token)**
- Valida se token existe e não expirou
- Retorna user_id se válido

### 3. **reset_password_with_token(token, new_password)**
- Valida token
- Atualiza senha do usuário
- Marca token como usado

### 4. **check_recent_tokens()**
- Função de debug para ver tokens recentes
- Mostra email, data criação, expiração e status

## 🔒 Segurança Implementada

1. **Tokens seguros**: 64 caracteres hexadecimais aleatórios
2. **Expiração**: 1 hora
3. **Token único por usuário**: ON CONFLICT DO UPDATE
4. **Resposta genérica**: Não revela se email existe
5. **SECURITY DEFINER**: Função executa com privilégios elevados
6. **Logs de auditoria**: Todos os envios são logados

## 🎨 Frontend - Implementação Necessária

### 1. Página de Solicitação de Reset
```tsx
// /liftlio-react/src/pages/ForgotPassword.tsx
const handleSubmit = async (email: string) => {
  const { data, error } = await supabase.rpc('request_password_reset', {
    p_email: email
  });

  if (data?.success) {
    // Mostrar mensagem de sucesso
  }
};
```

### 2. Página de Reset de Senha
```tsx
// /liftlio-react/src/pages/ResetPassword.tsx
const handleReset = async (token: string, newPassword: string) => {
  const { data, error } = await supabase.rpc('reset_password_with_token', {
    p_token: token,
    p_new_password: newPassword
  });

  if (data?.success) {
    // Redirecionar para login
  }
};
```

### 3. Rotas Necessárias
```tsx
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
```

## ✅ Checklist de Implementação

- [ ] Executar SQL de criação da função no Supabase
- [ ] Testar envio de email com `SELECT public.request_password_reset('seu-email');`
- [ ] Verificar se email foi recebido
- [ ] Criar páginas no Frontend
- [ ] Adicionar rotas no React Router
- [ ] Testar fluxo completo end-to-end

## 🐛 Troubleshooting

### Email não enviado?
1. Verificar função `send_email` existe e funciona
2. Verificar configurações SMTP no Supabase
3. Ver logs: `SELECT * FROM email_send_logs ORDER BY created_at DESC`

### Token não criado?
1. Verificar se tabela `password_reset_tokens` existe
2. Verificar permissões RLS

### Função não encontrada?
1. Verificar se executou o SQL completo
2. Verificar se está no schema `public`
3. Verificar permissões: `GRANT EXECUTE ON FUNCTION`

## 📞 Suporte

Se precisar de ajuda:
1. Verifique os logs no Supabase Dashboard
2. Execute as funções de debug (`check_recent_tokens`)
3. Verifique a documentação em `/AGENTE_LIFTLIO/5_Documentacao/`