# 🎯 FILTROS ADAPTATIVOS - YouTube Search Engine v4 Liftlio

## 📋 Resumo dos Filtros Aplicados

### ✅ FILTROS ADAPTATIVOS v4 (Todos devem ser atendidos)

| Filtro | Valor Obrigatório | Descrição |
|--------|------------------|-----------|
| **🔴 Inscritos do Canal** | ≥ 1000 | Canal deve ter no mínimo 1000 inscritos |
| **🔴 Comentários** | ≥ 20 | Vídeo deve ter no mínimo 20 comentários |
| **🔴 Duração** | > 60 segundos | Vídeo deve ter mais de 1 minuto |
| **🔴 Data** | Últimos 3 meses | Apenas vídeos dos últimos 90 dias |
| **🔴 IDs Excluídos** | Verificado | Nunca retorna vídeos já processados |
| **🔴 Quantidade** | Máximo 3 | Retorna sempre no máximo 3 vídeos por chamada |

### 📊 SISTEMA DE PONTUAÇÃO (Relevância)

| Critério | Pontos | Descrição |
|----------|--------|-----------|
| **Palavra-chave no título** | +10 | Máxima relevância |
| **Palavra-chave na descrição** | +3 | Relevância média |
| **Vídeo da última semana** | +5 | Conteúdo muito recente |
| **Vídeo do último mês** | +3 | Conteúdo recente |
| **Vídeo dos últimos 3 meses** | +1 | Conteúdo atual |
| **Engajamento > 5%** | +3 | Alto engajamento |
| **Engajamento > 2%** | +1 | Bom engajamento |
| **Comentários > 100** | +2 | Muito comentado |
| **Comentários > 50** | +1 | Bem comentado |

## 🔄 Fluxo de Filtragem

```
1. BUSCA NO YOUTUBE
   ├── Query com palavra-chave exata
   ├── Últimos 3 meses
   ├── Máximo 15 vídeos por query
   └── Exclui IDs já processados

2. FILTROS OBRIGATÓRIOS
   ├── ❌ Menos de 20 comentários → REJEITA
   ├── ❌ Menos de 1 minuto → REJEITA
   ├── ❌ Canal < 1000 inscritos → REJEITA
   └── ✅ Passou em todos → CONTINUA

3. CÁLCULO DE RELEVÂNCIA
   ├── Pontuação por palavra-chave
   ├── Bônus por data recente
   ├── Bônus por engajamento
   └── Bônus por comentários

4. SELEÇÃO FINAL
   ├── Ordena por relevância
   ├── Prioriza mais recentes
   └── RETORNA OS 3 MELHORES
```

## 🚀 Estratégias de Busca

### 1. **Estratégia Específica** (Claude AI)
- Gera 5 queries inteligentes
- Progressão: específico → genérico
- Inclui termos de intenção de compra

### 2. **Estratégia Fallback** (Se Claude falhar)
- Queries básicas com palavra-chave
- Adiciona termos como "review", "tutorial"

### 3. **Estratégia Genérica** (Poucos resultados)
- Busca por categoria relacionada
- Termos mais amplos do nicho

## 📈 Exemplos de Filtros em Ação

### Exemplo 1: Scanner "Combatente Shamo"
```
Busca inicial: 55 vídeos encontrados
├── Filtro comentários: 35 passaram (20 rejeitados)
├── Filtro duração: 28 passaram (7 shorts rejeitados)
├── Filtro inscritos: 12 passaram (16 canais pequenos rejeitados)
└── Resultado final: 3 melhores vídeos retornados
```

### Exemplo 2: Vídeo Rejeitado
```
Título: "Shamo em 30 segundos"
❌ Duração: 30s < 60s (REJEITADO)
❌ Comentários: 5 < 20 (REJEITADO)
❌ Canal: 500 inscritos < 1000 (REJEITADO)
```

### Exemplo 3: Vídeo Aprovado
```
Título: "Review Completo Combatente Shamo 2024"
✅ Duração: 8 minutos
✅ Comentários: 145
✅ Canal: 25.000 inscritos
✅ Relevância: Score 18 (título + recente + engajamento)
✅ SELECIONADO (1º lugar)
```

## 🎯 Comparação: v3 vs v4

| Aspecto | v3 (Anterior) | v4 (Atual) |
|---------|--------------|------------|
| **Contexto** | Só palavra-chave | Descrição completa do projeto |
| **Geração queries** | Claude simples | Claude com contexto semântico |
| **Filtros** | Rígidos (1000/20) | Inteligentes (1000/20) |
| **Análise final** | Score algorítmico | Claude analisa comentários |
| **Comentários** | Não considerados | Top 100 analisados |
| **Precisão** | ~60% relevância | ~85% relevância |
| **Fallback** | Básico | Multi-estratégia |

## ⚙️ Configuração dos Filtros

```python
# Filtros obrigatórios v4
MIN_SUBSCRIBERS = 1000  # Inscritos no canal
MIN_COMMENTS = 20       # Comentários no vídeo
MIN_DURATION = 60       # Segundos
MAX_RESULTS = 3         # Vídeos retornados
DATE_FILTER = "últimos 3 meses"

# Sistema de pontuação
SCORE_TITLE = 10        # Palavra no título
SCORE_DESC = 3          # Palavra na descrição
SCORE_WEEK = 5          # Última semana
SCORE_MONTH = 3         # Último mês
SCORE_3MONTHS = 1       # Últimos 3 meses
```

## 📝 Notas Importantes

1. **Qualidade sobre Quantidade**: Melhor retornar 1 vídeo excelente do que 3 medianos
2. **Vídeos Recentes**: Prioridade para conteúdo novo (algoritmo do YouTube favorece)
3. **Canais Estabelecidos**: 1000+ inscritos garante criadores sérios
4. **Engajamento Real**: 20+ comentários indica conteúdo que gera discussão
5. **Sem Duplicatas**: IDs excluídos garantem conteúdo sempre novo

## 🔗 Integração com Supabase

```sql
-- Função SQL chama Edge Function
-- Edge Function chama nosso Python API
-- Python API retorna máximo 3 IDs
-- IDs são salvos em "ID cache videos"
-- Campo "rodada" é limpo
-- IDs excluídos são enviados na próxima chamada
```

---

**Última atualização**: 23/08/2025
**Versão**: 4.0 (Filtros Adaptativos com Análise Semântica)
**Modelo AI**: Claude Sonnet 3.5 (outubro 2024)