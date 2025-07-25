#!/bin/bash

echo "🚀 ATUALIZANDO MCP GMAIL COM OAUTH2"
echo "===================================="
echo ""

# Salvar o novo servidor localmente
cat > /tmp/mcp-gmail-oauth.js << 'EOF'
const express = require('express');
const { google } = require('googleapis');
const app = express();
app.use(express.json());

// Configuração OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID',
  process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET',
  'http://localhost'
);

// Configurar tokens
oauth2Client.setCredentials({
  access_token: process.env.GOOGLE_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN',
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN || 'YOUR_REFRESH_TOKEN',
  token_type: 'Bearer'
});

// Auto-renovação de token
oauth2Client.on('tokens', (tokens) => {
  console.log('🔄 Token renovado automaticamente!');
  if (tokens.refresh_token) {
    console.log('Novo refresh token:', tokens.refresh_token);
  }
  console.log('Novo access token:', tokens.access_token);
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'MCP Gmail OAuth',
    oauth: 'configured',
    autoRefresh: 'enabled',
    version: '2.0.0'
  });
});

// Enviar email
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;
    
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, text/html' });
    }

    // Criar mensagem
    const message = [
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      html || text
    ].join('\n');

    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    // Enviar
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    res.json({ 
      success: true, 
      messageId: result.data.id,
      message: 'Email enviado com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    res.status(500).json({ 
      error: 'Erro ao enviar email', 
      details: error.message 
    });
  }
});

// MCP endpoint
app.post('/mcp', async (req, res) => {
  const { method, params } = req.body;
  
  try {
    switch(method) {
      case 'send_email':
        const result = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: params.encodedMessage
          }
        });
        res.json({ success: true, messageId: result.data.id });
        break;
        
      case 'get_profile':
        const profile = await gmail.users.getProfile({ userId: 'me' });
        res.json({ success: true, profile: profile.data });
        break;
        
      default:
        res.json({ success: false, error: 'Method not implemented' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 MCP Gmail Server v2.0 (OAuth) rodando na porta ${PORT}`);
  console.log('✅ OAuth2 configurado com auto-renovação de token!');
});
EOF

echo "📤 Enviando arquivo para o servidor..."
scp /tmp/mcp-gmail-oauth.js root@173.249.22.2:/tmp/

echo ""
echo "🔧 Conectando ao servidor para atualizar..."
ssh root@173.249.22.2 << 'REMOTE'
echo "📋 Copiando arquivo para o container..."
docker cp /tmp/mcp-gmail-oauth.js mcp-gmail:/app/server.js

echo "🔄 Reiniciando container..."
docker restart mcp-gmail

echo "⏳ Aguardando 5 segundos..."
sleep 5

echo "✅ Testando novo servidor..."
curl http://localhost:3000/health

echo ""
echo "🧪 Testando perfil OAuth..."
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "get_profile", "params": {}}'
REMOTE

echo ""
echo "✅ PRONTO! Agora teste o envio de email:"
echo ""
echo "curl -X POST http://173.249.22.2:3000/api/send-email \\"
echo '  -H "Content-Type: application/json" \'
echo '  -d '\''{"to": "seu-email@exemplo.com", "subject": "MCP Gmail OAuth Funcionando!", "text": "Email enviado via OAuth2!"}'\'''