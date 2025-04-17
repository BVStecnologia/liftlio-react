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

## Edge Functions do Supabase

O Liftlio utiliza Edge Functions do Supabase para processar dados com IA e realizar outras operações no servidor.

### Chamando Edge Functions

Existem duas maneiras recomendadas de chamar as Edge Functions:

#### 1. Usando supabase.functions.invoke (Recomendado para novas versões do SDK)

```typescript
import { createClient } from '@supabase/supabase-js'

// Inicializar o cliente Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

// Chamar a edge function
const { data, error } = await supabase.functions.invoke('nome-da-funcao', {
  body: {
    // Parâmetros da função
    param1: "valor1",
    param2: "valor2"
  },
})

// Verificar erros
if (error) {
  console.error('Erro ao chamar a função:', error)
  return
}

// Processar os dados
console.log('Resposta:', data)
```

#### 2. Usando a função helper callEdgeFunction (Para versões mais antigas do SDK)

O projeto inclui uma função helper `callEdgeFunction` no arquivo `supabaseClient.ts` que pode ser usada quando a API `functions.invoke` não estiver disponível:

```typescript
import { callEdgeFunction } from '../lib/supabaseClient';

// Chamar a edge function
try {
  const data = await callEdgeFunction('nome-da-funcao', {
    // Parâmetros da função
    param1: "valor1",
    param2: "valor2"
  });
  
  // Processar os dados
  console.log('Resposta:', data);
} catch (error) {
  console.error('Erro ao chamar a função:', error);
}
```

### Edge Functions Disponíveis

#### 1. claude-proxy

Gera conteúdo de texto usando o modelo de IA Claude.

```typescript
// Exemplo de geração de palavras-chave
const { data, error } = await supabase.functions.invoke('claude-proxy', {
  body: {
    prompt: "Gere 5 palavras-chave para um projeto de monitoramento de mídias sociais, responda apenas com as palavras separadas por vírgula.",
    textOnly: true
  },
})

// Resposta: { text: "monitoramento, mídias sociais, análise de dados, métricas, engajamento." }
```

#### 2. Dados-da-url

Extrai informações de uma URL fornecida.

```typescript
// Exemplo de extração de dados de URL
const { data, error } = await supabase.functions.invoke('Dados-da-url', {
  body: {
    url: "https://humanlikewriter.com"
  },
})

// Processamento da resposta
if (!error) {
  console.log('Título da página:', data.title);
  console.log('Descrição:', data.description);
  // Outros dados retornados pela função
}
```

### Implementação no ProjectModal

O componente `ProjectModal` utiliza as Edge Functions para gerar palavras-chave e descrições de público-alvo:

1. **Geração de palavras-chave**: Baseado no nome do projeto, empresa e descrição do público-alvo
2. **Geração de descrição de público**: Baseado na URL do projeto e nos dados extraídos do site
```