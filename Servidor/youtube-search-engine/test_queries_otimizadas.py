#!/usr/bin/env python3
"""
Teste com queries mais genéricas e otimizadas
"""

import asyncio
from datetime import datetime, timedelta
from googleapiclient.discovery import build
from dotenv import load_dotenv
import os

load_dotenv()

async def test_optimized_queries():
    youtube = build('youtube', 'v3', developerKey=os.getenv("YOUTUBE_API_KEY"))
    
    print("\n" + "="*80)
    print("🔍 TESTE COM QUERIES OTIMIZADAS")
    print("="*80)
    
    # Queries para testar
    queries = [
        "shamo puro",
        "como criar shamo combatente",
        "galos combatentes"
    ]
    
    # Configurações
    published_after_90 = (datetime.now() - timedelta(days=90)).isoformat() + 'Z'
    published_after_365 = (datetime.now() - timedelta(days=365)).isoformat() + 'Z'
    
    all_videos_90 = {}
    all_videos_365 = {}
    
    for query in queries:
        print(f"\n{'='*60}")
        print(f"📝 TESTANDO QUERY: '{query}'")
        print(f"{'='*60}")
        
        # TESTE 1: Últimos 90 dias (atual)
        print(f"\n1️⃣ COM FILTRO DE 90 DIAS:")
        print("-"*40)
        
        try:
            search_90 = youtube.search().list(
                q=query,
                part='snippet',
                type='video',
                maxResults=15,
                order='relevance',
                publishedAfter=published_after_90,
                regionCode='BR',
                relevanceLanguage='pt'
            ).execute()
            
            videos_90 = search_90.get('items', [])
            print(f"✅ Encontrados: {len(videos_90)} vídeos")
            
            # Adicionar ao total sem duplicatas
            for video in videos_90:
                video_id = video['id']['videoId']
                if video_id not in all_videos_90:
                    all_videos_90[video_id] = {
                        'title': video['snippet']['title'],
                        'channel': video['snippet']['channelTitle'],
                        'date': video['snippet']['publishedAt'][:10],
                        'query': query
                    }
            
            # Mostrar 3 exemplos
            for i, video in enumerate(videos_90[:3], 1):
                print(f"  {i}. {video['snippet']['title'][:50]}...")
                print(f"     Canal: {video['snippet']['channelTitle']}")
                print(f"     Data: {video['snippet']['publishedAt'][:10]}")
                
        except Exception as e:
            print(f"❌ Erro: {e}")
        
        # TESTE 2: Último ano
        print(f"\n2️⃣ COM FILTRO DE 1 ANO:")
        print("-"*40)
        
        try:
            search_365 = youtube.search().list(
                q=query,
                part='snippet',
                type='video',
                maxResults=15,
                order='relevance',
                publishedAfter=published_after_365,
                regionCode='BR',
                relevanceLanguage='pt'
            ).execute()
            
            videos_365 = search_365.get('items', [])
            print(f"✅ Encontrados: {len(videos_365)} vídeos")
            
            # Adicionar ao total sem duplicatas
            for video in videos_365:
                video_id = video['id']['videoId']
                if video_id not in all_videos_365:
                    all_videos_365[video_id] = {
                        'title': video['snippet']['title'],
                        'channel': video['snippet']['channelTitle'],
                        'date': video['snippet']['publishedAt'][:10],
                        'query': query
                    }
            
            # Mostrar 3 exemplos
            for i, video in enumerate(videos_365[:3], 1):
                print(f"  {i}. {video['snippet']['title'][:50]}...")
                print(f"     Canal: {video['snippet']['channelTitle']}")
                print(f"     Data: {video['snippet']['publishedAt'][:10]}")
                
        except Exception as e:
            print(f"❌ Erro: {e}")
        
        # TESTE 3: Sem filtro de data
        print(f"\n3️⃣ SEM FILTRO DE DATA:")
        print("-"*40)
        
        try:
            search_all = youtube.search().list(
                q=query,
                part='snippet',
                type='video',
                maxResults=15,
                order='relevance',
                regionCode='BR',
                relevanceLanguage='pt'
            ).execute()
            
            videos_all = search_all.get('items', [])
            print(f"✅ Encontrados: {len(videos_all)} vídeos")
            
            # Mostrar 3 exemplos
            for i, video in enumerate(videos_all[:3], 1):
                print(f"  {i}. {video['snippet']['title'][:50]}...")
                print(f"     Canal: {video['snippet']['channelTitle']}")
                print(f"     Data: {video['snippet']['publishedAt'][:10]}")
                
        except Exception as e:
            print(f"❌ Erro: {e}")
    
    # RESUMO FINAL
    print(f"\n{'='*80}")
    print("📊 RESUMO TOTAL (VÍDEOS ÚNICOS)")
    print(f"{'='*80}")
    
    print(f"\n✅ TOTAL COM 90 DIAS: {len(all_videos_90)} vídeos únicos")
    print(f"✅ TOTAL COM 1 ANO: {len(all_videos_365)} vídeos únicos")
    
    # Análise de canais mais frequentes (90 dias)
    if all_videos_90:
        print(f"\n📺 CANAIS MAIS FREQUENTES (90 dias):")
        channels_90 = {}
        for video in all_videos_90.values():
            channel = video['channel']
            channels_90[channel] = channels_90.get(channel, 0) + 1
        
        for channel, count in sorted(channels_90.items(), key=lambda x: x[1], reverse=True)[:5]:
            print(f"  • {channel}: {count} vídeos")
    
    # Análise de canais mais frequentes (1 ano)
    if all_videos_365:
        print(f"\n📺 CANAIS MAIS FREQUENTES (1 ano):")
        channels_365 = {}
        for video in all_videos_365.values():
            channel = video['channel']
            channels_365[channel] = channels_365.get(channel, 0) + 1
        
        for channel, count in sorted(channels_365.items(), key=lambda x: x[1], reverse=True)[:5]:
            print(f"  • {channel}: {count} vídeos")
    
    print(f"\n🎯 CONCLUSÃO:")
    print(f"  • Query 'shamo puro': Mais específica para o produto")
    print(f"  • Query 'como criar shamo combatente': Intenção educacional")
    print(f"  • Query 'galos combatentes': Muito genérica, traz outros tipos")
    print(f"\n  📈 Diferença: {len(all_videos_365) - len(all_videos_90)} vídeos a mais com 1 ano vs 90 dias")

if __name__ == "__main__":
    asyncio.run(test_optimized_queries())