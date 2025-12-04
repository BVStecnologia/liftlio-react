# 🔄 Guia de Sincronização Git ↔ Supabase Branches

## 📋 Overview
Sistema automatizado que sincroniza branches do Git com branches do Supabase, eliminando confusão sobre qual ambiente está ativo.

## 🎯 Mapeamento de Branches

| Git Branch | Supabase Branch | Project ID | Indicador Visual |
|------------|-----------------|------------|------------------|
| `dev` | DEV | `cdnzajygbcujwcaoswpi` | 🟢 DEV |
| `main` | MAIN/LIVE | `suqjifkhmekcdflwowiw` | 🔵 MAIN |

## 🚀 Como Usar

### Mudar para DEV
```bash
./switch-branch.sh dev./.claude-images/image_20251122_145315_001.png
npm start
```

### Mudar para MAIN
```bash
./switch-branch.sh main
npm start
```

### Verificar Status Atual
```bash
./switch-branch.sh status
```

## 🔧 O que o Script Faz

1. **Troca a branch do Git** (`git checkout`)
2. **Atualiza symlink do .env** (`.env.development` → `.env.development.{dev|main}`)
3. **Vincula Supabase CLI** ao projeto correto
4. **Mostra confirmação visual** com cores e emojis

## 📁 Estrutura de Arquivos

```
liftlio-react/
├── .env.development.dev     # Configuração para DEV
├── .env.development.main    # Configuração para MAIN
├── .env.development         # Symlink (NÃO editar diretamente!)
├── switch-branch.sh         # Script de automação
└── supabase/                # Pasta Supabase (parte do monorepo)
```

## 🎨 Indicadores Visuais

- **Console**: Log mostra qual Supabase está conectado
- **UI**: Badge colorido no canto superior direito (quando Header estiver visível)
- **Terminal**: Script mostra status com cores

## ⚠️ Importante

- **NUNCA** edite `.env.development` diretamente (é um symlink!)
- **SEMPRE** use o script para trocar branches
- **Arquivos .env.development.{dev|main}** devem ser mantidos em sync entre branches

## 🔍 Troubleshooting

### "Port 3000 already in use"
```bash
lsof -ti:3000 | xargs kill -9
npm start
```

### Symlink não criado
```bash
# Recriar manualmente
rm -f .env.development
ln -s .env.development.dev .env.development  # para DEV
# ou
ln -s .env.development.main .env.development # para MAIN
```

### Verificar qual Supabase está conectado
- Abrir console do navegador
- Procurar por: `🌿 Supabase connected to:`

## 📊 Benefícios

- ✅ Zero confusão sobre qual ambiente está ativo
- ✅ Troca rápida entre ambientes
- ✅ Sincronização automática Git ↔ Supabase
- ✅ Indicadores visuais claros
- ✅ Previne erros de produção

---

**Criado em**: 13/10/2025
**Última atualização**: 13/10/2025