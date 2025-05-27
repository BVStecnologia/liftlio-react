# Guia de Personalização do Dashboard

## 📍 Arquivo Principal
`src/styles/dashboardTheme.ts`

## 🎨 Como Editar as Cores

### 1. Cores Principais
```typescript
// Tema Claro
layout: {
  mainBg: '#F8F9FA',      // Fundo principal da página
  containerBg: '#FFFFFF',  // Fundo dos containers
}

// Tema Escuro
layout: {
  mainBg: '#0A0A0A',      // Fundo principal (preto profundo)
  containerBg: '#141414',  // Fundo dos containers
}
```

### 2. Tabela
```typescript
table: {
  headerBg: '#F5F7FA',    // Fundo do cabeçalho
  rowBg: '#FFFFFF',       // Fundo das linhas
  rowHoverBg: 'rgba(...)', // Hover das linhas
}
```

### 3. Cards de Comentário e Resposta
```typescript
cards: {
  comment: {
    bg: '#F5F7FA',        // Fundo do card de comentário
    borderLeft: '#2d3e50', // Borda lateral colorida
  },
  response: {
    bg: '#F8F9FA',        // Fundo do card de resposta
    borderLeftScheduled: '#FFAA15', // Laranja para agendado
    borderLeftPublished: '#4CAF50', // Verde para publicado
  }
}
```

### 4. Badges (SCHEDULED, BRAND, QUALITY)
```typescript
badges: {
  scheduled: {
    bg: 'rgba(255, 170, 21, 0.12)', // Fundo laranja transparente
    text: '#F57C00',                 // Texto laranja
    border: 'rgba(255, 170, 21, 0.3)' // Borda laranja
  },
  brand: {
    bg: 'rgba(33, 150, 243, 0.12)',  // Fundo azul transparente
    text: '#1976D2',                  // Texto azul
  },
  quality: {
    bg: 'rgba(156, 39, 176, 0.12)',  // Fundo roxo transparente
    text: '#7B1FA2',                  // Texto roxo
  }
}
```

### 5. Tabs (Scheduled, Posted, Favorites)
```typescript
tabs: {
  containerBg: '#F0F2F5',    // Fundo do container
  activeBg: '#FFFFFF',       // Tab ativa
  activeText: '#2d3e50',     // Texto da tab ativa
  inactiveText: '#666666',   // Texto das tabs inativas
}
```

## 🔧 Exemplos de Customização

### Mudar cor principal do tema escuro
```typescript
// Em darkTheme
accent: {
  primary: '#00F5FF', // Mude para a cor desejada
}
```

### Ajustar transparências
```typescript
// Para cards mais transparentes no tema escuro
cards: {
  comment: {
    bg: 'rgba(255, 255, 255, 0.03)', // Diminua o valor (0.03 = 3%)
  }
}
```

### Mudar bordas e sombras
```typescript
shadows: {
  small: '0 1px 3px rgba(0, 0, 0, 0.06)',  // Sombra sutil
  medium: '0 2px 8px rgba(0, 0, 0, 0.08)', // Sombra média
  large: '0 4px 12px rgba(0, 0, 0, 0.1)',  // Sombra forte
}
```

## 📝 Dicas

1. **Sempre teste em ambos os temas** (claro e escuro)
2. **Use transparências** para elementos sobrepostos
3. **Mantenha contraste adequado** entre texto e fundo
4. **Siga o padrão de cores** já estabelecido

## 🚀 Aplicação Automática

Após editar o arquivo `dashboardTheme.ts`, as mudanças são aplicadas automaticamente em toda a aplicação!