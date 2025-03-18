# Liftlio - Documentação para Claude

## Estrutura do Projeto

O Liftlio é uma aplicação React que permite gerenciar menções a projetos em diferentes plataformas.

## Modelo de Dados

### Projeto

```typescript
interface Project {
  id: string | number;
  name: string;
  description: string;
  user: string;
  user_id?: string;
  link?: string;
  audience?: string;
  "Project name"?: string; // Campo legado usado na interface
}
```

## Acesso ao Projeto Atual

O ID do projeto selecionado é armazenado no contexto global `ProjectContext`. Para acessar em qualquer componente:

```typescript
// Importe o hook
import { useProject } from '../context/ProjectContext';

// Use o hook em seu componente/hook
const MyComponent = () => {
  // Obter contexto completo do projeto
  const { currentProject } = useProject();
  
  // Extrair ID para uso direto
  const projectId = currentProject?.id;
  
  // Usar o ID em consultas ao banco
  const fetchData = async () => {
    if (!projectId) return;
    
    const { data } = await supabase
      .from('tabela')
      .select('*')
      .eq('project_id', projectId);
  };
};
```