# Função SQL para adicionar ao Supabase

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

## Como a função é chamada no código

Na implementação atual, a função é chamada diretamente via fetch para garantir compatibilidade com qualquer versão do Supabase:

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

## Vantagens desta abordagem

1. **Atomicidade**: As duas operações ocorrem em uma única transação. Isso significa que ou ambas são concluídas com sucesso, ou nenhuma é aplicada, evitando estados inconsistentes.

2. **Eficiência**: Reduz a quantidade de ida e volta entre o cliente e o servidor, melhorando o desempenho e reduzindo a chance de falha de rede.

3. **Compatibilidade**: Esta abordagem funcionará com qualquer versão do cliente Supabase, pois usa o endpoint REST diretamente.