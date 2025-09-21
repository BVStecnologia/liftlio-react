# 🚀 Sistema de Versionamento Supabase + GitHub

## Por Que Isso é Importante?

### Para Você (Valdair):
1. **Histórico Completo**: Ver exatamente o que mudou e quando
2. **Rollback Fácil**: Voltar versões antigas se algo quebrar
3. **Backup Automático**: Tudo salvo no GitHub, não só 7 dias no Supabase
4. **Deploy Seguro**: Testar mudanças antes de aplicar em produção

### Para o Claude:
1. **Encontra Tudo via Git**: `git log`, `git diff`, `git show`
2. **Sabe o que Mudou**: Vê exatamente suas alterações recentes
3. **Não Duplica Funções**: Vê todas as funções SQL no repositório
4. **Contexto Completo**: Entende a evolução do banco de dados

## 📁 Estrutura no GitHub

```
liftlio-react/
├── supabase/
│   ├── migrations/          # Todas mudanças do banco
│   │   ├── 20250121_create_tables.sql
│   │   ├── 20250122_add_youtube_integration.sql
│   │   └── 20250123_fix_engagement_function.sql
│   ├── functions/           # Edge Functions (TypeScript)
│   │   ├── agente-liftlio/
│   │   └── process-videos/
│   └── seed.sql           # Dados iniciais
```

## 🔄 Fluxos de Trabalho

### Fluxo 1: Você Cria no Supabase Dashboard
```bash
# 1. Você cria/edita SQL no Dashboard
# 2. Roda o script para baixar mudanças:
./sync-supabase.sh
# Escolhe opção 1 (Pull)

# 3. Commita para GitHub
git add .
git commit -m "feat: nova função de análise"
git push
```

### Fluxo 2: Claude Cria Localmente
```bash
# 1. Claude cria arquivo .sql local
# 2. Aplica no Supabase:
./sync-supabase.sh
# Escolhe opção 2 (Push)

# 3. Já está no GitHub!
```

### Fluxo 3: Integração Automática (Futuro)
```yaml
# GitHub Actions detecta mudanças
# Aplica automaticamente no Supabase
# Você só faz commit!
```

## 🎯 Comandos Que Claude Pode Usar

```bash
# Ver histórico de mudanças no banco
git log --oneline supabase/migrations/

# Ver o que mudou em uma função específica
git diff HEAD~1 supabase/migrations/process_engagement.sql

# Buscar onde uma tabela foi criada
git grep "CREATE TABLE Videos" supabase/

# Ver evolução de uma função
git log -p supabase/migrations/ | grep -A 20 "process_engagement"

# Comparar versões
git diff abc123..def456 supabase/migrations/
```

## 🔍 Como Claude Encontra Coisas

### Antes (Sem GitHub):
```typescript
// Claude tem que usar MCP para listar tudo
await mcp__supabase__execute_sql({
  query: "SELECT proname FROM pg_proc WHERE proname LIKE 'process%'"
})
// Não sabe o que mudou ou quando
```

### Depois (Com GitHub):
```bash
# Claude vê TUDO instantaneamente
ls supabase/migrations/*.sql
grep "FUNCTION process_engagement" supabase/migrations/*
git blame supabase/migrations/latest.sql
```

## ⚡ Setup Rápido

### 1. Obter Token Supabase
```bash
# Acesse: https://supabase.com/dashboard/account/tokens
# Crie um Personal Access Token
# Adicione ao seu ~/.zshrc:
export SUPABASE_ACCESS_TOKEN='seu-token-aqui'
```

### 2. Primeira Sincronização
```bash
# Baixar estado atual do Supabase
npx supabase db pull --project-ref suqjifkhmekcdflwowiw

# Ver o que foi baixado
ls supabase/migrations/

# Commitar tudo
git add supabase/
git commit -m "init: estado inicial do banco Supabase"
git push
```

### 3. Usar o Script de Sync
```bash
# Tornar executável
chmod +x .claude/scripts/sync-supabase.sh

# Usar sempre que fizer mudanças
./sync-supabase.sh
```

## 🎨 Exemplo Prático

### Você cria uma função no Dashboard:
```sql
-- No SQL Editor do Supabase
CREATE OR REPLACE FUNCTION analyze_sentiment(text)
RETURNS jsonb AS $$
  -- sua lógica aqui
$$ LANGUAGE plpgsql;
```

### Sincroniza com GitHub:
```bash
./sync-supabase.sh
# Escolhe 1 (Pull)
# Automaticamente cria: supabase/migrations/20250121123456_analyze_sentiment.sql
```

### Claude vê tudo:
```bash
# Claude agora pode:
cat supabase/migrations/20250121123456_analyze_sentiment.sql
git show HEAD  # Ver último commit
git log --grep="sentiment"  # Achar relacionados
```

## 🔒 Segurança

- **Senhas/Tokens**: NUNCA no repositório, sempre em variáveis de ambiente
- **Migrations**: São incrementais, não destrutivas
- **Rollback**: Sempre crie migrations de reversão
- **Branches**: Use branches do Git para testar mudanças grandes

## 📊 Benefícios Finais

1. **Rastreabilidade**: "Quem mudou o quê e quando"
2. **Colaboração**: Múltiplas pessoas podem trabalhar
3. **CI/CD**: Deploy automático quando commitar
4. **Documentação**: Cada migration é autodocumentada
5. **Busca Rápida**: Claude encontra tudo em segundos

## 🚦 Próximos Passos

1. [ ] Configurar token Supabase
2. [ ] Fazer primeira sincronização
3. [ ] Testar script de sync
4. [ ] Configurar GitHub Actions (opcional)
5. [ ] Documentar funções principais