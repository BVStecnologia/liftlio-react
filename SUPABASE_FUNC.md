# Funções do Supabase para o Liftlio

Este documento descreve as funções do Supabase utilizadas na aplicação Liftlio.

## 1. Função para definir um único projeto como indexado

Esta função marca um projeto específico como selecionado (indexado) e desmarca todos os outros projetos do mesmo usuário.

```sql
CREATE OR REPLACE FUNCTION public.set_project_index(
  p_user_email TEXT,
  p_project_id BIGINT
) 
RETURNS BOOLEAN 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Primeiro, desmarcar todos os projetos do usuário
  UPDATE "Projeto"
  SET projetc_index = FALSE
  WHERE "user" = p_user_email;
  
  -- Depois, marcar apenas o projeto específico
  UPDATE "Projeto"
  SET projetc_index = TRUE
  WHERE id = p_project_id AND "user" = p_user_email;
  
  RETURN TRUE;
END;
$$;
```

## 2. Função para verificar integração com YouTube por Email

Esta função é a principal para validar o status da integração com o YouTube baseado no email do usuário. É usada em toda a aplicação quando se precisa verificar o estado da integração.

```sql
CREATE OR REPLACE FUNCTION public.verificar_integracao_youtube_por_email(
  email_usuario TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_integracao RECORD;
  v_client_id TEXT;
  v_client_secret TEXT;
  v_last_updated TIMESTAMP;
  v_expires_in INTEGER;
  v_token_valido BOOLEAN := FALSE;
  v_refresh_necessario BOOLEAN := FALSE;
BEGIN
  -- Configurações de cliente (obtidas de variáveis de ambiente no Supabase)
  v_client_id := current_setting('app.settings.google_client_id', TRUE);
  v_client_secret := current_setting('app.settings.google_client_secret', TRUE);
  
  -- Verificar se a integração existe para qualquer projeto do usuário
  SELECT i.* INTO v_integracao
  FROM "Integrações" i
  JOIN "Projeto" p ON i."PROJETO id" = p.id
  WHERE p."user" = email_usuario
  AND i."Tipo de integração" = 'youtube'
  ORDER BY i."Ultima atualização" DESC NULLS LAST
  LIMIT 1;
  
  -- Se não existe integração, retornar FALSE
  IF v_integracao IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se o token precisa ser renovado
  IF v_integracao."Ultima atualização" IS NOT NULL THEN
    v_last_updated := v_integracao."Ultima atualização";
    v_expires_in := v_integracao."expira em";
    
    -- Se o token expira em menos de 5 minutos (300 segundos)
    IF (EXTRACT(EPOCH FROM NOW()) - EXTRACT(EPOCH FROM v_last_updated)) + 300 >= v_expires_in THEN
      v_refresh_necessario := TRUE;
    END IF;
  ELSE
    -- Se não tem data de atualização, precisamos renovar o token
    v_refresh_necessario := TRUE;
  END IF;
  
  -- Se precisamos renovar o token e temos um refresh token
  IF v_refresh_necessario AND v_integracao."Refresh token" IS NOT NULL THEN
    -- Na implementação real, aqui seria feita a chamada para a API do Google
    -- para renovar o token usando uma Edge Function do Supabase
    
    -- Simulando uma renovação bem-sucedida:
    UPDATE "Integrações"
    SET 
      "Ultima atualização" = NOW(),
      "ativo" = TRUE,
      "falhas_consecutivas" = 0
    WHERE id = v_integracao.id;
    
    RETURN TRUE;
  END IF;
  
  -- Se o token não precisa ser renovado, considera-se válido
  IF NOT v_refresh_necessario AND v_integracao."ativo" = TRUE THEN
    RETURN TRUE;
  END IF;
  
  -- Se chegou aqui, a integração não está ativa
  RETURN FALSE;
END;
$$;
```

## Como as funções são chamadas no código

### Exemplo de chamada para verificar_integracao_youtube_por_email

```typescript
// Obter o email do usuário atual
const { data: { user } } = await supabase.auth.getUser();

if (user && user.email) {
  const email_usuario = user.email;
  
  // Chamar a função RPC usando fetch direto
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/verificar_integracao_youtube_por_email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ email_usuario })
  });
  
  const data = await response.json();
  const error = !response.ok ? { message: 'Erro ao verificar integração' } : null;
  
  if (error) {
    console.error('Erro ao verificar integração do YouTube:', error);
  } else {
    console.log('Status da integração para o usuário:', data ? 'Ativa' : 'Inativa');
  }
}
```

## Quando a função é chamada

A função `verificar_integracao_youtube_por_email` é chamada em três momentos principais na aplicação:

1. Na inicialização da aplicação (método `initializeProject` no `ProjectContext.tsx`)
2. Quando o usuário troca de projeto (método `setProject` no `ProjectContext.tsx`) 
3. Quando a página de Integrações é carregada (`Integrations.tsx`)

## Vantagens desta abordagem

1. **Simplicidade**: Usando o email do usuário em vez do ID do projeto, a validação funciona independentemente do projeto selecionado
2. **Segurança**: Os tokens e chaves de API ficam seguros no lado do servidor
3. **Eficiência**: Reduz a quantidade de comunicação entre cliente e servidor
4. **Consistência**: A validação é centralizada em uma única função no backend