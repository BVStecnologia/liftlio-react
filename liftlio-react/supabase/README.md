# Supabase Edge Functions

Este diretório contém as Edge Functions do projeto Liftlio, incluindo a função `claude-proxy` que permite interagir com a API do Claude da Anthropic.

## Testando as Edge Functions

Dois scripts de teste estão disponíveis:

### 1. Teste com cliente Supabase

```bash
node functions/test-edge-function.js
```

Este script testa a invocação da função `claude-proxy` utilizando o cliente Supabase, demonstrando como fazer a chamada a partir de componentes React.

### 2. Teste com fetch direto

```bash
node functions/direct-test.js
```

Este script testa a invocação da função `claude-proxy` utilizando fetch direto, o que pode ser útil para debug.

## Uso da Edge Function no React

Um exemplo de componente React que utiliza a edge function está disponível em `functions/exemplo-uso-react.js`. Este componente demonstra como criar uma interface de chat simples com o Claude.

## Parâmetros aceitos pela função claude-proxy

A função aceita os seguintes formatos de corpo:

### Formato 1: Prompt

```json
{
  "prompt": "Texto da pergunta para o Claude"
}
```

### Formato 2: Messages

```json
{
  "messages": [
    { "role": "user", "content": "Texto da pergunta para o Claude" }
  ]
}
```

## Resposta da função

A função retorna uma resposta no formato da API Claude, que inclui o texto da resposta, tokens utilizados e outros metadados.

Exemplo:
```json
{
  "id": "msg_01PPJe61gtN2cby7uaniRTLC",
  "type": "message",
  "role": "assistant",
  "model": "claude-3-sonnet-20240229",
  "content": [
    { "type": "text", "text": "Olá! É um prazer conversar com você." }
  ],
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 34,
    "output_tokens": 16
  }
}
```