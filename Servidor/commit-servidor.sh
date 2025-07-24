#!/bin/bash

# Script para commit das alterações da pasta Servidor

echo "🚀 Iniciando commit das alterações..."

# Navegar para o diretório do projeto
cd /Users/valdair/Documents/Projetos/Liftlio

# Adicionar todas as alterações
git add -A

# Verificar status
echo "📊 Status do Git:"
git status

# Fazer commit
git commit -m "feat: Organização completa da pasta Servidor com estrutura profissional

- Criada nova estrutura de pastas organizada
- Serviços MCP separados (Trello ✅, Gmail 🔄)
- Documentação completa e atualizada
- Configurações centralizadas em /config
- Exemplos movidos para /examples
- Scripts organizados em /scripts
- Arquivos antigos movidos para /archive
- Adicionado .gitignore apropriado
- Edge Functions v5 e v6 (batch) com Claude Sonnet 4
- README principal modernizado com links diretos

🚀 MCP Trello funcionando perfeitamente
🔄 MCP Gmail aguardando configuração OAuth2"

# Push para o GitHub
echo "📤 Enviando para o GitHub..."
git push origin main

echo "✅ Commit realizado com sucesso!"