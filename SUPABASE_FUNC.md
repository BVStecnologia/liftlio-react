# Funções SQL para adicionar ao Supabase

## 1. Função para definir um único projeto como indexado

A correção implementada usa uma função armazenada no PostgreSQL que combina as duas operações de atualização em uma única transação atômica.

Execute o código SQL abaixo no SQL Editor do Supabase:

```sql
-- Função para definir um único projeto como indexado
-- e desmarcar todos os outros projetos do mesmo usuário
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

## 2. Função para verificar integração com YouTube

Esta função verifica e valida o status de integração do YouTube com um projeto, realizando a validação do token e refresh quando necessário.

```sql
-- Função para verificar integração com YouTube
CREATE OR REPLACE FUNCTION public.verificar_integracao_youtube(
  projeto_id BIGINT
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
  -- Configurações de cliente (devem ser obtidas de variáveis de ambiente no Supabase)
  v_client_id := current_setting('app.settings.google_client_id', TRUE);
  v_client_secret := current_setting('app.settings.google_client_secret', TRUE);
  
  -- Verificar se a integração existe
  SELECT * INTO v_integracao 
  FROM "Integrações"
  WHERE "PROJETO id" = projeto_id 
  AND "Tipo de integração" = 'youtube'
  LIMIT 1;
  
  -- Se não existe integração ou não está ativa, retornar FALSE
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
    -- Aqui deve ser feita a chamada para a API do Google para renovar o token
    -- Como o PostgreSQL não pode fazer chamadas HTTP diretamente, essa parte
    -- deve ser implementada usando:
    -- 1. Uma extensão PostgreSQL como http ou
    -- 2. Uma função Edge no Supabase ou
    -- 3. Um webhook/serverless function
    
    -- Para o propósito deste exemplo, consideramos que o token foi renovado
    -- Na implementação real, esta lógica deve ser adaptada para a arquitetura
    -- específica do seu sistema
    
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

### Exemplo de chamada para set_project_index

```typescript
// Importar as constantes do arquivo supabaseClient.ts
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabaseClient';

// ...

const response = await fetch(`${supabaseUrl}/rest/v1/rpc/set_project_index`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Prefer': 'return=minimal'
  },
  body: JSON.stringify({
    p_user_email: user.email,
    p_project_id: project.id
  })
});
```

### Exemplo de chamada para verificar_integracao_youtube

```typescript
const { currentProject } = useProject();
const projeto_id = currentProject?.id;

if (projeto_id) {
  const { data, error } = await supabase
    .rpc('verificar_integracao_youtube', { projeto_id });
    
  if (error) {
    console.error('Erro ao verificar integração do YouTube:', error);
  } else {
    console.log('Status da integração:', data ? 'Ativa' : 'Inativa');
  }
}
```

## Vantagens desta abordagem

1. **Atomicidade**: As operações ocorrem em uma única transação. Isso significa que ou todas são concluídas com sucesso, ou nenhuma é aplicada, evitando estados inconsistentes.

2. **Eficiência**: Reduz a quantidade de ida e volta entre o cliente e o servidor, melhorando o desempenho e reduzindo a chance de falha de rede.

3. **Segurança**: Os tokens e chaves de API ficam seguros no lado do servidor, sem exposição no cliente.

4. **Compatibilidade**: Esta abordagem funcionará com qualquer versão do cliente Supabase, pois usa o endpoint REST diretamente.

5. **Simplificação do código cliente**: A lógica complexa de verificação, validação e renovação de tokens fica encapsulada na função, simplificando significativamente o código front-end.

## Implementação real da função verificar_integracao_youtube

Para uma implementação completa da função `verificar_integracao_youtube` que faça chamadas HTTP à API do Google, você precisará implementá-la como uma função Edge no Supabase ou como uma serverless function, pois o PostgreSQL diretamente não pode fazer chamadas HTTP externas sem extensões específicas.

Aqui está um esboço de como seria a implementação usando uma função Edge no Supabase:

```typescript
// supabase/functions/verificar-youtube/index.ts
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

serve(async (req) => {
  try {
    const { projeto_id } = await req.json();
    
    // Criar cliente Supabase com SERVICE_ROLE para ter acesso completo ao banco
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    // Buscar dados da integração
    const { data: integracao, error } = await supabaseAdmin
      .from('Integrações')
      .select('*')
      .eq('PROJETO id', projeto_id)
      .eq('Tipo de integração', 'youtube')
      .single();
      
    if (error || !integracao) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: error?.message || 'Integração não encontrada' 
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 404
      });
    }
    
    // Verificar se o token precisa ser renovado
    const lastUpdated = integracao['Ultima atualização'] ? new Date(integracao['Ultima atualização']) : null;
    const expiresIn = integracao['expira em'] || 0;
    const refreshToken = integracao['Refresh token'];
    
    let tokenValido = false;
    
    // Verificar se o token está expirado ou próximo de expirar
    if (lastUpdated) {
      const timeSinceLastUpdate = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      const needsRefresh = timeSinceLastUpdate + 300 >= expiresIn; // 5 minutos de margem
      
      if (!needsRefresh) {
        // Token ainda é válido, testar com a API do YouTube
        tokenValido = await testarTokenYouTube(integracao['Token']);
      } else if (refreshToken) {
        // Tentar renovar o token
        const tokenRenovado = await renovarTokenYouTube(
          refreshToken, 
          Deno.env.get('GOOGLE_CLIENT_ID') || '',
          Deno.env.get('GOOGLE_CLIENT_SECRET') || ''
        );
        
        if (tokenRenovado) {
          // Atualizar na base de dados
          await supabaseAdmin
            .from('Integrações')
            .update({
              'Token': tokenRenovado.access_token,
              'expira em': tokenRenovado.expires_in,
              'Ultima atualização': new Date().toISOString(),
              'ativo': true,
              'falhas_consecutivas': 0
            })
            .eq('id', integracao.id);
            
          tokenValido = true;
        } else {
          // Falha na renovação do token
          const falhas = (integracao['falhas_consecutivas'] || 0) + 1;
          
          // Após 3 falhas consecutivas, desativar a integração
          if (falhas >= 3) {
            await supabaseAdmin
              .from('Integrações')
              .update({
                'ativo': false,
                'falhas_consecutivas': 0
              })
              .eq('id', integracao.id);
          } else {
            // Apenas incrementar o contador de falhas
            await supabaseAdmin
              .from('Integrações')
              .update({
                'falhas_consecutivas': falhas
              })
              .eq('id', integracao.id);
          }
        }
      }
    }
    
    return new Response(JSON.stringify({ success: true, ativo: tokenValido }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// Função para testar token do YouTube
async function testarTokenYouTube(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return false;
    }
    
    const data = await response.json();
    return data.items && data.items.length > 0;
  } catch (error) {
    return false;
  }
}

// Função para renovar o token do YouTube
async function renovarTokenYouTube(refreshToken: string, clientId: string, clientSecret: string) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      }).toString()
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    return null;
  }
}
```