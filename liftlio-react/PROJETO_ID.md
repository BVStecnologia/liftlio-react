# Padronização do acesso ao ID do Projeto

## Problema Identificado

Atualmente, algumas partes do código acessam `currentProject.id` diretamente, enquanto outras extraem o ID para uma variável `projectId`. Isso pode causar inconsistências quando o projeto muda.

## Solução Recomendada

Para todas as partes do código que usam o ID do projeto:

1. Extrair o ID para uma variável no início da função:
   ```typescript
   const { currentProject } = useProject();
   const projectId = currentProject?.id;
   ```

2. Verificar se o ID existe antes de qualquer operação:
   ```typescript
   if (!projectId) {
     console.log('ID do projeto não disponível');
     return;
   }
   ```

3. Usar a variável `projectId` em todas as consultas ao Supabase:
   ```typescript
   // ✅ CORRETO
   .eq('scanner_project_id', projectId)
   
   // ❌ EVITAR
   .eq('scanner_project_id', currentProject.id)
   ```

## Arquivos que precisam ser revisados

- `/src/pages/Mentions.tsx`: Nas consultas diretas ao Supabase (linha ~1920, ~1830, etc.)
- `/src/pages/Overview.tsx`: Nas consultas diretas ao Supabase e useEffects
- Outros componentes que acessam o projeto atual

## Benefícios desta padronização

1. Código mais seguro (evita erros de tipo null ou undefined)
2. Detecção mais clara de quando o projeto não está disponível
3. Consistência no acesso ao ID do projeto
4. Melhor rastreamento do fluxo de dados