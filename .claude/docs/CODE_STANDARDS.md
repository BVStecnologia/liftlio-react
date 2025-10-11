# Padrões de Código e Arquitetura

## 📋 Padrões Gerais
- **TypeScript**: Tipos explícitos (evitar `any`, preferir `unknown`)
- **React**: Functional components com hooks
- **Styled Components**: Usar `GlobalThemeSystem.ts` para cores/estilos
- **Imports**: Organizar (React → libs → local → types)
- **Comentários**: Só quando lógica não é óbvia
- **Naming**: camelCase (JS/TS), kebab-case (arquivos), UPPER_SNAKE (env vars)

## Arquitetura

### Frontend (React + TypeScript)
```
liftlio-react/
├── src/
│   ├── components/         # Componentes reutilizáveis
│   │   ├── FloatingAgent.tsx  # Assistente AI flutuante
│   │   └── ui/                # Componentes UI base
│   ├── pages/              # Rotas principais (lazy loaded)
│   ├── context/            # Context providers
│   │   ├── AuthContext.tsx    # OAuth Google
│   │   ├── ThemeContext.tsx   # Tema claro/escuro
│   │   ├── LanguageContext.tsx # PT/EN
│   │   └── ProjectContext.tsx  # Gestão de projetos
│   ├── styles/
│   │   └── GlobalThemeSystem.ts # Sistema unificado de temas
│   └── lib/
│       ├── supabaseClient.ts  # Cliente Supabase
│       └── posthog.tsx         # Analytics
```

## Dependências Principais
- React 19.0.0
- TypeScript 4.9.5
- @supabase/supabase-js 2.49.1
- styled-components 6.1.15
- framer-motion 12.16.0
- react-router-dom 7.2.0
- recharts 2.15.1
- posthog-js 1.258.5

## UI Libraries Instaladas

### Tooltips (react-tooltip)
- **Instalação**: `npm install react-tooltip --legacy-peer-deps`
- **Import**: `import { Tooltip as ReactTooltip } from 'react-tooltip'`
- **CSS**: `import 'react-tooltip/dist/react-tooltip.css'`
- **Exemplo de uso**: Ver `/src/pages/Overview.tsx` linhas 3179-3210
- **Suporte a tema**: Sim (inline styles com theme.colors)
- **Docs**: https://react-tooltip.com/docs/getting-started
- **Instalado em**: 07/10/2025

**Padrão de uso com tema:**
```typescript
<span data-tooltip-id="my-tooltip">
  Hover me
</span>
<ReactTooltip
  id="my-tooltip"
  place="top"
  style={{
    backgroundColor: theme.colors.background,
    color: theme.colors.text.primary,
    border: `1px solid ${theme.colors.borderLight}`,
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '13px',
    maxWidth: '250px',
    zIndex: 9999
  }}
>
  Tooltip content here
</ReactTooltip>
```

## Sistema de Agente AI (v68)
**Localização**: `/liftlio-react/AGENTE_LIFTLIO/`
- **Edge Function**: `agente-liftlio` (linguagem natural, sem gatilhos)
- **Sistema RAG**: Embeddings OpenAI em 14 tabelas
- **Modelo Claude**: Sempre usar `claude-sonnet-4-20250514`
- **SDK Supabase**: SEMPRE usar `supabase.functions.invoke()`

## LinkedIn Content System
- **Localização Conteúdo**: `/LINKEDIN_CONTENT/` (docs, templates, credentials)
- **Agente**: `.claude/agents/linkedin-content-creator.md` (padrão Claude Code)
- **Credentials**: `LINKEDIN_CONTENT/.credentials/linkedin-api.sh` (GITIGNORED)
- **Dois modos**:
  - **Technical Posts**: Posts técnicos do Valdair (English only)
  - **Marketing Strategy**: Funil de 12 semanas baseado em Curiosity Gap
- **Documentação**: `LINKEDIN_CONTENT/ORGANIZATION.md` (guia completo)
- **Estratégia**: `LINKEDIN_CONTENT/_MASTER_DOCS/LIFTLIO_LINKEDIN_STRATEGY_MASTER.md` (25k palavras)

## Testes e Qualidade
```bash
npm test                    # Jest + React Testing Library
# Não há linter/formatter configurado atualmente
# ESLint config existe mas sem scripts npm
```

## 🐛 DEBUGGING & PERFORMANCE

### Debugging Guidelines
- **Console.log**: Remover antes de commit (exceto logs críticos)
- **React DevTools**: Instalar para debug de renders
- **Network Tab**: Verificar calls API desnecessárias
- **Supabase Logs**: `mcp__supabase__get_logs` para backend issues

### Performance Checklist
- **Lazy Loading**: Usar `React.lazy()` para rotas
- **Memoization**: `useMemo`/`useCallback` em computações pesadas
- **Images**: Otimizar antes de subir (WebP, lazy load)
- **Bundle Size**: Verificar antes de deploy (`npm run build`)
- **React Rendering**: Evitar re-renders desnecessários

### Common Gotchas
- **Supabase RLS**: Sempre testar políticas em diferentes usuários
- **Styled Components**: Theme deve vir de `GlobalThemeSystem`
- **Edge Functions**: Timeout é 60s (otimizar queries longas)
- **Fly.io**: Cold start ~3-5s (considerar warm-up)

## Comandos Essenciais

```bash
# Desenvolvimento
cd liftlio-react
npm install --legacy-peer-deps  # Necessário devido a conflitos de peer deps
npm start                        # Inicia em localhost:3000
npm run build                    # Build de produção
npm test                         # Executa testes

# Git (sempre verificar senhas antes)
git add .
git commit -m "descrição"
git push
```

## Documentação Adicional
- `/liftlio-react/project-docs/` - Documentação do projeto
- `/liftlio-react/AGENTE_LIFTLIO/5_Documentacao/` - Docs do agente AI
- `/liftlio-react/README.md` - Setup inicial
