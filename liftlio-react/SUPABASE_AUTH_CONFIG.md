# Configuração de Autenticação Supabase

## Problema Identificado

O redirecionamento para `localhost:3000` após o login está ocorrendo porque o **Site URL** no Supabase Dashboard está configurado como `http://localhost:3000`.

## Solução Necessária

### No Supabase Dashboard:

1. Acesse: Authentication > URL Configuration
2. Altere o **Site URL** de `http://localhost:3000` para `https://liftlio.com`
3. Mantenha as **Redirect URLs** como estão (já incluem os domínios corretos)
4. Clique em "Save changes"

### Configuração Correta:

- **Site URL**: `https://liftlio.com` (ou `https://liftlio.fly.dev` se preferir manter o domínio fly.dev como principal)
- **Redirect URLs**: 
  - `http://localhost:3000`
  - `http://localhost:3000/login`
  - `https://liftlio.com/login`
  - `https://liftlio.com`
  - `https://liftlio.fly.dev` (se necessário)
  - `https://liftlio.fly.dev/login` (se necessário)

## Importante

O **Site URL** é para onde o Supabase redireciona após autenticação bem-sucedida quando nenhum `redirectTo` específico é fornecido. É por isso que está redirecionando para localhost:3000.

## Verificação

Após fazer a alteração no Supabase Dashboard:
1. Teste o login em `https://liftlio.com/login`
2. Verifique se após o login você permanece em `liftlio.com` e não é redirecionado para localhost

## Alterações no Código (já implementadas)

1. Detecção de ambiente atualizada para incluir `liftlio.com`
2. Redirect URIs dinâmicos baseados no hostname atual
3. Consistência em todos os arquivos que usam redirect URIs