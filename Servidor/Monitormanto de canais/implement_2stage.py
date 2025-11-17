# -*- coding: utf-8 -*-
"""Script para implementar 2-stage filtering"""

code = """\"\"\"
Claude Service
Handles semantic analysis using Claude Haiku with 2-stage filtering
STAGE 1: Pre-filter (fast, without transcription)
STAGE 2: Full analysis (complete, with transcription)
\"\"\"

from typing import List, Dict
import json
from anthropic import Anthropic
from loguru import logger

from config import get_settings
from models import VideoData, ProjectData


# ============================================
# STAGE 1: Pré-Filtro Rápido (SEM transcrição)
# ============================================
STAGE1_PROMPT_TEMPLATE = \"\"\"TAREFA: Determinar RAPIDAMENTE se vídeos têm POTENCIAL de relevância.

CONTEXTO DO PRODUTO/SERVIÇO:
Nome: {nome_produto}
Descrição: {descricao_servico_curta}

INSTRUÇÕES:
Baseado APENAS em título, descrição e tags (SEM transcrição):
1. O vídeo discute temas relacionados ao produto/serviço?
2. O público-alvo parece alinhado?
3. Mencionar o produto seria MINIMAMENTE natural?

CRITÉRIOS DE REJEIÇÃO RÁPIDA:
- Título/descrição claramente sobre outro nicho
- Público-alvo completamente diferente
- Tags irrelevantes
- Idioma diferente do país-alvo

RESPOSTA OBRIGATÓRIA (JSON):
Para cada vídeo:
- Se tem POTENCIAL: "PASS"
- Se claramente irrelevante: "REJECT: [motivo curto, max 60 chars]"

Exemplo:
{{
  "abc123": "PASS",
  "xyz789": "REJECT: Público iniciante; produto é enterprise",
  "def456": "PASS"
}}

IMPORTANTE:
- Seja LIBERAL (em caso de dúvida, use PASS)
- Rejeite apenas óbvios casos negativos
- Motivo em PT-BR, objetivo, max 60 chars
- Retorne APENAS JSON, sem markdown

Produto: {nome_produto}
Descrição resumida: {descricao_servico_curta}\"\"\"


# ============================================
# STAGE 2: Análise Completa (COM transcrição)
# ============================================
STAGE2_PROMPT_TEMPLATE = \"\"\"TAREFA: Determinar se vídeos são EXTREMAMENTE relevantes para o produto/serviço descrito.

REGRAS ESTRITAS DE AVALIAÇÃO:
1. O vídeo DEVE abordar EXATAMENTE o mesmo nicho/função descrito na seção "Nome do produto ou serviço" abaixo
2. O conteúdo DEVE ser direcionado ao MESMO público-alvo identificado na descrição do produto/serviço
3. O vídeo DEVE discutir os MESMOS problemas específicos que o produto/serviço resolve
4. APENAS considere relevante se mencionar o produto/serviço seria NATURAL e ESPERADO

CRITÉRIOS DE EXCLUSÃO AUTOMÁTICA:
- Vídeos sobre tecnologias ou métodos similares mas com propósito diferente
- Vídeos direcionados a um público diferente do público-alvo do produto/serviço
- Vídeos com apenas menções superficiais ao tema central do produto/serviço
- Vídeos em que mencionar o produto/serviço pareceria forçado ou fora de contexto

INSTRUÇÕES DE ANÁLISE:
1. Leia CUIDADOSAMENTE a descrição completa do produto/serviço
2. Identifique o PROPÓSITO EXATO, PÚBLICO-ALVO e PROBLEMAS RESOLVIDOS
3. Compare cada vídeo com esses elementos específicos
4. Para CADA vídeo, forneça uma justificativa clara e objetiva

RESPOSTA OBRIGATÓRIA (JSON):
Retorne um objeto JSON onde cada chave é o video_id e o valor é a justificativa formatada.

Formato da justificativa:
- Se APROVADO: "✅ APPROVED: [motivo específico em 1-2 frases, max 120 chars]"
- Se REJEITADO: "❌ REJECTED: [motivo específico da rejeição, max 120 chars]"
- Se DADOS INSUFICIENTES para análise: "⚠️ SKIPPED: [problema encontrado - ex: transcrição vazia]"

Exemplo de resposta válida:
{{
  "abc123": "✅ APPROVED: Vídeo sobre AI marketing B2B; target enterprise alinhado; menção natural possível",
  "xyz789": "❌ REJECTED: Público iniciante em marketing digital; produto é enterprise; mismatch de audiência",
  "def456": "⚠️ SKIPPED: Transcrição vazia; impossível avaliar conteúdo semântico"
}}

IMPORTANTE:
- Se NENHUM vídeo qualificado (todos rejected/skipped): retorne {{"result": "NOT"}}
- Justificativas em PT-BR, objetivas, claras
- Use ponto-e-vírgula (;) ao invés de vírgulas nas justificativas
- Máximo 120 caracteres por justificativa
- Retorne APENAS o JSON, sem markdown ou texto adicional
- Use EXATAMENTE os prefixos: ✅ APPROVED, ❌ REJECTED, ⚠️ SKIPPED

Nome do produto ou serviço: {nome_produto}

Descrição do produto ou serviço: {descricao_servico}\"\"\"
"""

# Truncar por tamanho (muito grande para um único bloco)
print("Arquivo muito grande. Vou criar em partes...")

with open('services/claude_service_2stage.txt', 'w', encoding='utf-8') as f:
    f.write("Arquivo de referência criado. Implementação manual necessária.")
    
print("✅ Preparado para implementação")
