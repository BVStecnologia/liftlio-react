# 🧪 Queries de Teste para o Agente Liftlio

## 1. Testes da Camada Claude AI

### Navegação
```
"Me leve para o dashboard"
"Quero ver meus vídeos monitorados"
"Abrir configurações"
"Ir para menções"
```

### Perguntas sobre o sistema
```
"O que é o Liftlio?"
"Como funciona o monitoramento de vídeos?"
"Quais são os planos disponíveis?"
"Como integro com o YouTube?"
```

### Suporte básico
```
"Estou com problema para fazer login"
"Não consigo ver meus vídeos"
"Como cancelo minha assinatura?"
"Preciso de ajuda"
```

## 2. Testes da Camada RAG (quando implementada)

### Busca por conteúdo específico
```
"O que dizem sobre meu produto nos comentários?"
"Qual é o sentimento geral sobre minha marca?"
"Mostre os vídeos mais populares"
"Quais menções tiveram sentimento negativo?"
```

### Consultas de dados do projeto
```
"Quantos vídeos estou monitorando?"
"Qual meu limite de vídeos?"
"Quando foi minha última análise?"
"Mostre estatísticas do projeto X"
```

### Histórico e contexto
```
"O que conversamos ontem?"
"Lembra do problema que relatei?"
"Continue nossa conversa anterior"
"Você disse algo sobre integrações antes"
```

## 3. Testes de Fallback para Suporte Humano

### Situações que devem acionar suporte
```
"Bug crítico: não consigo acessar nada"
"Preciso falar com um humano"
"Isso é muito complexo para você resolver"
"Tenho um problema de cobrança"
```

### Criação de tickets
```
"Criar ticket de suporte"
"Reportar um bug"
"Preciso de ajuda especializada"
"Escalar para suporte técnico"
```

## 4. Testes de Edge Cases

### Comandos ambíguos
```
"dashboard" (sem contexto)
"ir" (sem destino)
"ajuda" (muito genérico)
"..." (entrada vazia ou inválida)
```

### Múltiplas intenções
```
"Me leve ao dashboard e mostre meus vídeos"
"Quero cancelar e falar com suporte"
"Navegue para settings e explique os planos"
```

### Entradas problemáticas
```
Texto muito longo (>1000 caracteres)
Caracteres especiais: @#$%^&*()
Emojis: 😀🤖💬
SQL Injection: "'; DROP TABLE users; --"
```

## 5. Testes de Performance

### Consultas rápidas
```
"oi"
"sim"
"não"
"ok"
```

### Consultas complexas
```
"Explique detalhadamente como funciona o sistema de análise de sentimentos do Liftlio, incluindo as tecnologias usadas, a precisão esperada e como posso interpretar os resultados no dashboard"
```

### Consultas sequenciais
```
1. "O que é o Liftlio?"
2. "Como funciona?"
3. "E o monitoramento?"
4. "Entendi, me leve lá"
```

## 6. Testes de Contexto

### Com projeto selecionado
```
"Mostre dados deste projeto"
"Quantos vídeos tem aqui?"
"Análise de sentimentos atual"
```

### Sem projeto selecionado
```
"Mostre meus projetos"
"Criar novo projeto"
"Selecionar projeto X"
```

### Mudança de contexto
```
Na página /monitoring: "Onde estou?"
Na página /settings: "Voltar para onde estava"
Após navegação: "O que tem nesta página?"
```

## 7. Validação de Respostas

### Respostas esperadas para navegação
```json
{
  "content": "Levando você para o dashboard...",
  "action": "navigate",
  "data": { "path": "/dashboard" }
}
```

### Respostas esperadas para erro
```json
{
  "content": "Não consegui processar sua solicitação. Gostaria de falar com nosso suporte?",
  "action": "offer_support"
}
```

### Respostas esperadas para informação
```json
{
  "content": "O Liftlio é uma plataforma de monitoramento..."
}
```

## 8. Métricas a Observar

### Performance
- Tempo de resposta < 3s
- Taxa de sucesso > 95%
- Uso de tokens < 2000 por request

### Qualidade
- Relevância da resposta
- Ações corretas executadas
- Fallback apropriado

### UX
- Clareza das mensagens
- Tom apropriado
- Formatação correta

---

*Use estas queries para testar completamente o sistema do agente*