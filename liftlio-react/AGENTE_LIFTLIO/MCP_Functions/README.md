# Funções Criadas via MCP

Esta pasta contém todas as funções criadas através do Claude MCP (Model Context Protocol) para o projeto Liftlio.

## 📚 Documentação

- **[MELHORES_PRATICAS_MCP.md](./MELHORES_PRATICAS_MCP.md)** - Guia completo de boas práticas
- **[Edge Functions/README.md](./Edge%20Functions/README.md)** - Sobre as Edge Functions
- **[SQL Functions/](./SQL%20Functions/)** - Funções SQL organizadas

## 📁 Estrutura

```
Funcoes criadas MCP/
├── Edge Functions/      # Funções Deno/Supabase (TypeScript)
│   └── *.ts            # Arquivos de referência/backup
└── SQL Functions/       # Funções PostgreSQL
    └── *.sql           # Scripts SQL prontos para executar
```

## 🚀 Edge Functions

Funções serverless que rodam no Supabase Edge Runtime (Deno).

### Funções disponíveis:
- **agente-liftlio**: Assistente AI integrado com Claude
- **process-rag-embeddings**: Processamento de embeddings com OpenAI
- **search-rag**: Busca semântica nos embeddings

### Como deployar:
```bash
supabase functions deploy nome-da-funcao
```

## 🗄️ SQL Functions

Funções PostgreSQL para operações no banco de dados.

### Funções disponíveis:
- **search_rag_embeddings**: Busca semântica básica
- **search_rag_embeddings_filtered**: Busca com filtro de tabelas
- **idx_rag_embeddings_vector**: Índice HNSW para performance

### Como executar:
1. Abrir o SQL Editor no Supabase
2. Copiar o conteúdo do arquivo `.sql`
3. Executar

**Dica**: Use `00_script_completo_*.sql` para executar todas as funções relacionadas de uma vez.

## 📝 Convenções de Nomenclatura

### Edge Functions:
```
nome-da-funcao_descricao_em_portugues.ts
```

### SQL Functions:
```
nome_da_funcao_descricao_em_portugues.sql
```

## ⚠️ Importante

1. **Estes arquivos são backups/referências**
   - As funções reais estão rodando no Supabase
   - Use estes arquivos para referência ou re-deploy

2. **Sempre atualizar aqui quando modificar no Supabase**
   - Manter sincronizado para não perder código
   - Documentar mudanças importantes

3. **Erros no VSCode são normais**
   - Edge Functions usam imports do Deno
   - Ver README.md dentro da pasta Edge Functions

## 🔧 Manutenção

Quando criar ou modificar funções:
1. Sempre salvar uma cópia aqui
2. Usar nomenclatura padrão
3. Incluir documentação no código
4. Adicionar exemplos de uso

---

*Criado e mantido via Claude MCP*