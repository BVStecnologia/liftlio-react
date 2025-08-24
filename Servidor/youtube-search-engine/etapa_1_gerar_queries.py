#!/usr/bin/env python3
"""
Debug Etapa 1 - Com prompt otimizado
"""

import asyncio
import json
from typing import Dict, List
import httpx
from anthropic import Anthropic
from dotenv import load_dotenv
import os

load_dotenv()

class DebugSearchEngineOtimizado:
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        self.claude_api_key = os.getenv("CLAUDE_API_KEY")
        self.claude = Anthropic(api_key=self.claude_api_key)
        
    async def step1_fetch_project_data(self, scanner_id: int) -> Dict:
        """Etapa 1: Buscar dados completos do projeto"""
        print(f"\n{'='*80}")
        print(f"ETAPA 1: BUSCAR DADOS DO PROJETO")
        print(f"{'='*80}\n")
        
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                # Tentar função completa primeiro
                response = await client.post(
                    f"{self.supabase_url}/rest/v1/rpc/get_projeto_data_completo",
                    headers=headers,
                    json={"scanner_id": scanner_id}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print("✅ Função get_projeto_data_completo encontrada!")
                else:
                    # Fallback para função básica
                    response = await client.post(
                        f"{self.supabase_url}/rest/v1/rpc/get_projeto_data",
                        headers=headers,
                        json={"scanner_id": scanner_id}
                    )
                    result = response.json()
                    if isinstance(result, list) and len(result) > 0:
                        raw_data = result[0]
                    else:
                        raw_data = result
                    
                    # MAPEAMENTO CORRETO DOS CAMPOS
                    data = {
                        'scanner_id': scanner_id,
                        'palavra_chave': raw_data.get('palavra_chave', ''),
                        'projeto_id': raw_data.get('projeto_id'),
                        'descricao_projeto': raw_data.get('descricao_projeto', ''),
                        'regiao': raw_data.get('pais', 'BR'),  # MAPEAR pais -> regiao
                        'videos_excluidos': raw_data.get('ids_negativos', ''),  # MAPEAR ids_negativos -> videos_excluidos
                        'nome_empresa': raw_data.get('nome_empresa', '')
                    }
                    print("⚠️ Usando função get_projeto_data com mapeamento correto")
                
                # Buscar descrição se não veio
                if not data.get('descricao_projeto'):
                    print("\n📋 Buscando descrição do projeto diretamente...")
                    projeto_id = data.get('projeto_id')
                    if projeto_id:
                        query_response = await client.get(
                            f"{self.supabase_url}/rest/v1/Projeto",
                            headers=headers,
                            params={
                                "id": f"eq.{projeto_id}",
                                "select": "Descricao"
                            }
                        )
                        if query_response.status_code == 200:
                            projeto_result = query_response.json()
                            if isinstance(projeto_result, list) and len(projeto_result) > 0:
                                data['descricao_projeto'] = projeto_result[0].get('Descricao', '')
                
                print(f"\n📊 DADOS DO PROJETO:")
                print(f"  Scanner ID: {scanner_id}")
                print(f"  Palavra-chave: {data.get('palavra_chave', 'N/A')}")
                print(f"  Nome Empresa: {data.get('nome_empresa', 'N/A')}")
                print(f"  Região: {data.get('regiao', 'BR')}")
                print(f"  IDs Excluídos: {len(data.get('videos_excluidos', '').split(',')) if data.get('videos_excluidos') else 0}")
                
                desc = data.get('descricao_projeto', '')
                if desc:
                    print(f"\n📝 DESCRIÇÃO DO PROJETO ({len(desc)} caracteres):")
                    print(f"  {desc[:500]}..." if len(desc) > 500 else f"  {desc}")
                else:
                    print(f"\n⚠️ Sem descrição do projeto disponível")
                
                return data
                
        except Exception as e:
            print(f"❌ Erro ao buscar dados: {e}")
            return {}
    
    async def generate_queries_v1_antigo(self, project_data: Dict) -> List[str]:
        """Versão ANTIGA do prompt (problemática)"""
        print(f"\n{'='*80}")
        print(f"❌ TESTE COM PROMPT V1 (ANTIGO - Muito Específico)")
        print(f"{'='*80}\n")
        
        palavra_chave = project_data.get('palavra_chave', '')
        nome_empresa = project_data.get('nome_empresa', '')
        descricao = project_data.get('descricao_projeto', '')
        regiao = project_data.get('regiao', 'BR')
        
        prompt = f"""Sua missão é analisar o produto/serviço descrito abaixo e gerar 5 palavras-chave específicas que:
1. Tenham relação semântica com a palavra-chave base
2. Demonstrem clara intenção de compra/uso do serviço  
3. Sejam frequentemente pesquisadas no YouTube por potenciais clientes
4. Levem a vídeos com comentários ativos de pessoas discutindo problemas que seu produto/serviço resolve

Company or product name: {nome_empresa}
Palavra-chave base: {palavra_chave}
Região/País: {regiao}

Audience description:
{descricao if descricao else 'Produto/serviço relacionado a ' + palavra_chave}

Gere 5 queries de busca específicas com alta probabilidade de encontrar vídeos com pessoas realmente interessadas neste tipo de produto.

IMPORTANTE: Retorne APENAS as 5 queries, uma por linha, sem numeração ou explicações."""

        print("📝 CARACTERÍSTICAS DO PROMPT V1:")
        print("  • Foco em 'intenção de compra'")
        print("  • Pede queries 'específicas'")
        print("  • Sem limite de palavras")
        print("  • Sem exemplos de boas/más queries\n")
        
        try:
            print("🤖 Enviando para Claude...")
            response = self.claude.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=200,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            
            queries_text = response.content[0].text.strip()
            queries = [q.strip() for q in queries_text.split('\n') if q.strip()][:5]
            
            print(f"\n📋 QUERIES GERADAS (V1):\n")
            for i, query in enumerate(queries, 1):
                palavras = len(query.split())
                emoji = "⚠️" if palavras > 4 else "✅"
                print(f"  Query {i}: {query} ({palavras} palavras) {emoji}")
            
            return queries
            
        except Exception as e:
            print(f"\n❌ Erro ao gerar queries: {e}")
            return []
    
    async def generate_queries_v2_otimizado(self, project_data: Dict) -> List[str]:
        """Nova versão OTIMIZADA do prompt"""
        print(f"\n{'='*80}")
        print(f"✅ TESTE COM PROMPT V2 (OTIMIZADO - Balanceado)")
        print(f"{'='*80}\n")
        
        palavra_chave = project_data.get('palavra_chave', '')
        nome_empresa = project_data.get('nome_empresa', '')
        descricao = project_data.get('descricao_projeto', '')
        regiao = project_data.get('regiao', 'BR')
        
        prompt = f"""Você é um especialista em pesquisa no YouTube. Analise o produto/serviço e gere queries de busca OTIMIZADAS.

PRODUTO/SERVIÇO: {palavra_chave}
{f'EMPRESA: {nome_empresa}' if nome_empresa else ''}

CONTEXTO (primeiras linhas):
{descricao[:500] if descricao else 'Produto/serviço relacionado a ' + palavra_chave}...

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

        print("📝 CARACTERÍSTICAS DO PROMPT V2:")
        print("  ✅ Limite de 2-4 palavras")
        print("  ✅ Instrução para NÃO ser específico demais")
        print("  ✅ Exemplos de queries RUINS e BOAS")
        print("  ✅ Estratégia clara para cada query")
        print("  ✅ Foco em termos reais de pesquisa\n")
        
        try:
            print("🤖 Enviando para Claude...")
            response = self.claude.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=200,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            
            queries_text = response.content[0].text.strip()
            queries = [q.strip() for q in queries_text.split('\n') if q.strip()][:5]
            
            print(f"\n📋 QUERIES GERADAS (V2):\n")
            for i, query in enumerate(queries, 1):
                palavras = len(query.split())
                emoji = "✅" if palavras <= 4 else "⚠️"
                print(f"  Query {i}: {query} ({palavras} palavras) {emoji}")
            
            return queries
            
        except Exception as e:
            print(f"\n❌ Erro ao gerar queries: {e}")
            return []

async def main():
    print("\n🚀 DEBUG ETAPA 1 - COMPARAÇÃO DE PROMPTS")
    print("="*80)
    
    scanner_id = 468  # Testando scanner 468
    debug = DebugSearchEngineOtimizado()
    
    # ETAPA 1: Buscar dados do projeto
    project_data = await debug.step1_fetch_project_data(scanner_id)
    
    if not project_data:
        print("\n❌ Não foi possível buscar dados do projeto")
        return
    
    # Gerar queries com PROMPT V1 (antigo)
    queries_v1 = await debug.generate_queries_v1_antigo(project_data)
    
    # Gerar queries com PROMPT V2 (otimizado)
    queries_v2 = await debug.generate_queries_v2_otimizado(project_data)
    
    # COMPARAÇÃO FINAL
    print(f"\n{'='*80}")
    print("📊 COMPARAÇÃO FINAL")
    print(f"{'='*80}\n")
    
    print("❌ PROMPT V1 (ANTIGO):")
    total_palavras_v1 = 0
    for i, query in enumerate(queries_v1, 1):
        palavras = len(query.split())
        total_palavras_v1 += palavras
        print(f"  {i}. {query} ({palavras} palavras)")
    media_v1 = total_palavras_v1 / len(queries_v1) if queries_v1 else 0
    print(f"\n  📊 Média: {media_v1:.1f} palavras por query")
    
    print("\n✅ PROMPT V2 (OTIMIZADO):")
    total_palavras_v2 = 0
    for i, query in enumerate(queries_v2, 1):
        palavras = len(query.split())
        total_palavras_v2 += palavras
        print(f"  {i}. {query} ({palavras} palavras)")
    media_v2 = total_palavras_v2 / len(queries_v2) if queries_v2 else 0
    print(f"\n  📊 Média: {media_v2:.1f} palavras por query")
    
    print(f"\n🎯 MELHORIA: {((media_v1 - media_v2) / media_v1 * 100):.0f}% menos palavras em média")
    print(f"\n🔍 PRÓXIMA ETAPA: Testar essas queries no YouTube para ver quantos vídeos encontram")

if __name__ == "__main__":
    asyncio.run(main())