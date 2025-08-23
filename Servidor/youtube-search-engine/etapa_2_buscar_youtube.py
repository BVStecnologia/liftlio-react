#!/usr/bin/env python3
"""
ETAPA 2 - Buscar Vídeos no YouTube
Este arquivo realiza a busca no YouTube com as queries geradas
"""

import asyncio
import json
from typing import Dict, List
from datetime import datetime, timedelta
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import httpx
from anthropic import Anthropic
from dotenv import load_dotenv
import os

load_dotenv()

class Etapa2BuscarYouTube:
    def __init__(self):
        self.youtube_api_key = os.getenv("YOUTUBE_API_KEY")
        self.youtube = build('youtube', 'v3', developerKey=self.youtube_api_key)
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        self.claude = Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))
    
    async def get_project_data(self, scanner_id: int) -> Dict:
        """Busca dados básicos do projeto (reutilizado da etapa 1)"""
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.supabase_url}/rest/v1/rpc/get_projeto_data",
                headers=headers,
                json={"scanner_id": scanner_id}
            )
            result = response.json()
            if isinstance(result, list) and len(result) > 0:
                return result[0]
            return result
    
    async def generate_optimized_queries(self, project_data: Dict) -> List[str]:
        """Gera queries otimizadas (prompt V2)"""
        palavra_chave = project_data.get('palavra_chave', '')
        descricao = project_data.get('descricao_projeto', '')
        
        prompt = f"""Você é um especialista em pesquisa no YouTube. Analise o produto/serviço e gere queries de busca OTIMIZADAS.

PRODUTO/SERVIÇO: {palavra_chave}

CONTEXTO:
{descricao[:500] if descricao else 'Produto/serviço relacionado a ' + palavra_chave}...

REGRAS IMPORTANTES:
1. NÃO seja muito específico (evite combinar muitos termos)
2. Use a palavra-chave principal de forma simples
3. Queries devem ter 2-4 palavras no máximo
4. Foque em termos que pessoas REALMENTE pesquisam
5. Balance entre específico e genérico

ESTRATÉGIA:
- Query 1: Palavra-chave principal + termo genérico
- Query 2: Como + ação + palavra-chave
- Query 3: Palavra-chave + característica
- Query 4: Palavra-chave + intenção comercial
- Query 5: Variação ou tipo específico

Gere 5 queries SIMPLES e EFETIVAS. Retorne APENAS as queries, uma por linha."""

        response = self.claude.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=200,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}]
        )
        
        queries_text = response.content[0].text.strip()
        return [q.strip() for q in queries_text.split('\n') if q.strip()][:5]
    
    async def search_youtube(self, queries: List[str], excluded_ids: str = "", days_back: int = 90) -> Dict:
        """Busca vídeos no YouTube com cada query"""
        print(f"\n{'='*80}")
        print(f"🔍 BUSCANDO VÍDEOS NO YOUTUBE")
        print(f"{'='*80}\n")
        
        # Configurações
        published_after = (datetime.now() - timedelta(days=days_back)).isoformat() + 'Z'
        excluded_list = excluded_ids.split(',') if excluded_ids else []
        
        print(f"📅 Período: Últimos {days_back} dias")
        print(f"🚫 IDs excluídos: {len(excluded_list)}")
        print(f"📊 Máximo: 15 vídeos por query")
        print(f"🌍 Região: BR (prioridade para conteúdo brasileiro)\n")
        
        all_videos = {}
        videos_by_query = {}
        
        for i, query in enumerate(queries, 1):
            print(f"\n{'='*60}")
            print(f"Query {i}/{len(queries)}: '{query}'")
            print(f"{'='*60}")
            
            try:
                # Buscar no YouTube - aumentar para 30 para ter mais opções
                search_response = self.youtube.search().list(
                    q=query,
                    part='snippet',
                    type='video',
                    maxResults=30,  # Aumentado para filtrar melhor
                    order='relevance',
                    publishedAfter=published_after,
                    regionCode='BR',
                    relevanceLanguage='pt'
                ).execute()
                
                videos_found = []
                videos_rejected_language = []
                
                for item in search_response.get('items', []):
                    video_id = item['id']['videoId']
                    
                    # Pular se já foi processado
                    if video_id in excluded_list:
                        print(f"  ⏭️ Pulando {video_id} (já processado)")
                        continue
                    
                    # Pular se já encontramos em outra query
                    if video_id in all_videos:
                        print(f"  🔄 Pulando {video_id} (duplicado)")
                        continue
                    
                    title = item['snippet']['title']
                    description = item['snippet'].get('description', '')
                    channel = item['snippet']['channelTitle']
                    
                    # Verificar se é conteúdo brasileiro/português
                    # Detectar idiomas asiáticos específicos (indonésio, malaio, etc)
                    # Removido 'gigante' pois pode ser usado em português também
                    asian_specific = ['anakan', 'mantap', 'betul', 'ayam', 'nih', 'keren', 'siap', 'umur', 'bulan']
                    portuguese_indicators = ['brasil', 'brasileiro', 'português', 'como', 'para', 'você', 'voce', 'criar', 'venda', 'comprar', 'fazenda', 'granja', 'criação', 'criacão', 'galo', 'combatente']
                    
                    # Converter para lowercase para comparação
                    title_lower = title.lower()
                    desc_lower = description.lower()
                    channel_lower = channel.lower()
                    
                    # Verificar indicadores asiáticos muito específicos
                    has_strong_asian = sum(1 for ind in asian_specific if ind in title_lower or ind in desc_lower) >= 3
                    has_portuguese = any(ind in title_lower or ind in desc_lower or ind in channel_lower for ind in portuguese_indicators)
                    
                    # Rejeitar APENAS se tiver MÚLTIPLOS indicadores asiáticos e NENHUM português
                    if has_strong_asian and not has_portuguese:
                        videos_rejected_language.append(title[:50])
                        continue
                    
                    video_data = {
                        'id': video_id,
                        'title': title,
                        'channel': channel,
                        'channel_id': item['snippet']['channelId'],
                        'description': description,
                        'published': item['snippet']['publishedAt'],
                        'query': query
                    }
                    
                    all_videos[video_id] = video_data
                    videos_found.append(video_data)
                    
                    # Limitar a 15 vídeos aprovados por query
                    if len(videos_found) >= 15:
                        break
                
                videos_by_query[query] = videos_found
                
                print(f"\n✅ Encontrados: {len(videos_found)} vídeos únicos")
                if videos_rejected_language:
                    print(f"🌍 Rejeitados por idioma/região: {len(videos_rejected_language)}")
                    for rejected in videos_rejected_language[:3]:
                        print(f"   ❌ {rejected}...")
                
                # Mostrar primeiros 3 vídeos
                for j, video in enumerate(videos_found[:3], 1):
                    published_date = video['published'][:10]
                    print(f"\n  📹 Vídeo {j}:")
                    print(f"     Título: {video['title'][:60]}...")
                    print(f"     Canal: {video['channel']}")
                    print(f"     Data: {published_date}")
                    print(f"     ID: {video['id']}")
                
                if len(videos_found) > 3:
                    print(f"\n  ... e mais {len(videos_found) - 3} vídeos")
                    
            except HttpError as e:
                print(f"  ❌ Erro na API do YouTube: {e}")
            except Exception as e:
                print(f"  ❌ Erro: {e}")
                videos_by_query[query] = []
        
        return {
            'all_videos': all_videos,
            'videos_by_query': videos_by_query,
            'total_found': len(all_videos)
        }
    
    def analyze_results(self, search_results: Dict):
        """Analisa e exibe estatísticas dos resultados"""
        print(f"\n{'='*80}")
        print("📊 ANÁLISE DOS RESULTADOS")
        print(f"{'='*80}\n")
        
        all_videos = search_results['all_videos']
        videos_by_query = search_results['videos_by_query']
        
        # Total geral
        print(f"📹 TOTAL DE VÍDEOS ÚNICOS: {len(all_videos)}\n")
        
        # Por query
        print("📋 VÍDEOS POR QUERY:")
        for query, videos in videos_by_query.items():
            print(f"  • {query}: {len(videos)} vídeos")
        
        # Canais mais frequentes
        if all_videos:
            print(f"\n📺 TOP 10 CANAIS MAIS FREQUENTES:")
            channels = {}
            for video in all_videos.values():
                channel = video['channel']
                channels[channel] = channels.get(channel, 0) + 1
            
            for channel, count in sorted(channels.items(), key=lambda x: x[1], reverse=True)[:10]:
                print(f"  • {channel}: {count} vídeos")
        
        # Distribuição por data
        if all_videos:
            print(f"\n📅 DISTRIBUIÇÃO POR MÊS:")
            months = {}
            for video in all_videos.values():
                month = video['published'][:7]  # YYYY-MM
                months[month] = months.get(month, 0) + 1
            
            for month, count in sorted(months.items(), reverse=True)[:6]:
                print(f"  • {month}: {count} vídeos")
        
        return search_results

async def main():
    """Executa a etapa 2 completa"""
    print("\n" + "="*80)
    print("🚀 ETAPA 2 - BUSCAR VÍDEOS NO YOUTUBE")
    print("="*80)
    
    scanner_id = 469
    etapa2 = Etapa2BuscarYouTube()
    
    # Buscar dados do projeto
    print("\n📋 Buscando dados do projeto...")
    project_data = await etapa2.get_project_data(scanner_id)
    print(f"  ✅ Projeto: {project_data.get('palavra_chave', 'N/A')}")
    print(f"  ✅ IDs excluídos: {len(project_data.get('videos_excluidos', '').split(',')) if project_data.get('videos_excluidos') else 0}")
    
    # Gerar queries otimizadas
    print("\n🤖 Gerando queries otimizadas...")
    queries = await etapa2.generate_optimized_queries(project_data)
    print("  Queries geradas:")
    for i, query in enumerate(queries, 1):
        print(f"    {i}. {query}")
    
    # Buscar vídeos
    excluded_ids = project_data.get('videos_excluidos', '')
    search_results = await etapa2.search_youtube(queries, excluded_ids)
    
    # Analisar resultados
    final_results = etapa2.analyze_results(search_results)
    
    # Salvar resultados para próxima etapa
    with open('etapa_2_resultados.json', 'w', encoding='utf-8') as f:
        json.dump({
            'scanner_id': scanner_id,
            'queries': queries,
            'videos': list(final_results['all_videos'].values()),
            'total_found': final_results['total_found'],
            'timestamp': datetime.now().isoformat()
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 Resultados salvos em 'etapa_2_resultados.json'")
    print(f"\n✅ ETAPA 2 CONCLUÍDA!")
    print(f"   Total de vídeos encontrados: {final_results['total_found']}")
    print(f"\n🔍 PRÓXIMA ETAPA: Buscar detalhes e aplicar filtros de qualidade")

if __name__ == "__main__":
    asyncio.run(main())