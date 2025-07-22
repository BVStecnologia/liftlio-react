# GlobalLoader - Guia de Uso

## Componente de Loading Global do Liftlio

O GlobalLoader é um componente de carregamento unificado com animação de radar que detecta menções, perfeito para representar visualmente o que o Liftlio faz.

## 🎯 Características

- **Animação de Radar**: Representa a busca por menções
- **Blips Animados**: Simulam detecção de oportunidades
- **Tema Adaptativo**: Funciona com tema claro/escuro
- **Mensagens Customizáveis**: Textos principais e secundários
- **Fullscreen ou Inline**: Pode cobrir toda a tela ou área específica

## 📦 Importação

```typescript
// Componente direto
import GlobalLoader from '@/components/GlobalLoader';

// Hook para uso programático
import { useGlobalLoader, globalLoader } from '@/hooks/useGlobalLoader';
```

## 🚀 Uso Básico

### 1. Como Componente React

```tsx
// Uso simples
<GlobalLoader />

// Com mensagens customizadas
<GlobalLoader 
  message="Analisando vídeos" 
  subMessage="Buscando menções da sua marca"
/>

// Modo inline (não fullscreen)
<GlobalLoader fullScreen={false} />
```

### 2. Usando o Hook

```tsx
function MyComponent() {
  const { showLoader, hideLoader } = useGlobalLoader();

  const handleLoadData = async () => {
    showLoader({
      message: "Processando dados",
      subMessage: "Isso pode levar alguns segundos"
    });

    try {
      await fetchData();
    } finally {
      hideLoader();
    }
  };

  return <button onClick={handleLoadData}>Carregar Dados</button>;
}
```

### 3. Uso Global (fora de componentes React)

```typescript
import { globalLoader } from '@/hooks/useGlobalLoader';

// Mostrar loader
globalLoader.show({
  message: "Sincronizando",
  subMessage: "Conectando ao YouTube"
});

// Esconder loader
setTimeout(() => {
  globalLoader.hide();
}, 3000);
```

## 💬 Mensagens Sugeridas

### Para Análise de Vídeos
```tsx
message="Analisando vídeos"
subMessage="Processando conteúdo do YouTube"
```

### Para Busca de Menções
```tsx
message="Buscando menções"
subMessage="Escaneando oportunidades"
```

### Para Processamento de IA
```tsx
message="IA processando"
subMessage="Analisando sentimentos"
```

### Para Carregamento Inicial
```tsx
message="Inicializando"
subMessage="Carregando Liftlio"
```

### Para Sincronização
```tsx
message="Sincronizando dados"
subMessage="Atualizando informações"
```

## 🎨 Customização de Tema

O GlobalLoader automaticamente usa o tema atual do sistema:

```tsx
// O loader detecta o tema do localStorage
// Cores se adaptam automaticamente para claro/escuro
```

## 📱 Responsividade

O componente é totalmente responsivo e se adapta a diferentes tamanhos de tela:
- Desktop: Radar de 200px
- Mobile: Escala proporcionalmente
- Textos ajustam tamanho automaticamente

## 🔧 Props do Componente

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| message | string | "Inicializando" | Texto principal |
| subMessage | string | "Carregando Liftlio" | Texto secundário |
| fullScreen | boolean | true | Se deve cobrir toda a tela |

## 💡 Exemplos Avançados

### Loading com Timeout

```tsx
const loadWithTimeout = async () => {
  showLoader({ message: "Processando..." });
  
  const timeout = setTimeout(() => {
    hideLoader();
    alert("Operação cancelada por timeout");
  }, 30000);

  try {
    await longOperation();
    clearTimeout(timeout);
  } finally {
    hideLoader();
  }
};
```

### Loading Condicional

```tsx
const ConditionalLoader = ({ isLoading, children }) => {
  if (isLoading) {
    return <GlobalLoader fullScreen={false} />;
  }
  return children;
};
```

### Loading em Rotas

```tsx
// Em App.tsx ou roteador
const ProtectedRoute = ({ component: Component, ...rest }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth().finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <GlobalLoader message="Verificando autenticação" />;
  }

  return <Component {...rest} />;
};
```

## 🚨 Boas Práticas

1. **Sempre esconda o loader**: Use try/finally para garantir
2. **Mensagens contextuais**: Informe o que está acontecendo
3. **Evite loaders muito curtos**: Mínimo 500ms para evitar flicker
4. **Use o hook em componentes**: Mais limpo que manipular DOM
5. **GlobalLoader para operações assíncronas**: APIs, uploads, etc.

## 🐛 Troubleshooting

### Loader não aparece
- Verifique se o tema está configurado
- Confirme que o container não foi removido prematuramente

### Loader não desaparece
- Certifique-se de chamar hideLoader() no finally
- Verifique se não há múltiplas instâncias

### Tema incorreto
- O tema é lido do localStorage na key 'theme'
- Valores aceitos: 'light' ou 'dark'