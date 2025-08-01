# 📚 Project Documentation - Liftlio

Esta pasta contém toda a documentação técnica do projeto Liftlio, organizada por sistema/funcionalidade.

## 📁 Estrutura dos Documentos

### 🔧 Integrações e Ferramentas
- **[TRELLO.md](./TRELLO.md)** - Integração com Trello via MCP, regras para criar cards épicos
- **[EMAIL_SYSTEM.md](./EMAIL_SYSTEM.md)** - Sistema completo de automação de emails

### 🚀 Sistemas Implementados
- **EMAIL_SYSTEM.md** - Automação de emails com 14 templates
  - Tabelas: email_templates, email_logs
  - Edge Function: email-automation-engine
  - Integração: Gmail MCP

### 📝 Convenções
- Todos os arquivos de documentação ficam nesta pasta
- Exceção: `CLAUDE.md` permanece na raiz do projeto
- Nomenclatura: `SISTEMA_NOME.md` em CAPS
- Sempre incluir data da última atualização

## 🗂️ Índice de Documentos

| Documento | Descrição | Última Atualização |
|-----------|-----------|-------------------|
| TRELLO.md | Guia completo do MCP Trello + regras para cards épicos | 31/07/2025 |
| EMAIL_SYSTEM.md | Sistema de automação de emails com templates | 31/07/2025 |

## 🎯 Como Usar

1. **Antes de implementar**: Consulte a documentação existente
2. **Durante desenvolvimento**: Atualize a documentação conforme necessário
3. **Após implementar**: Crie/atualize o MD correspondente

## 📋 Template para Novos Documentos

```markdown
# NOME_SISTEMA.md - Descrição do Sistema

## 📌 Status Atual (DD/MM/YYYY)

### ✅ O que foi implementado:
- Lista de features/componentes

### 🔧 Como Funciona
- Arquitetura
- Fluxo de dados
- Integrações

### 📝 Como Usar
- Exemplos de código
- Comandos
- APIs

### 🚨 Pontos de Atenção
- Limitações
- Segurança
- Performance

### 📋 Próximos Passos
- [ ] Tarefas pendentes

---
**Última atualização**: DD/MM/YYYY
**Status**: desenvolvimento/produção
```

## 🔗 Links Importantes

- **Projeto Principal**: `/liftlio-react/`
- **Agente AI**: `/liftlio-react/AGENTE_LIFTLIO/`
- **MCP Functions**: `/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/`
- **CLAUDE.md**: `/liftlio-react/CLAUDE.md` (memória do projeto)

---

**Mantenha esta documentação sempre atualizada!** 📚