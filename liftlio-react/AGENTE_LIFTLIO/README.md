# 🤖 AGENTE LIFTLIO - Central de Documentação

## 📍 Status Atual (10/01/2025)

### Sistema de IA integrado ao Liftlio com 3 camadas de inteligência

| Camada | Status | Descrição |
|--------|--------|-----------|
| **1. Claude AI** | ✅ Funcionando | Responde perguntas e navega no sistema |
| **2. RAG System** | 🔄 Em desenvolvimento | Busca semântica em dados do projeto |
| **3. Suporte Humano** | 📋 Planejado | Sistema de tickets integrado |

## 🗂️ Estrutura da Documentação

```
AGENTE_LIFTLIO/
├── README.md                    # Este arquivo
├── ARQUITETURA.md              # Visão técnica completa
├── ROADMAP.md                  # Planejamento e tarefas
├── 1_Claude_AI/                # Camada 1 - IA básica
├── 2_RAG_System/               # Camada 2 - Busca inteligente
├── 3_Suporte_Humano/           # Camada 3 - Tickets
├── Frontend/                   # Componentes React
└── Testes/                     # Testes e validação
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

## 📊 Métricas Atuais

- **Edge Function**: `agente-liftlio` deployada
- **Modelo**: Claude Opus 4
- **Tabelas RAG**: 14 configuradas
- **Registros para processar**: 2.260
- **Tempo resposta médio**: ~2-3 segundos

## 🔗 Links Rápidos

- [Arquitetura Completa](./ARQUITETURA.md)
- [Roadmap e Tarefas](./ROADMAP.md)
- [Claude AI - Detalhes](./1_Claude_AI/README.md)
- [Sistema RAG - Status](./2_RAG_System/README.md)
- [Suporte Humano - Planejamento](./3_Suporte_Humano/README.md)

## 🛠️ Desenvolvimento

### ⚠️ REGRA CRÍTICA - OBRIGATÓRIO

**TODA função criada/editada/deletada via MCP DEVE ser salva em:**
```
AGENTE_LIFTLIO/MCP_Functions/
├── SQL_Functions/     → Funções SQL (.sql)
├── Edge_Functions/    → Edge Functions (.ts.bak)
└── INDICE_COMPLETO.md → Atualizar sempre!
```

### Para contribuir ou modificar o agente:

1. Consulte a documentação da camada específica
2. **SEMPRE salve cópia das funções MCP na pasta**
3. Atualize o INDICE_COMPLETO.md
4. Atualize o status neste README
5. Se criar sistema completo, crie `00_script_completo_nome.sql`

---

*Última atualização: 10/01/2025*