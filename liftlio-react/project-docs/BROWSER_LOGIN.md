# Browser Login - Guia Simples

> **Atualizado**: 2025-12-17

## Como Funciona

A VPS (173.249.22.2) tem o **Claude Code + Playwright MCP** rodando. Ele e inteligente - entende linguagem natural e executa qualquer tarefa no browser.

**A pagina Computador ja faz isso.** O login do Google/YouTube usa o MESMO sistema.

---

## Fluxo

```
1. Usuario preenche email/senha no modal
2. Frontend envia TASK para VPS (mesmo sistema da pagina Computador)
3. Claude na VPS executa o login no browser
4. Claude retorna resposta formatada
5. Frontend interpreta e atualiza UI
```

---

## Como Enviar Task

Usar o mesmo endpoint que a pagina Computador usa:

```javascript
// POST para /agent/task via Edge Function ou direto
const response = await fetch(agentUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    task: `Faca login no Google com email ${email} e senha ${password}.

           Instrucoes:
           1. Va para accounts.google.com
           2. Digite o email e clique em Proximo
           3. Digite a senha e clique em Proximo
           4. Se pedir 2FA, aguarde

           Responda APENAS com um destes:
           - AGUARDANDO_2FA (se pediu verificacao no telefone)
           - LOGIN_SUCESSO (se logou com sucesso)
           - ERRO: <motivo> (se deu erro)`,
    projectId: currentProject.id
  })
});

// Interpretar resposta
const result = await response.text();

if (result.includes('AGUARDANDO_2FA')) {
  // Mostrar: "Aprove no seu telefone"
} else if (result.includes('LOGIN_SUCESSO')) {
  // Salvar no browser_platforms e mostrar sucesso
} else if (result.includes('ERRO:')) {
  // Mostrar erro
}
```

---

## Formato da Resposta

Voce controla como o Claude responde. Exemplos:

```
// Pedir JSON:
"Responda em JSON: {status: 'success'|'2fa'|'error', message: '...'}"

// Pedir texto simples:
"Responda apenas: OK, 2FA, ou ERRO"

// Pedir detalhado:
"Responda com: STATUS|EMAIL|TIMESTAMP"
```

O Claude e inteligente - ele vai responder exatamente como voce pedir.

---

## Arquivos

| Arquivo | O que faz |
|---------|-----------|
| `LiftlioBrowser.tsx` | Pagina Computador - referencia de como enviar tasks |
| `Integrations.tsx` | Onde fica o modal de login |
| `browser-proxy/index.ts` | Edge Function que roteia para VPS |

---

## Dados de Teste

```
Email:    valdair3d@gmail.com
Senha:    Gabriela2022***
Projeto:  117
```

---

## Principio

**NAO criar endpoints especificos.** O sistema de TASKS ja faz tudo. O Claude na VPS e voce mesmo - mande em linguagem natural e especifique o formato de resposta que precisa.
