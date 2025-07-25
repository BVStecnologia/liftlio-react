#!/bin/bash

echo "🚀 Atualizando MCP Gmail Server..."

# Verificar se existe arquivo .env
if [ ! -f "$(dirname "$0")/.env" ]; then
    echo "❌ ERRO: Arquivo .env não encontrado!"
    echo "📝 Copie o arquivo .env.example para .env e preencha com suas credenciais:"
    echo "   cp $(dirname "$0")/.env.example $(dirname "$0")/.env"
    exit 1
fi

# Carregar variáveis de ambiente
source "$(dirname "$0")/.env"

# Criar um arquivo temporário com o novo código
cat > /tmp/new-server.js << 'EOF'
const express = require('express');
const { google } = require('googleapis');
const app = express();
app.use(express.json());

// Configuração OAuth2
const oauth2Client = new google.auth.OAuth2(
  '${GOOGLE_CLIENT_ID}',
  '${GOOGLE_CLIENT_SECRET}',
  'http://localhost'
);

// Configurar tokens
oauth2Client.setCredentials({
  access_token: '${GOOGLE_ACCESS_TOKEN}',
  refresh_token: '${GOOGLE_REFRESH_TOKEN}',
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
    service: 'MCP Gmail',
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
    
    // Se for erro de token expirado, o oauth2Client vai renovar automaticamente
    if (error.code === 401) {
      res.status(401).json({ 
        error: 'Token expirado - tentando renovar automaticamente',
        details: 'Tente novamente em alguns segundos'
      });
    } else {
      res.status(500).json({ 
        error: 'Erro ao enviar email', 
        details: error.message 
      });
    }
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
  console.log(`🚀 MCP Gmail Server v2.0 rodando na porta ${PORT}`);
  console.log('✅ OAuth2 configurado com auto-renovação de token!');
});
EOF

echo "📝 Novo código criado em /tmp/new-server.js"
echo ""
echo "🔧 Para atualizar o servidor, execute:"
echo ""
echo "1. ssh root@173.249.22.2"
echo "2. docker cp /tmp/new-server.js mcp-gmail:/app/server.js"
echo "3. docker restart mcp-gmail"
echo ""
echo "Ou use scp para copiar o arquivo:"
echo "scp /tmp/new-server.js root@173.249.22.2:/tmp/"
echo "ssh root@173.249.22.2 'docker cp /tmp/new-server.js mcp-gmail:/app/server.js && docker restart mcp-gmail'"