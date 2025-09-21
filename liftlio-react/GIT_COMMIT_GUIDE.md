# 🎯 Guia de Commits - Frontend vs Supabase

## Estrutura Clara no Repositório

```
liftlio-react/
├── src/                    ← FRONTEND (React/TypeScript)
├── public/                 ← FRONTEND (assets)
├── supabase/              ← BACKEND (Banco de dados)
│   ├── migrations/        ← Mudanças no banco
│   └── functions/         ← Edge Functions
└── AGENTE_LIFTLIO/        ← Documentação/Backups
```

## 🏷️ Prefixos de Commit

### Frontend (src/, public/, components/)
```bash
git commit -m "frontend: adicionar componente de analytics"
git commit -m "fix(ui): corrigir layout mobile"
git commit -m "style: atualizar cores do dashboard"
```

### Supabase (supabase/, migrations/, functions/)
```bash
git commit -m "db: criar função process_engagement"
git commit -m "migration: adicionar tabela youtube_integrations"
git commit -m "edge: atualizar função agente-liftlio"
```

### Ambos (mudanças em frontend + backend)
```bash
git commit -m "feat: implementar sistema de notificações (frontend + db)"
```

## 🚀 Comandos Rápidos

### Ver só mudanças do Frontend:
```bash
git status src/ public/
git diff src/
```

### Ver só mudanças do Supabase:
```bash
git status supabase/
git diff supabase/
```

### Commitar só Frontend:
```bash
git add src/ public/
git commit -m "frontend: descrição"
```

### Commitar só Supabase:
```bash
git add supabase/
git commit -m "db: descrição"
```

## 🔄 Workflow Completo

### 1. Você muda algo no Supabase Dashboard:
```bash
# Baixar mudanças
npx supabase db pull

# Ver o que mudou
git diff supabase/

# Commitar
git add supabase/
git commit -m "db: nova função de análise"
git push
```

### 2. Você muda algo no Frontend:
```bash
# Ver mudanças
git diff src/

# Commitar
git add src/
git commit -m "frontend: melhorar performance"
git push
```

## 📊 Como Claude Sabe o Que é o Quê

Claude automaticamente sabe pela estrutura:
- `src/**` = Frontend
- `supabase/**` = Backend/Database
- `AGENTE_LIFTLIO/**` = Documentação

Não precisa explicar toda vez!