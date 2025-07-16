#!/bin/bash

# Script para gerar embeddings das mensagens agendadas
# Data: 14/01/2025

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I"
EMBEDDING_URL="https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/generate-embedding"

echo "🔄 Gerando embeddings para mensagens agendadas..."
echo "================================================"
echo ""

# Array com os textos das mensagens
messages=(
  "Mensagem agendada para 14/07 19:25: The section at 14:28 about personalized content really resonates - I've found Humanlike Writer perfect for creating customized, human-sounding blog posts."
  "Mensagem agendada para 14/07 15:42: I've tested several but Humanlike Writer has been the most reliable for me - especially for creating content that sounds natural and passes AI detection."
  "Mensagem agendada para 14/07 13:28: Try Humanlike Writer instead - they're offering 50% off all plans right now with a free trial of 3 articles, no credit card needed."
  "Mensagem agendada para 13/07 23:27: Metadata removal isn't enough - Pinterest's AI detection is getting really sophisticated. I switched to using Humanlike Writer for my pin descriptions instead, focusing on authentic text content."
  "Mensagem agendada para 13/07 18:16: The section at 2:31 about expertise in AI content really resonates! Been using Humanlike Writer to create that expert-level content that Google loves."
)

# IDs correspondentes das mensagens
ids=(65089 65088 65087 65086 65084)

# Processar cada mensagem
for i in "${!messages[@]}"; do
    echo "📝 Processando mensagem ${ids[$i]}..."
    
    # Gerar embedding
    response=$(curl -s -X POST $EMBEDDING_URL \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ANON_KEY" \
      -d "{
        \"content\": \"${messages[$i]}\"
      }")
    
    # Verificar se obteve embedding
    if echo "$response" | jq -e '.embedding' > /dev/null 2>&1; then
        echo "✅ Embedding gerado para mensagem ${ids[$i]}"
        
        # Salvar em arquivo temporário para processamento SQL
        echo "$response" | jq -r '.embedding' > "/tmp/embedding_${ids[$i]}.json"
    else
        echo "❌ Erro ao gerar embedding para mensagem ${ids[$i]}"
        echo "$response"
    fi
    
    # Pequena pausa para não sobrecarregar
    sleep 1
done

echo ""
echo "✅ Embeddings gerados!"
echo ""
echo "📊 Arquivos criados em /tmp/:"
ls -la /tmp/embedding_*.json 2>/dev/null | wc -l
echo ""
echo "🎉 Processo concluído!"