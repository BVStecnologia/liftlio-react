# 🔧 Reorganização Monorepo - Progress Tracking
**Data Início**: 13/10/2025 - 19:02
**Status**: 🟡 Em Progresso

## 📋 Contexto
Reorganizando projeto Liftlio para estrutura monorepo com branches sincronizadas entre Git e Supabase.

### Branches Mapping:
- Git `dev` → Supabase DEV (`cdnzajygbcujwcaoswpi`)
- Git `main` → Supabase MAIN (`suqjifkhmekcdflwowiw`)

## ✅ Checklist de Tarefas

### Fase 1: Preparação
- [ ] Fazer backup e commit de alterações pendentes
  - Status: PENDENTE
  - Comando: `git add -A && git commit -m "chore: Save pending changes before reorganization"`
  - Backup: `cp -r /Users/valdair/Documents/Projetos/Liftlio/Supabase ~/Desktop/Supabase_backup`

### Fase 2: Reorganização de Estrutura
- [ ] Mover pasta Supabase para dentro de liftlio-react
  - Status: PENDENTE
  - De: `/Users/valdair/Documents/Projetos/Liftlio/Supabase`
  - Para: `/Users/valdair/Documents/Projetos/Liftlio/liftlio-react/supabase`

### Fase 3: Configuração Supabase CLI
- [ ] Instalar Supabase CLI (se necessário)
  - Comando: `npm install -g supabase`
- [ ] Criar config.toml na pasta supabase
- [ ] Configurar supabase/.env.local com secrets

### Fase 4: Configuração de Ambientes
- [ ] Criar .env.development.dev (apontando para DEV)
  ```
  REACT_APP_SUPABASE_URL=https://cdnzajygbcujwcaoswpi.supabase.co
  REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkbnphanlnYmN1andjYW9zd3BpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyOTQ2NzcsImV4cCI6MjA3NTg3MDY3N30.UJi5C9Pl1LKQw-WJ7-JWnIt17PJdDJMtFO0pcJtezdo
  REACT_APP_ENV_INDICATOR=DEV 🟢
  ```

- [ ] Criar .env.development.main (apontando para MAIN)
  ```
  REACT_APP_SUPABASE_URL=https://suqjifkhmekcdflwowiw.supabase.co
  REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I
  REACT_APP_ENV_INDICATOR=MAIN 🔵
  ```

### Fase 5: Configuração Supabase Integration
- [ ] Atualizar lib/supabaseClient.ts para detectar ambiente
  ```typescript
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;
  const envIndicator = process.env.REACT_APP_ENV_INDICATOR;

  console.log(`🌿 Supabase connected to: ${envIndicator} (${supabaseUrl})`);
  ```

- [ ] Criar supabase/config.toml
  ```toml
  [api]
  enabled = true
  port = 54321

  [db]
  port = 54322

  [studio]
  enabled = true
  port = 54323
  ```

### Fase 6: Script de Automação
- [ ] Criar switch-branch.sh
  - Localização: `/Users/valdair/Documents/Projetos/Liftlio/liftlio-react/switch-branch.sh`
  - Tornar executável: `chmod +x switch-branch.sh`

### Fase 7: Git Hooks (Opcional)
- [ ] Criar .git/hooks/post-checkout para auto-switch
  ```bash
  #!/bin/bash
  BRANCH=$(git branch --show-current)
  if [ "$BRANCH" = "dev" ]; then
    rm -f .env.development && ln -s .env.development.dev .env.development
  elif [ "$BRANCH" = "main" ]; then
    rm -f .env.development && ln -s .env.development.main .env.development
  fi
  ```

### Fase 8: Interface Visual
- [ ] Adicionar indicador visual no Header.tsx
  - Badge mostrando DEV 🟢 ou MAIN 🔵
  - Position: fixed, top-right

### Fase 9: Testes
- [ ] Testar branch dev com novo setup
  - `./switch-branch.sh dev`
  - `npm start`
  - Verificar conexão com cdnzajygbcujwcaoswpi

- [ ] Testar branch main com novo setup
  - `./switch-branch.sh main`
  - `npm start`
  - Verificar conexão com suqjifkhmekcdflwowiw

### Fase 10: Documentação
- [ ] Atualizar CLAUDE.md com novas regras
- [ ] Atualizar README.md com instruções de uso
- [ ] Deletar este arquivo após conclusão

## 📝 Notas de Progresso

### 13/10/2025 - 19:02
- Documento criado
- Plano definido com 10 fases
- Aguardando início da execução

### 13/10/2025 - 19:25
- ✅ **Fase 1 COMPLETA**: Backup criado e commit realizado
- ✅ **Fase 2 COMPLETA**: Pasta Supabase movida para dentro de liftlio-react
- ✅ **Fase 3 COMPLETA**: config.toml já existia, verificado
- ✅ **Fase 4 COMPLETA**: Criados .env.development.dev e .env.development.main
- ✅ **Fase 5 COMPLETA**: supabaseClient.ts atualizado com indicador de ambiente
- ✅ **Fase 6 COMPLETA**: switch-branch.sh criado e funcionando
- ✅ **Fase 8 COMPLETA**: Indicador visual adicionado no Header (badge colorido)
- 🔄 **Fase 9 EM ANDAMENTO**: Testando branch dev com novo setup
  - Script switch-branch.sh funcionou perfeitamente
  - Symlink criado: .env.development → .env.development.dev
  - Servidor reiniciado com nova configuração
  - Conectado ao Supabase DEV (cdnzajygbcujwcaoswpi)

---

## ⚠️ Problemas Encontrados
(Será preenchido durante execução)

## 🎯 Próximos Passos
1. Começar pela Fase 1: Backup e commit

---

**IMPORTANTE**: Este documento deve ser atualizado após cada tarefa completada.