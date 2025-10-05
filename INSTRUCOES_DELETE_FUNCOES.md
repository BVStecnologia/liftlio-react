# Instruções para Deletar Funções Antigas de Password Reset

## 🎯 Objetivo
Remover 3 funções antigas de password reset que não são mais utilizadas, mantendo apenas as 2 funções atuais.

## 📋 Passos para Executar

### 1. Acesse o Supabase Dashboard
- URL: https://supabase.com/dashboard/project/suqjifkhmekcdflwowiw/sql/new
- Faça login se necessário

### 2. Execute o Script de Verificação Inicial
Cole e execute este SQL para ver as funções atuais:

```sql
-- VERIFICAR ESTADO ATUAL
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'request_password_reset',
    'validate_and_reset_password',
    'validate_reset_token',
    'reset_password_with_token',
    'check_recent_tokens'
  )
ORDER BY p.proname;
```

### 3. Execute o Script de Limpeza
Cole e execute este SQL para deletar as funções antigas:

```sql
-- DELETAR FUNÇÕES ANTIGAS
DROP FUNCTION IF EXISTS public.validate_reset_token(TEXT);
DROP FUNCTION IF EXISTS public.reset_password_with_token(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.check_recent_tokens();
```

### 4. Verifique o Resultado Final
Cole e execute este SQL para confirmar que apenas 2 funções permanecem:

```sql
-- VERIFICAR RESULTADO FINAL (deve mostrar apenas 2 funções)
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'request_password_reset',
    'validate_and_reset_password'
  )
ORDER BY p.proname;
```

## ✅ Resultado Esperado

Após a limpeza, você deve ter **APENAS 2 funções**:

1. ✅ `request_password_reset(p_email text)` - Solicita reset de senha
2. ✅ `validate_and_reset_password(p_token text, p_new_password text)` - Valida token e reseta senha

## ❌ Funções que serão REMOVIDAS:

1. ❌ `validate_reset_token(text)` - Antiga, não mais usada
2. ❌ `reset_password_with_token(text, text)` - Antiga, não mais usada
3. ❌ `check_recent_tokens()` - Antiga, não mais usada

## 📍 Onde Executar

1. Vá para: https://supabase.com/dashboard/project/suqjifkhmekcdflwowiw
2. Clique em "SQL Editor" no menu lateral
3. Cole cada script na ordem indicada
4. Clique em "Run" para executar

## 🔍 Como Verificar o Sucesso

Se tudo funcionou corretamente:
- O script de verificação final mostrará apenas 2 linhas
- Não haverá erros durante a execução
- As funções antigas não aparecerão mais na lista

## 📂 Arquivos de Referência

Os scripts completos estão salvos em:
- `/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/SQL_Functions/00_Authentication/cleanup_old_password_reset_functions.sql`

## ⚠️ Importante

- As funções antigas já não são mais utilizadas no código
- Não há riscos em deletá-las
- Mantenha apenas as 2 funções mencionadas acima