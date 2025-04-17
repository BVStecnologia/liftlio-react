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

## Como a verificação de integrações é feita

A verificação de integrações do YouTube agora é feita diretamente no banco de dados, sem uso de funções RPC. O método utiliza consultas diretas à tabela "Integrações" para verificar se a integração está ativa.

```typescript
// Verificação direta da integração do YouTube
const checkYouTubeConnection = async () => {
  try {
    // Verificação direta no banco de dados
    const { data, error } = await supabase
      .from('Integrações')
      .select('ativo')
      .eq('PROJETO id', currentProject.id)
      .eq('Tipo de integração', 'youtube')
      .single();
    
    // A integração está ativa se o campo ativo for true
    const isConnected = data?.ativo === true;
    
    console.log('Status da conexão YouTube:', isConnected ? 'Conectado' : 'Desconectado');
    return isConnected;
  } catch (error) {
    console.error("Erro ao verificar integração do YouTube:", error);
    return false;
  }
};
```

## Vantagens da abordagem atual

1. **Simplicidade**: Verificação direta no banco de dados sem chamadas RPC
2. **Eficiência**: Reduz o processamento no servidor, consultando apenas o necessário
3. **Performance**: Consultas mais rápidas e diretas
4. **Manutenção**: Código mais simples e fácil de manter