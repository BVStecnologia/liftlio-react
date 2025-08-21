#!/bin/bash

echo "========================================="
echo "Teste Local do Nginx com React SPA"
echo "========================================="

# Build da aplicação
echo "1. Fazendo build da aplicação..."
npm run build

# Build da imagem Docker
echo "2. Criando imagem Docker..."
docker build -t liftlio-test-nginx . --no-cache

# Parar container existente se houver
echo "3. Parando container existente..."
docker stop liftlio-test 2>/dev/null || true
docker rm liftlio-test 2>/dev/null || true

# Executar container
echo "4. Iniciando container de teste..."
docker run -d --name liftlio-test -p 8080:80 liftlio-test-nginx

# Aguardar container iniciar
echo "5. Aguardando container iniciar..."
sleep 3

# Testar rotas
echo "6. Testando rotas críticas..."
echo ""

echo "Testando / (landing page):"
curl -I -s http://localhost:8080/ | grep -E "HTTP|Location"
echo ""

echo "Testando /login (deve retornar 200, não 301):"
curl -I -s http://localhost:8080/login | grep -E "HTTP|Location"
echo ""

echo "Testando /dashboard (deve retornar 200, não 301):"
curl -I -s http://localhost:8080/dashboard | grep -E "HTTP|Location"
echo ""

echo "Testando /auth/callback (deve retornar 200, não 301):"
curl -I -s http://localhost:8080/auth/callback | grep -E "HTTP|Location"
echo ""

echo "========================================="
echo "Teste concluído!"
echo "Container rodando em: http://localhost:8080"
echo "Para parar: docker stop liftlio-test && docker rm liftlio-test"
echo "========================================="