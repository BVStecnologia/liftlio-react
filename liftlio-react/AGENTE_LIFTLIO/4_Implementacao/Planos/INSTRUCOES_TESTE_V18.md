# 🧪 INSTRUÇÕES PARA TESTAR v18 - DEBUG RAG

## ✅ Status Atual
- **v18 deployed com sucesso** - versão 25 no Supabase
- **Logs detalhados ativos** - 32 pontos de debug
- **Multi-threshold implementado** - 0.7, 0.5, 0.3, 0.1
- **Fallback por palavras-chave** - se embedding falhar
- **Otimização de prompt melhorada** - adiciona contexto temporal

## 📋 Como Testar

### 1. Obter ANON KEY do Supabase
```bash
# Entre no Supabase Dashboard
# Settings > API > anon key (public)
```

### 2. Executar Script de Teste
```bash
cd /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/AGENTE_LIFTLIO/4_Implementacao/Scripts/

# Tornar executável (já feito)
# chmod +x teste_rag_v18_completo.sh

# Executar
./teste_rag_v17_completo.sh

# Digite a ANON KEY quando solicitado
```

### 3. Testes que Serão Executados
1. **"como estão as menções postadas hoje?"** - Deve encontrar postagem das 14:11
2. **"o que foi postado às 14:11?"** - Busca específica por horário
3. **"POSTAGEM REALIZADA"** - Busca por texto exato
4. **"listar postagens de 13 de julho de 2025"** - Busca por data
5. **"quais menções falam sobre Humanlike Writer?"** - Busca por produto
6. **"postagem sobre earnings breakdown at 15:30"** - Busca muito específica

### 4. O que Observar no Output

#### ✅ Sucesso RAG:
```json
{
  "hasRAGData": true,
  "debug": {
    "version": "v18-debug-completo",
    "ragResultsCount": 10,
    "ragDebugInfo": {
      "searched": true,
      "resultsCount": 10,
      "threshold": 0.7
    }
  }
}
```

#### ❌ Falha RAG:
```json
{
  "hasRAGData": false,
  "debug": {
    "ragResultsCount": 0,
    "ragDebugInfo": {
      "error": "mensagem de erro"
    }
  }
}
```

### 5. Verificar Logs do Servidor

Após executar os testes, verificar os logs detalhados:

```sql
-- No Supabase SQL Editor
-- Ver logs das Edge Functions recentes
SELECT *
FROM edge_logs
WHERE function_name = 'agente-liftlio'
AND created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
```

## 🔍 Análise dos Resultados

### Se RAG Funcionar:
- Deve retornar dados sobre postagem das 14:11
- Conteúdo: "The earnings breakdown at 15:30..."
- Relacionado ao vídeo ID 27829

### Se RAG Falhar:
Verificar nos logs:
1. **Embedding gerado?** - Log 10
2. **Threshold tentados?** - Log 14-18
3. **Fallback ativado?** - Log 19-25
4. **Resultados finais?** - Log 30-32

## 📊 Próximos Passos

### Se Funcionar:
1. Remover logs de debug
2. Otimizar thresholds baseado nos resultados
3. Implementar cache de embeddings

### Se Não Funcionar:
1. Analisar qual etapa falhou
2. Verificar se embeddings estão sendo gerados corretamente
3. Testar função search_project_rag diretamente
4. Verificar se há dados para o projeto 58

## 🆘 Comandos Úteis

```bash
# Ver resposta completa com jq
curl ... | jq '.'

# Ver apenas debug info
curl ... | jq '.debug'

# Ver apenas se tem RAG
curl ... | jq '.hasRAGData'

# Salvar resultado em arquivo
curl ... > resultado_teste_1.json
```

## 📝 Template de Relatório

Após executar os testes, preencher:

```markdown
## Relatório de Testes v18

**Data**: 13/07/2025
**Hora**: XX:XX
**Versão**: 25

### Resultados:
- [ ] Teste 1: Menções hoje - RAG: SIM/NÃO
- [ ] Teste 2: Horário 14:11 - RAG: SIM/NÃO
- [ ] Teste 3: Texto exato - RAG: SIM/NÃO
- [ ] Teste 4: Data específica - RAG: SIM/NÃO
- [ ] Teste 5: Humanlike Writer - RAG: SIM/NÃO
- [ ] Teste 6: Earnings breakdown - RAG: SIM/NÃO

### Observações:
- Threshold mais usado: ___
- Fallback ativado: SIM/NÃO
- Tempo médio resposta: ___ ms

### Conclusão:
[x] RAG funcionando corretamente
[ ] RAG com problemas - investigar: ___
```