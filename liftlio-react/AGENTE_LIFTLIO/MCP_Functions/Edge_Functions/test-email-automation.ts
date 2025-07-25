// Teste da Edge Function Email Automation Engine

// 1. Teste simples - Email básico
const testSimpleEmail = {
  to: "test@example.com",
  subject: "Teste Email Simples - Liftlio",
  text: "Este é um email de teste simples.",
  html: "<h1>Olá!</h1><p>Este é um email de teste simples.</p>",
  complexity: "simple"
}

// 2. Teste médio - Email com template e variáveis
const testMediumEmail = {
  to: ["user1@example.com", "user2@example.com"],
  subject: "Bem-vindo ao Liftlio, {{userName}}!",
  templateId: "welcome-email-template", // Precisa existir no banco
  variables: {
    userName: "João Silva",
    planName: "Premium",
    activationLink: "https://liftlio.com/activate/123456"
  },
  complexity: "medium"
}

// 3. Teste complexo - Email com ações HTML e anexos
const testComplexEmail = {
  to: "admin@example.com",
  subject: "Relatório Semanal - Liftlio Analytics",
  html: `
    <html>
      <body>
        <h1 class="title">Relatório Semanal</h1>
        <div class="stats">
          <p>Estatísticas aqui</p>
        </div>
        <div class="footer">
          <p>Footer original</p>
        </div>
      </body>
    </html>
  `,
  actions: [
    {
      type: "replace",
      selector: ".stats p",
      content: "<strong>1.234 vídeos analisados esta semana!</strong>"
    },
    {
      type: "addClass",
      selector: ".title",
      value: "text-primary"
    },
    {
      type: "addStyle",
      selector: ".title",
      value: "color: #4A90E2; font-size: 32px;"
    },
    {
      type: "append",
      selector: ".footer",
      content: "<p>Powered by Liftlio AI Engine</p>"
    }
  ],
  attachments: [
    {
      filename: "relatorio.pdf",
      content: "base64_encoded_pdf_content_here",
      encoding: "base64"
    }
  ],
  complexity: "complex"
}

// 4. Teste auto complexidade
const testAutoComplexity = {
  to: "test@liftlio.com",
  subject: "Teste Auto-Detecção de Complexidade",
  html: "<p>Email com detecção automática</p>",
  variables: {
    teste: "valor"
  },
  actions: [
    { type: "addClass", selector: "p", value: "highlight" }
  ],
  complexity: "auto" // Vai detectar como "medium"
}

// Função para testar via curl
console.log(`
# Testar email simples (30s timeout)
curl -X POST https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/email-automation-engine \\
  -H "Authorization: Bearer YOUR_ANON_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(testSimpleEmail, null, 2)}'

# Testar email médio (120s timeout)
curl -X POST https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/email-automation-engine \\
  -H "Authorization: Bearer YOUR_ANON_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(testMediumEmail, null, 2)}'

# Testar email complexo (400s timeout)
curl -X POST https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/email-automation-engine \\
  -H "Authorization: Bearer YOUR_ANON_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(testComplexEmail, null, 2)}'
`);

// Resposta esperada:
// {
//   "success": true,
//   "messageId": "msg_123456",
//   "processingTime": 1234,
//   "htmlModifications": 4
// }