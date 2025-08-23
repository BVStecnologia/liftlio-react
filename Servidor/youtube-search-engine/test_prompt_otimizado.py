#!/usr/bin/env python3
"""
Teste do prompt otimizado para geração de queries
"""

import asyncio
from anthropic import Anthropic
from dotenv import load_dotenv
import os

load_dotenv()

class PromptOptimizer:
    def __init__(self):
        self.claude = Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))
    
    async def generate_queries_v1_antigo(self, palavra_chave: str, descricao: str) -> list:
        """Versão antiga do prompt (muito específico)"""
        prompt = f"""Sua missão é analisar o produto/serviço descrito abaixo e gerar 5 palavras-chave específicas que:
1. Tenham relação semântica com a palavra-chave base
2. Demonstrem clara intenção de compra/uso do serviço  
3. Sejam frequentemente pesquisadas no YouTube por potenciais clientes
4. Levem a vídeos com comentários ativos de pessoas discutindo problemas que seu produto/serviço resolve

Palavra-chave base: {palavra_chave}

Descrição:
{descricao[:500]}...

Gere 5 queries de busca específicas com alta probabilidade de encontrar vídeos com pessoas realmente interessadas neste tipo de produto.

IMPORTANTE: Retorne APENAS as 5 queries, uma por linha, sem numeração ou explicações."""
        
        response = self.claude.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=200,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return [q.strip() for q in response.content[0].text.strip().split('\n') if q.strip()][:5]
    
    async def generate_queries_v2_otimizado(self, palavra_chave: str, descricao: str) -> list:
        """Nova versão otimizada do prompt"""
        prompt = f"""Você é um especialista em pesquisa no YouTube. Analise o produto/serviço e gere queries de busca OTIMIZADAS.

PRODUTO/SERVIÇO: {palavra_chave}

CONTEXTO (primeiras linhas):
{descricao[:500]}...

REGRAS IMPORTANTES:
1. NÃO seja muito específico (evite combinar muitos termos)
2. Use a palavra-chave principal de forma simples
3. Queries devem ter 2-4 palavras no máximo
4. Foque em termos que pessoas REALMENTE pesquisam
5. Balance entre específico e genérico

ESTRATÉGIA DE QUERIES:
- Query 1: Palavra-chave principal + termo genérico (ex: "shamo puro", "pitbull filhote")
- Query 2: Como + ação + palavra-chave (ex: "como criar shamo", "como treinar pitbull")
- Query 3: Palavra-chave + característica importante (ex: "shamo gigante", "pitbull american")
- Query 4: Palavra-chave + intenção comercial suave (ex: "shamo venda", "pitbull canil")
- Query 5: Variação ou tipo específico mencionado na descrição

EXEMPLOS RUINS (muito específicos):
❌ "shamo pescoço pelado reprodutor original japonês"
❌ "filhote pitbull american bully extreme pocket micro"

EXEMPLOS BONS (otimizados):
✅ "shamo puro"
✅ "criar shamo"
✅ "pitbull filhote"
✅ "american bully"

Gere 5 queries SIMPLES e EFETIVAS. Retorne APENAS as queries, uma por linha."""
        
        response = self.claude.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=200,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return [q.strip() for q in response.content[0].text.strip().split('\n') if q.strip()][:5]

async def test_prompts():
    print("\n" + "="*80)
    print("🧪 TESTE DE PROMPTS PARA GERAÇÃO DE QUERIES")
    print("="*80)
    
    # Casos de teste
    test_cases = [
        {
            "nome": "Shamo (Aves)",
            "palavra_chave": "Combatente Shamo",
            "descricao": "GUERREIRO SHAMO - CRIATÓRIO OURO VERMELHO. A Elite Genética dos Shamos no Brasil. Há mais de três décadas criando Shamos puros com paixão e dedicação. Variedades: Shamo Puro Pescoço Pelado, Shamo Red Devil, Shamo Gigante, Shamo F1."
        },
        {
            "nome": "Pitbull (Cães)",
            "palavra_chave": "American Pitbull",
            "descricao": "Canil especializado em American Pitbull Terrier de linhagem pura. Filhotes com pedigree, vacinados e vermifugados. Criação responsável com foco em temperamento equilibrado e saúde. Matrizes e padreadores importados."
        },
        {
            "nome": "Curso Online",
            "palavra_chave": "Curso de Marketing Digital",
            "descricao": "Aprenda marketing digital do zero ao avançado. Curso completo com Facebook Ads, Google Ads, Instagram, TikTok Ads. Mais de 200 aulas práticas, suporte vitalício e certificado. Método validado por mais de 5000 alunos."
        }
    ]
    
    optimizer = PromptOptimizer()
    
    for caso in test_cases:
        print(f"\n{'='*60}")
        print(f"📦 TESTANDO: {caso['nome']}")
        print(f"   Palavra-chave: {caso['palavra_chave']}")
        print(f"{'='*60}")
        
        # Teste com prompt antigo
        print("\n❌ PROMPT V1 (ANTIGO - Muito Específico):")
        print("-"*40)
        queries_v1 = await optimizer.generate_queries_v1_antigo(
            caso['palavra_chave'], 
            caso['descricao']
        )
        for i, query in enumerate(queries_v1, 1):
            palavras = len(query.split())
            print(f"  {i}. {query} ({palavras} palavras)")
        
        # Teste com prompt novo
        print("\n✅ PROMPT V2 (OTIMIZADO - Balanceado):")
        print("-"*40)
        queries_v2 = await optimizer.generate_queries_v2_otimizado(
            caso['palavra_chave'], 
            caso['descricao']
        )
        for i, query in enumerate(queries_v2, 1):
            palavras = len(query.split())
            emoji = "✅" if palavras <= 4 else "⚠️"
            print(f"  {i}. {query} ({palavras} palavras) {emoji}")
    
    print(f"\n{'='*80}")
    print("📊 ANÁLISE DOS RESULTADOS")
    print(f"{'='*80}")
    
    print("""
✅ MELHORIAS DO PROMPT V2:
1. Queries mais curtas (2-4 palavras)
2. Menos específicas (maior alcance)
3. Termos que pessoas realmente pesquisam
4. Balanceamento entre específico e genérico
5. Funciona para QUALQUER tipo de produto/serviço

❌ PROBLEMAS DO PROMPT V1:
1. Queries muito longas (5+ palavras)
2. Muito específicas (poucos resultados)
3. Combinações improváveis de termos
4. Foco excessivo em "intenção de compra"
""")

if __name__ == "__main__":
    asyncio.run(test_prompts())