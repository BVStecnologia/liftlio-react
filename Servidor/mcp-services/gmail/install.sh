#!/bin/bash

# MCP Gmail Server - Script de Instalação
# Autor: Claude & Valdair
# Data: 24/01/2025

set -e

echo "🚀 MCP Gmail Server - Instalação Automática"
echo "=========================================="

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Variáveis
SERVER_DIR="/home/mcp-gmail-server"
NODE_VERSION="20"
PM2_NAME="mcp-gmail"

# Função para verificar comando
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 já instalado"
        return 0
    else
        echo -e "${YELLOW}!${NC} $1 não encontrado"
        return 1
    fi
}

# 1. Atualizar sistema
echo -e "\n${YELLOW}1. Atualizando sistema...${NC}"
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Instalar Node.js se necessário
echo -e "\n${YELLOW}2. Verificando Node.js...${NC}"
if ! check_command node; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 3. Instalar dependências globais
echo -e "\n${YELLOW}3. Instalando dependências globais...${NC}"
sudo npm install -g pm2 nodemon

# 4. Criar diretório do servidor
echo -e "\n${YELLOW}4. Criando estrutura de diretórios...${NC}"
sudo mkdir -p $SERVER_DIR/{logs,credentials,routes,services,middlewares,templates}
cd $SERVER_DIR

# 5. Criar package.json
echo -e "\n${YELLOW}5. Criando package.json...${NC}"
cat > package.json << 'EOF'
{
  "name": "mcp-gmail-server",
  "version": "1.0.0",
  "description": "Gmail MCP Server with REST API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "pm2:start": "pm2 start server.js --name mcp-gmail",
    "pm2:stop": "pm2 stop mcp-gmail",
    "pm2:logs": "pm2 logs mcp-gmail",
    "docker:build": "docker build -t mcp-gmail .",
    "docker:run": "docker-compose up -d"
  },
  "dependencies": {
    "@gongrzhe/server-gmail-autoauth-mcp": "latest",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "dotenv": "^16.3.1",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "uuid": "^9.0.1",
    "multer": "^1.4.5-lts.1",
    "handlebars": "^4.7.8",
    "googleapis": "^131.0.0",
    "nodemailer": "^6.9.8"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "nodemon": "^3.0.2"
  }
}
EOF

# 6. Instalar dependências
echo -e "\n${YELLOW}6. Instalando dependências do projeto...${NC}"
npm install

# 7. Criar arquivo .env
echo -e "\n${YELLOW}7. Criando arquivo .env...${NC}"
cat > .env << 'EOF'
# Servidor
PORT=3000
NODE_ENV=production

# API Keys
API_KEY=mcp_gmail_$(openssl rand -hex 32)

# Gmail OAuth2 (preencher depois)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
GOOGLE_REFRESH_TOKEN=

# Email padrão
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
DEFAULT_FROM_NAME=Your Company

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logs
LOG_LEVEL=info
LOG_FILE_PATH=./logs/mcp-gmail.log

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
EOF

# 8. Criar servidor principal
echo -e "\n${YELLOW}8. Criando servidor Express...${NC}"
cat > server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const path = require('path');
require('dotenv').config();

// Configurar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: process.env.LOG_FILE_PATH || './logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: process.env.LOG_FILE_PATH || './logs/combined.log' 
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Criar app Express
const app = express();

// Middlewares de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'MCP Gmail Server',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Rotas
app.use('/api', require('./routes/email'));
app.use('/auth', require('./routes/auth'));

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(`MCP Gmail Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
EOF

# 9. Criar middleware de autenticação
echo -e "\n${YELLOW}9. Criando middleware de autenticação...${NC}"
cat > middlewares/auth.js << 'EOF'
const logger = require('winston');

const authenticateAPIKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  if (apiKey !== process.env.API_KEY) {
    logger.warn('Invalid API key attempt', { 
      ip: req.ip, 
      providedKey: apiKey.substring(0, 10) + '...' 
    });
    return res.status(403).json({ error: 'Invalid API key' });
  }
  
  next();
};

module.exports = { authenticateAPIKey };
EOF

# 10. Criar serviço Gmail MCP
echo -e "\n${YELLOW}10. Criando serviço Gmail MCP...${NC}"
cat > services/gmail-mcp.js << 'EOF'
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const handlebars = require('handlebars');

class GmailService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    // Se tiver refresh token, configurar
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
    }
    
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }
  
  // Obter URL de autorização
  getAuthUrl() {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
      ]
    });
  }
  
  // Trocar código por tokens
  async getTokens(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }
  
  // Criar transporter Nodemailer
  async createTransporter() {
    const { token } = await this.oauth2Client.getAccessToken();
    
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        accessToken: token
      }
    });
  }
  
  // Enviar email simples
  async sendEmail({ to, subject, html, text, attachments = [] }) {
    try {
      const transporter = await this.createTransporter();
      
      const mailOptions = {
        from: `${process.env.DEFAULT_FROM_NAME} <${process.env.DEFAULT_FROM_EMAIL}>`,
        to,
        subject,
        text,
        html,
        attachments: attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          encoding: 'base64'
        }))
      };
      
      const result = await transporter.sendMail(mailOptions);
      winston.info('Email sent successfully', { messageId: result.messageId, to });
      
      return {
        success: true,
        messageId: result.messageId,
        response: result.response
      };
    } catch (error) {
      winston.error('Error sending email', { error: error.message, to });
      throw error;
    }
  }
  
  // Enviar email com template
  async sendTemplateEmail({ to, template, variables = {}, attachments = [] }) {
    try {
      // Carregar template
      const templatePath = path.join(__dirname, '..', 'templates', `${template}.hbs`);
      const templateContent = await fs.readFile(templatePath, 'utf8');
      
      // Compilar template
      const compiledTemplate = handlebars.compile(templateContent);
      const html = compiledTemplate(variables);
      
      // Enviar email
      return await this.sendEmail({
        to,
        subject: variables.subject || 'Email from ' + process.env.DEFAULT_FROM_NAME,
        html,
        attachments
      });
    } catch (error) {
      winston.error('Error sending template email', { error: error.message, template });
      throw error;
    }
  }
  
  // Enviar emails em massa
  async sendBulkEmails({ recipients, subject, html, text, batchSize = 50 }) {
    const results = [];
    const batches = [];
    
    // Dividir em lotes
    for (let i = 0; i < recipients.length; i += batchSize) {
      batches.push(recipients.slice(i, i + batchSize));
    }
    
    // Processar cada lote
    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(recipient => 
          this.sendEmail({
            to: recipient.email || recipient,
            subject,
            html: html.replace(/{{name}}/g, recipient.name || ''),
            text: text?.replace(/{{name}}/g, recipient.name || '')
          })
        )
      );
      
      results.push(...batchResults);
      
      // Delay entre lotes para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return {
      total: recipients.length,
      sent: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      results
    };
  }
  
  // Obter quota
  async getQuota() {
    try {
      const response = await this.gmail.users.getProfile({ userId: 'me' });
      return {
        emailAddress: response.data.emailAddress,
        messagesTotal: response.data.messagesTotal,
        threadsTotal: response.data.threadsTotal
      };
    } catch (error) {
      winston.error('Error getting quota', { error: error.message });
      throw error;
    }
  }
}

module.exports = new GmailService();
EOF

# 11. Criar rotas de email
echo -e "\n${YELLOW}11. Criando rotas de API...${NC}"
cat > routes/email.js << 'EOF'
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const joi = require('joi');
const gmailService = require('../services/gmail-mcp');
const { authenticateAPIKey } = require('../middlewares/auth');

// Configurar multer para uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// Validação de schemas
const emailSchema = joi.object({
  to: joi.string().email().required(),
  subject: joi.string().required(),
  html: joi.string(),
  text: joi.string(),
  attachments: joi.array().items(joi.object({
    filename: joi.string().required(),
    content: joi.string().required()
  }))
}).or('html', 'text');

const templateSchema = joi.object({
  to: joi.string().email().required(),
  template: joi.string().required(),
  variables: joi.object(),
  attachments: joi.array()
});

const bulkSchema = joi.object({
  recipients: joi.array().items(
    joi.alternatives().try(
      joi.string().email(),
      joi.object({
        email: joi.string().email().required(),
        name: joi.string()
      })
    )
  ).required(),
  subject: joi.string().required(),
  html: joi.string().required(),
  text: joi.string(),
  batchSize: joi.number().min(1).max(100)
});

// Middleware de autenticação em todas as rotas
router.use(authenticateAPIKey);

// POST /api/send-email
router.post('/send-email', async (req, res) => {
  try {
    const { error, value } = emailSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const result = await gmailService.sendEmail(value);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/send-template
router.post('/send-template', async (req, res) => {
  try {
    const { error, value } = templateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const result = await gmailService.sendTemplateEmail(value);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/send-bulk
router.post('/send-bulk', async (req, res) => {
  try {
    const { error, value } = bulkSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    // Processar em background
    const jobId = uuidv4();
    
    // Iniciar job assíncrono
    gmailService.sendBulkEmails(value).then(result => {
      // Aqui você poderia salvar o resultado em um banco de dados
      console.log(`Bulk job ${jobId} completed:`, result);
    });
    
    res.json({ 
      jobId,
      message: 'Bulk email job started',
      totalRecipients: value.recipients.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/send-email-with-attachment
router.post('/send-email-with-attachment', upload.array('attachments', 5), async (req, res) => {
  try {
    const emailData = JSON.parse(req.body.emailData);
    
    // Adicionar arquivos como attachments
    const attachments = req.files.map(file => ({
      filename: file.originalname,
      content: file.buffer.toString('base64')
    }));
    
    const result = await gmailService.sendEmail({
      ...emailData,
      attachments
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/quota
router.get('/quota', async (req, res) => {
  try {
    const quota = await gmailService.getQuota();
    res.json(quota);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/email-status/:id
router.get('/email-status/:id', async (req, res) => {
  // Aqui você implementaria a busca do status em um banco de dados
  res.json({
    id: req.params.id,
    status: 'sent',
    sentAt: new Date().toISOString()
  });
});

module.exports = router;
EOF

# 12. Criar rotas de autenticação
echo -e "\n${YELLOW}12. Criando rotas de autenticação OAuth2...${NC}"
cat > routes/auth.js << 'EOF'
const express = require('express');
const router = express.Router();
const gmailService = require('../services/gmail-mcp');
const fs = require('fs').promises;
const path = require('path');

// GET /auth/google
router.get('/google', (req, res) => {
  const authUrl = gmailService.getAuthUrl();
  res.redirect(authUrl);
});

// GET /auth/callback
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }
  
  try {
    const tokens = await gmailService.getTokens(code);
    
    // Salvar refresh token no .env
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = await fs.readFile(envPath, 'utf8');
    
    envContent = envContent.replace(
      /GOOGLE_REFRESH_TOKEN=.*/,
      `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`
    );
    
    await fs.writeFile(envPath, envContent);
    
    res.send(`
      <html>
        <body>
          <h1>Authorization successful!</h1>
          <p>Refresh token saved. You can close this window.</p>
          <p>Restart the server for changes to take effect.</p>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
EOF

# 13. Criar templates de exemplo
echo -e "\n${YELLOW}13. Criando templates de email...${NC}"
cat > templates/invoice.hbs << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        .invoice { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { background: #f8f9fa; padding: 10px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="invoice">
        <div class="header">
            <h1>Fatura #{{invoiceNumber}}</h1>
        </div>
        <div class="content">
            <p>Olá {{customerName}},</p>
            <p>Sua fatura no valor de <strong>{{amount}}</strong> está disponível.</p>
            <p>Vencimento: {{dueDate}}</p>
            <a href="{{paymentLink}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Pagar Agora</a>
        </div>
        <div class="footer">
            <p>© 2025 Sua Empresa. Todos os direitos reservados.</p>
        </div>
    </div>
</body>
</html>
EOF

cat > templates/newsletter.hbs << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: #333; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .article { margin-bottom: 30px; }
        .button { background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{title}}</h1>
        </div>
        <div class="content">
            <p>Olá {{name}},</p>
            {{#each articles}}
            <div class="article">
                <h2>{{this.title}}</h2>
                <p>{{this.summary}}</p>
                <a href="{{this.link}}" class="button">Ler mais</a>
            </div>
            {{/each}}
        </div>
    </div>
</body>
</html>
EOF

# 14. Criar Dockerfile
echo -e "\n${YELLOW}14. Criando Dockerfile...${NC}"
cat > Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm ci --only=production

# Copiar código
COPY . .

# Criar diretórios necessários
RUN mkdir -p logs credentials

# Expor porta
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });"

# Rodar servidor
CMD ["node", "server.js"]
EOF

# 15. Criar docker-compose.yml
echo -e "\n${YELLOW}15. Criando docker-compose.yml...${NC}"
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  mcp-gmail:
    build: .
    container_name: mcp-gmail-server
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
      - ./credentials:/app/credentials
      - ./templates:/app/templates
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: bridge
EOF

# 16. Criar README.md
echo -e "\n${YELLOW}16. Criando documentação...${NC}"
cat > README.md << 'EOF'
# MCP Gmail Server

Servidor Gmail com Model Context Protocol (MCP) para envio de emails via API REST.

## 🚀 Instalação Rápida

```bash
bash install.sh
```

## 📋 Configuração OAuth2

### 1. Criar projeto no Google Cloud Console
1. Acesse https://console.cloud.google.com
2. Crie um novo projeto
3. Ative a Gmail API

### 2. Configurar credenciais OAuth2
1. Vá em "APIs & Services" > "Credentials"
2. Crie credenciais OAuth 2.0
3. Adicione URI de redirecionamento: `http://localhost:3000/auth/callback`
4. Copie Client ID e Client Secret

### 3. Atualizar .env
```env
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
GMAIL_USER=seu_email@gmail.com
```

### 4. Obter Refresh Token
```bash
# Iniciar servidor
npm start

# Abrir no navegador
http://localhost:3000/auth/google

# Autorizar e o token será salvo automaticamente
```

## 📨 Endpoints da API

### Enviar Email Simples
```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "X-API-Key: sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "destinatario@email.com",
    "subject": "Assunto do Email",
    "html": "<h1>Olá!</h1><p>Este é um email de teste.</p>"
  }'
```

### Enviar com Template
```bash
curl -X POST http://localhost:3000/api/send-template \
  -H "X-API-Key: sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "cliente@email.com",
    "template": "invoice",
    "variables": {
      "customerName": "João Silva",
      "invoiceNumber": "2025-001",
      "amount": "R$ 100,00",
      "dueDate": "30/01/2025",
      "paymentLink": "https://pay.example.com/2025-001"
    }
  }'
```

### Enviar em Massa
```bash
curl -X POST http://localhost:3000/api/send-bulk \
  -H "X-API-Key: sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      "user1@email.com",
      {"email": "user2@email.com", "name": "User 2"}
    ],
    "subject": "Newsletter de Janeiro",
    "html": "<h1>Novidades!</h1><p>Olá {{name}}, temos novidades...</p>"
  }'
```

### Enviar com Anexo
```bash
curl -X POST http://localhost:3000/api/send-email-with-attachment \
  -H "X-API-Key: sua_api_key" \
  -F 'emailData={"to":"cliente@email.com","subject":"Fatura","html":"<p>Segue fatura em anexo</p>"}' \
  -F "attachments=@/path/to/invoice.pdf"
```

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Produção com PM2
npm run pm2:start
npm run pm2:logs
npm run pm2:stop

# Docker
npm run docker:build
npm run docker:run

# Ver logs
tail -f logs/combined.log
```

## 📁 Estrutura de Pastas

```
/home/mcp-gmail-server/
├── .env                 # Variáveis de ambiente
├── server.js            # Servidor principal
├── routes/              # Rotas da API
├── services/            # Lógica de negócio
├── middlewares/         # Middlewares Express
├── templates/           # Templates de email
├── logs/                # Arquivos de log
└── credentials/         # Credenciais OAuth2
```

## 🔒 Segurança

- API Key obrigatória em todos endpoints
- Rate limiting configurado
- CORS configurado
- Logs detalhados
- Validação de inputs com Joi

## 🚀 Deploy em Produção

1. Configure DNS e SSL
2. Atualize .env com domínio de produção
3. Use PM2 ou Docker para rodar
4. Configure firewall para porta 3000
5. Use proxy reverso (Nginx/Apache)

## 📊 Monitoramento

- Health check: `GET /health`
- Logs em `./logs/`
- PM2 monitoring: `pm2 monit`

## 🆘 Troubleshooting

### Token expirado
- Reautorize em `/auth/google`

### Rate limit atingido
- Aguarde 15 minutos ou ajuste em .env

### Erro de autenticação
- Verifique credenciais no .env
- Confirme Gmail API ativada
EOF

# 17. Criar exemplo de Edge Function
echo -e "\n${YELLOW}17. Criando exemplo de Edge Function...${NC}"
cat > examples/vercel-edge-function.js << 'EOF'
// Vercel Edge Function Example
// api/send-invoice.js

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { customerEmail, invoiceData } = await request.json();

    // Chamar MCP Gmail Server
    const response = await fetch('https://your-server.com/api/send-template', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.MCP_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: customerEmail,
        template: 'invoice',
        variables: {
          customerName: invoiceData.customerName,
          invoiceNumber: invoiceData.number,
          amount: invoiceData.amount,
          dueDate: invoiceData.dueDate,
          paymentLink: invoiceData.paymentLink
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Email service error: ${response.status}`);
    }

    const result = await response.json();

    return new Response(JSON.stringify({
      success: true,
      messageId: result.messageId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
EOF

# 18. Criar testes básicos
echo -e "\n${YELLOW}18. Criando testes...${NC}"
cat > __tests__/api.test.js << 'EOF'
const request = require('supertest');
const app = require('../server');

describe('API Tests', () => {
  test('GET /health should return 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });

  test('POST /api/send-email without API key should return 401', async () => {
    const response = await request(app)
      .post('/api/send-email')
      .send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });
    expect(response.status).toBe(401);
  });

  test('POST /api/send-email with invalid data should return 400', async () => {
    const response = await request(app)
      .post('/api/send-email')
      .set('X-API-Key', process.env.API_KEY)
      .send({
        to: 'invalid-email',
        subject: 'Test'
      });
    expect(response.status).toBe(400);
  });
});
EOF

# 19. Criar script de inicialização do systemd
echo -e "\n${YELLOW}19. Criando serviço systemd...${NC}"
sudo tee /etc/systemd/system/mcp-gmail.service << EOF
[Unit]
Description=MCP Gmail Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$SERVER_DIR
ExecStart=/usr/bin/node $SERVER_DIR/server.js
Restart=on-failure
RestartSec=10
StandardOutput=append:$SERVER_DIR/logs/systemd.log
StandardError=append:$SERVER_DIR/logs/systemd-error.log
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# 20. Finalizar instalação
echo -e "\n${GREEN}✅ Instalação concluída!${NC}"
echo -e "\n📋 Próximos passos:"
echo "1. Configure as credenciais OAuth2 no arquivo .env"
echo "2. Execute: cd $SERVER_DIR && npm start"
echo "3. Acesse: http://localhost:3000/auth/google para autorizar"
echo "4. Teste a API com: curl http://localhost:3000/health"
echo ""
echo "Para rodar em produção:"
echo "- PM2: npm run pm2:start"
echo "- Docker: docker-compose up -d"
echo "- Systemd: sudo systemctl enable --now mcp-gmail"
echo ""
echo "📖 Veja README.md para documentação completa"
EOF

chmod +x install.sh