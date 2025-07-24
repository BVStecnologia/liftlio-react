#!/bin/bash

# Script para configurar OAuth2 headless (sem browser)
# Para servidores sem interface gráfica

echo "🔐 Configuração OAuth2 Headless para Gmail"
echo "=========================================="

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar se .env existe
if [ ! -f .env ]; then
    echo -e "${YELLOW}Arquivo .env não encontrado. Execute install.sh primeiro.${NC}"
    exit 1
fi

# Carregar variáveis do .env
source .env

# Verificar se as credenciais estão configuradas
if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    echo -e "${YELLOW}Por favor, configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no arquivo .env${NC}"
    echo ""
    echo "1. Acesse: https://console.cloud.google.com"
    echo "2. Crie um projeto ou selecione existente"
    echo "3. Ative a Gmail API"
    echo "4. Crie credenciais OAuth 2.0"
    echo "5. Configure URI de redirecionamento:"
    echo "   - Para teste local: http://localhost:3000/auth/callback"
    echo "   - Para produção: https://seu-dominio.com/auth/callback"
    echo "6. Copie Client ID e Client Secret para o .env"
    exit 1
fi

echo -e "${GREEN}✓ Credenciais encontradas${NC}"
echo ""

# Gerar URL de autorização
AUTH_URL="https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_REDIRECT_URI}&response_type=code&scope=https://www.googleapis.com/auth/gmail.send%20https://www.googleapis.com/auth/gmail.readonly%20https://www.googleapis.com/auth/gmail.modify&access_type=offline&prompt=consent"

echo -e "${BLUE}📋 Instruções para autorização headless:${NC}"
echo ""
echo "1. Em sua máquina LOCAL (com browser), acesse esta URL:"
echo ""
echo -e "${YELLOW}$AUTH_URL${NC}"
echo ""
echo "2. Faça login com a conta Gmail que enviará os emails"
echo ""
echo "3. Autorize o aplicativo"
echo ""
echo "4. Após autorizar, você será redirecionado para:"
echo "   ${GOOGLE_REDIRECT_URI}?code=CODIGO_AQUI"
echo ""
echo "5. Copie apenas o CÓDIGO (após 'code=') e cole abaixo:"
echo ""

# Solicitar código
read -p "Cole o código de autorização aqui: " AUTH_CODE

if [ -z "$AUTH_CODE" ]; then
    echo -e "${YELLOW}Código não fornecido. Saindo...${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Trocando código por tokens...${NC}"

# Fazer requisição para obter tokens
RESPONSE=$(curl -s -X POST https://oauth2.googleapis.com/token \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "code=${AUTH_CODE}" \
    -d "client_id=${GOOGLE_CLIENT_ID}" \
    -d "client_secret=${GOOGLE_CLIENT_SECRET}" \
    -d "redirect_uri=${GOOGLE_REDIRECT_URI}" \
    -d "grant_type=authorization_code")

# Extrair refresh token
REFRESH_TOKEN=$(echo $RESPONSE | grep -o '"refresh_token":"[^"]*' | grep -o '[^"]*$')

if [ -z "$REFRESH_TOKEN" ]; then
    echo -e "${RED}❌ Erro ao obter refresh token${NC}"
    echo "Resposta do servidor:"
    echo $RESPONSE | jq .
    exit 1
fi

# Atualizar .env com refresh token
sed -i.bak "s/GOOGLE_REFRESH_TOKEN=.*/GOOGLE_REFRESH_TOKEN=${REFRESH_TOKEN}/" .env

echo -e "${GREEN}✅ Refresh token salvo com sucesso!${NC}"
echo ""

# Extrair email autorizado
ACCESS_TOKEN=$(echo $RESPONSE | grep -o '"access_token":"[^"]*' | grep -o '[^"]*$')
if [ ! -z "$ACCESS_TOKEN" ]; then
    USER_INFO=$(curl -s "https://www.googleapis.com/oauth2/v1/userinfo?access_token=${ACCESS_TOKEN}")
    EMAIL=$(echo $USER_INFO | grep -o '"email":"[^"]*' | grep -o '[^"]*$')
    
    if [ ! -z "$EMAIL" ]; then
        echo -e "${GREEN}Email autorizado: $EMAIL${NC}"
        # Atualizar GMAIL_USER no .env
        if ! grep -q "GMAIL_USER=" .env; then
            echo "GMAIL_USER=$EMAIL" >> .env
        else
            sed -i.bak "s/GMAIL_USER=.*/GMAIL_USER=${EMAIL}/" .env
        fi
    fi
fi

echo ""
echo -e "${GREEN}🎉 Configuração concluída!${NC}"
echo ""
echo "Próximos passos:"
echo "1. Inicie o servidor: npm start"
echo "2. Teste o envio de email com a API"
echo ""
echo "Exemplo de teste:"
echo "curl -X POST http://localhost:3000/api/send-email \\"
echo "  -H \"X-API-Key: $(grep API_KEY .env | cut -d= -f2)\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"to\": \"teste@example.com\", \"subject\": \"Teste\", \"html\": \"<p>Email de teste</p>\"}'"