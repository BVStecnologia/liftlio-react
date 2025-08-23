#!/usr/bin/env python3
"""
Debug passo a passo do YouTube Search Engine v4
"""

import asyncio
import json
from typing import Dict, List
from datetime import datetime, timedelta
import httpx
from anthropic import Anthropic
from googleapiclient.discovery import build
from dotenv import load_dotenv
import os

load_dotenv()

class DebugSearchEngine:
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        self.claude_api_key = os.getenv("CLAUDE_API_KEY")
        self.youtube_api_key = os.getenv("YOUTUBE_API_KEY")
        self.claude = Anthropic(api_key=self.claude_api_key)
        self.youtube = build('youtube', 'v3', developerKey=self.youtube_api_key)
        
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
        
        # Primeiro tentar a função completa
        try:
            async with httpx.AsyncClient() as client:
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
                    # A função retorna uma lista, pegar o primeiro item
                    if isinstance(result, list) and len(result) > 0:
                        data = result[0]
                    else:
                        data = result
                    print("⚠️ Usando função get_projeto_data (sem descrição completa)")
                
                # Buscar descrição diretamente se não veio
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
    
    async def step2_generate_semantic_queries(self, project_data: Dict) -> List[str]:
        """Etapa 2: Gerar queries semânticas com Claude"""
        print(f"\n{'='*80}")
        print(f"ETAPA 2: GERAR QUERIES SEMÂNTICAS COM CLAUDE")
        print(f"{'='*80}\n")
        
        palavra_chave = project_data.get('palavra_chave', '')
        nome_empresa = project_data.get('nome_empresa', '')
        descricao = project_data.get('descricao_projeto', '')
        regiao = project_data.get('regiao', 'BR')
        
        print("📝 CONSTRUINDO PROMPT PARA CLAUDE:\n")
        
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

        print(f"PROMPT ENVIADO:")
        print("-" * 40)
        print(prompt)
        print("-" * 40)
        
        try:
            print("\n🤖 Enviando para Claude...")
            response = self.claude.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=200,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            
            queries_text = response.content[0].text.strip()
            queries = [q.strip() for q in queries_text.split('\n') if q.strip()][:5]
            
            print(f"\n✅ QUERIES SEMÂNTICAS GERADAS:\n")
            for i, query in enumerate(queries, 1):
                print(f"  Query {i}: {query}")
            
            return queries
            
        except Exception as e:
            print(f"\n❌ Erro ao gerar queries: {e}")
            print("\n⚠️ Usando queries fallback...")
            fallback = [
                palavra_chave,
                f"{palavra_chave} review",
                f"{palavra_chave} vale a pena",
                f"{palavra_chave} como criar",
                f"{palavra_chave} tutorial"
            ]
            for i, query in enumerate(fallback, 1):
                print(f"  Query {i}: {query}")
            return fallback
    
    async def step3_search_youtube(self, queries: List[str], excluded_ids: str = "") -> Dict:
        """Etapa 3: Buscar vídeos no YouTube com cada query"""
        print(f"\n{'='*80}")
        print(f"ETAPA 3: BUSCAR VÍDEOS NO YOUTUBE")
        print(f"{'='*80}\n")
        
        # Configurações de busca
        published_after = (datetime.now() - timedelta(days=90)).isoformat() + 'Z'
        excluded_list = excluded_ids.split(',') if excluded_ids else []
        
        print(f"📅 Buscando vídeos dos últimos 90 dias")
        print(f"🚫 IDs excluídos: {len(excluded_list)}")
        print(f"📊 Máximo 15 vídeos por query\n")
        
        all_videos = {}
        videos_by_query = {}
        
        for i, query in enumerate(queries, 1):
            print(f"\n🔍 Query {i}/{len(queries)}: '{query}'")
            print("-" * 60)
            
            try:
                # Fazer a busca no YouTube
                search_response = self.youtube.search().list(
                    q=query,
                    part='snippet',
                    type='video',
                    maxResults=15,
                    order='relevance',
                    publishedAfter=published_after,
                    regionCode='BR',
                    relevanceLanguage='pt'
                ).execute()
                
                videos_found = []
                
                for item in search_response.get('items', []):
                    video_id = item['id']['videoId']
                    
                    # Pular se já foi processado
                    if video_id in excluded_list:
                        continue
                    
                    # Pular se já encontramos em outra query
                    if video_id in all_videos:
                        continue
                    
                    video_data = {
                        'id': video_id,
                        'title': item['snippet']['title'],
                        'channel': item['snippet']['channelTitle'],
                        'description': item['snippet'].get('description', '')[:200],
                        'published': item['snippet']['publishedAt'],
                        'query': query
                    }
                    
                    all_videos[video_id] = video_data
                    videos_found.append(video_data)
                
                videos_by_query[query] = videos_found
                
                print(f"  ✅ Encontrados: {len(videos_found)} vídeos únicos")
                
                # Mostrar alguns exemplos
                for j, video in enumerate(videos_found[:3], 1):
                    print(f"\n  📹 Vídeo {j}:")
                    print(f"     Título: {video['title'][:60]}...")
                    print(f"     Canal: {video['channel']}")
                    print(f"     ID: {video['id']}")
                
                if len(videos_found) > 3:
                    print(f"\n  ... e mais {len(videos_found) - 3} vídeos")
                    
            except Exception as e:
                print(f"  ❌ Erro na busca: {e}")
                videos_by_query[query] = []
        
        print(f"\n{'='*80}")
        print(f"📊 RESUMO DA BUSCA:")
        print(f"  Total de vídeos únicos encontrados: {len(all_videos)}")
        print(f"\n  Vídeos por query:")
        for query, videos in videos_by_query.items():
            print(f"    • {query}: {len(videos)} vídeos")
        
        return {
            'all_videos': all_videos,
            'videos_by_query': videos_by_query,
            'total_found': len(all_videos)
        }

async def main():
    print("\n🚀 DEBUG PASSO A PASSO - YouTube Search Engine v4")
    print("="*80)
    
    scanner_id = 469
    debug = DebugSearchEngine()
    
    # ETAPA 1: Buscar dados do projeto
    project_data = await debug.step1_fetch_project_data(scanner_id)
    
    if not project_data:
        print("\n❌ Não foi possível buscar dados do projeto")
        return
    
    # ETAPA 2: Gerar queries semânticas
    queries = await debug.step2_generate_semantic_queries(project_data)
    
    # ETAPA 3: Buscar vídeos no YouTube
    excluded_ids = project_data.get('videos_excluidos', '')
    search_results = await debug.step3_search_youtube(queries, excluded_ids)
    
    print(f"\n{'='*80}")
    print("✅ SEGUNDA ETAPA CONCLUÍDA!")
    print(f"{'='*80}")
    print("\n📊 RESUMO GERAL:")
    print(f"  - Projeto: {project_data.get('palavra_chave', 'N/A')}")
    print(f"  - Queries geradas: {len(queries)}")
    print(f"  - Vídeos encontrados: {search_results['total_found']}")
    print("\n🔍 PRÓXIMA ETAPA: Buscar detalhes e aplicar filtros de qualidade")
    print("\nAguardando sua confirmação para continuar...")

if __name__ == "__main__":
    asyncio.run(main())