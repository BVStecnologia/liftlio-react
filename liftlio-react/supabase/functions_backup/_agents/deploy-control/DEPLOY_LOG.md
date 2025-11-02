# 📋 DEPLOY LOG - Controle de Mudanças Local → LIVE

## 🎯 Como Usar Este Sistema

### Workflow:
1. **Desenvolver LOCAL** → Função é adicionada em "🟡 PENDING DEPLOY"
2. **Testar LOCAL** → Marcar como "✅ TESTED"
3. **Deploy no LIVE** → Mover para "🟢 DEPLOYED TO LIVE"
4. **Git commit** → Limpar seção DEPLOYED

---

## 🟡 PENDING DEPLOY (Aguardando Deploy no LIVE)

| Data | Função | Tipo | Testado | Arquivo | Notas |
|------|--------|------|---------|---------|-------|
| <!-- Exemplo: 2025-01-26 | agendar_postagens_diarias | SQL | ✅ | SQL_Functions/PIPELINE_PROCESSOS/STATUS_6_POSTAGENS/agendar_postagens_diarias.sql | Fix: column case sensitivity --> |

---

## 🔄 IN TESTING (Em Teste Local)

| Data | Função | Tipo | Status | Arquivo | Próximos Passos |
|------|--------|------|--------|---------|-----------------|
| <!-- Funções sendo testadas localmente --> |

---

## 🟢 DEPLOYED TO LIVE (Já Deployado)

| Data Deploy | Função | Tipo | Arquivo | Deploy Method | Verificado |
|-------------|--------|------|---------|---------------|------------|
| <!-- Histórico de deploys bem-sucedidos --> |

---

## ❌ ROLLBACK NEEDED (Problemas Encontrados)

| Data | Função | Problema | Ação Necessária |
|------|--------|----------|-----------------|
| <!-- Funções com problemas que precisam rollback --> |

---

## 📝 Notas de Deploy

### Checklist Antes do Deploy:
- [ ] Função testada localmente com dados reais
- [ ] Arquivo .test.sql executado com sucesso
- [ ] BEGIN/ROLLBACK testado
- [ ] Sem erros nos logs locais
- [ ] DROP IF EXISTS incluído
- [ ] Documentação atualizada
- [ ] Git commit local

### Comando para Deploy:
```bash
# Via agente supabase-mcp-expert
Task → supabase-mcp-expert → "Deploy função X no LIVE"

# Ou manualmente via Dashboard
```

---

## 📊 Estatísticas

- **Total Pending**: 0
- **Total Deployed**: 0
- **Última Atualização**: 2025-01-26