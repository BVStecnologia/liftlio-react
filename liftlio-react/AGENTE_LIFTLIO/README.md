# 🤖 Agente Liftlio - Documentação Central

## 📍 Status Atual (13/01/2025)

### Sistema de IA integrado ao Liftlio com 3 camadas de inteligência

| Camada | Status | Descrição |
|--------|--------|-----------|
| **1. Claude AI** | ✅ Funcionando | Responde perguntas e navega no sistema |
| **2. RAG System** | ✅ Funcionando | Busca semântica em dados do projeto |
| **3. Suporte Humano** | 📋 Planejado | Sistema de tickets integrado |

## 📁 Estrutura de Diretórios (REORGANIZADA)
```
AGENTE_LIFTLIO/
├── 1_Claude_AI/              # Configuração e prompts do Claude
│   ├── README.md
│   └── prompts/              # System prompts do agente
│
├── 2_RAG_System/             # Sistema de busca semântica
│   ├── README.md
│   ├── documentacao/         # Docs do sistema RAG
│   └── sql_functions/        # Funções SQL do RAG
│
├── 3_Suporte_Humano/         # Sistema de suporte humano (futuro)
│   └── README.md
│
├── 4_Implementacao/          # 🔥 CÓDIGO EM PRODUÇÃO
│   ├── Edge_Functions/
│   │   ├── producao/         # ✅ Versão atual (v17)
│   │   ├── versoes_anteriores/  # Histórico organizado
│   │   └── backups/          # Arquivos .bak
│   ├── SQL_Functions/
│   │   ├── producao/         # Funções SQL ativas
│   │   ├── scripts_completos/# Scripts de setup
│   │   └── monitoramento/    # Funções de métricas
│   └── Frontend/
│       └── FloatingAgent.tsx # Componente React
│
├── 5_Documentacao/           # 📚 TODA DOCUMENTAÇÃO
│   ├── analises/             # Análises técnicas
│   ├── planos/               # Planos de implementação
│   ├── status/               # Status e resumos
│   ├── instrucoes/           # Guias e instruções
│   └── [documentos gerais]   # Arquitetura, roadmap, etc
│
├── 6_Testes/                 # 🧪 Queries e testes
│   └── test_queries.md
│
├── 7_Monitoramento/          # 📊 Métricas e logs
│   └── metricas.md
│
└── README.md                 # Este arquivo
```

## 🚀 Quick Start

### Para usar o agente atual:
```javascript
// No seu componente React
import FloatingAgent from './components/FloatingAgent';

// Adicionar ao layout
<FloatingAgent />
```

### Endpoint da API:
```
POST https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/agente-liftlio
```

## ✅ Versão em Produção
- **Versão**: v17 (RAG Otimizado)
- **Edge Function**: `agente-liftlio_v17_rag_otimizado.ts`
- **Status**: Implementado e funcionando
- **Features**:
  - ✅ Chat com Claude Opus
  - ✅ Sistema RAG com busca semântica
  - ✅ Memória persistente de conversas
  - ✅ Acesso isolado por projeto
  - ✅ Processamento automático de embeddings

## 📊 Métricas Atuais
- **Modelo**: Claude Opus 4
- **Tabelas RAG**: 14 configuradas
- **Tempo resposta médio**: ~2-3 segundos
- **Cobertura RAG**: Monitoramento ativo

## 🚀 Acesso Rápido

### Código em Produção
- [Edge Function v17](./4_Implementacao/Edge_Functions/producao/agente-liftlio_v17_rag_otimizado.ts)
- [Componente Frontend](./4_Implementacao/Frontend/FloatingAgent.tsx)
- [Funções SQL Principais](./4_Implementacao/SQL_Functions/producao/)

### Documentação Principal
- [Arquitetura do Sistema](./5_Documentacao/ARQUITETURA.md)
- [Status da v17](./5_Documentacao/status/STATUS_FINAL_V17_PRONTA.md)
- [Instruções de Deploy](./5_Documentacao/instrucoes/DEPLOY_V17_INSTRUCOES.md)
- [🚨 LIMITAÇÕES DO MCP](./5_Documentacao/LIMITACOES_MCP_SUPABASE.md)
- [Roadmap](./5_Documentacao/ROADMAP.md)

### Sistemas Específicos
- [Sistema RAG](./2_RAG_System/README.md)
- [Claude AI Config](./1_Claude_AI/README.md)
- [Métricas](./7_Monitoramento/metricas.md)

## 🛠️ Desenvolvimento

### ⚠️ REGRA CRÍTICA - OBRIGATÓRIO

**TODA função criada/editada/deletada via MCP DEVE ser salva em:**
```
/Users/valdair/Documents/Projetos/Liftlio/liftlio-react/supabase/Funcoes criadas MCP/
├── SQL_Functions/     → Funções SQL (.sql)
├── Edge_Functions/    → Edge Functions (.ts.bak)
└── INDICE_COMPLETO.md → Atualizar sempre!
```

### Para trabalhar no agente:
1. **Código atual**: Sempre em `/4_Implementacao/*/producao/`
2. **Modificações**: Fazer backup antes de alterar
3. **Documentação**: Atualizar status após mudanças
4. **Testes**: Usar queries em `/6_Testes/`
5. **MCP**: Sempre salvar cópia na pasta MCP

## 📝 Convenções
- **Edge Functions**: Use sufixo descritivo (ex: `_rag_otimizado`)
- **SQL Functions**: Nome claro da funcionalidade
- **Documentação**: Sempre atualizar após mudanças
- **Versionamento**: Manter histórico em `versoes_anteriores`

---

*Última atualização: 13/01/2025*