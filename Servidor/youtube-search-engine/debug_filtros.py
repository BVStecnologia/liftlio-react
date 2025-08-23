#!/usr/bin/env python3
"""
Debug dos filtros de busca do YouTube
"""

import asyncio
from datetime import datetime, timedelta
from googleapiclient.discovery import build
from dotenv import load_dotenv
import os

load_dotenv()

async def test_search_filters():
    youtube = build('youtube', 'v3', developerKey=os.getenv("YOUTUBE_API_KEY"))
    
    print("\n" + "="*80)
    print("🔍 ANÁLISE DOS FILTROS DE BUSCA DO YOUTUBE")
    print("="*80)
    
    # Query de teste
    query = "combatente shamo"
    
    print(f"\n📝 Query de teste: '{query}'")
    print("\n" + "-"*60)
    
    # Teste 1: SEM FILTROS (como você pesquisa no YouTube)
    print("\n1️⃣ BUSCA SEM FILTROS DE DATA (como no YouTube.com):")
    print("-"*40)
    
    search_no_filter = youtube.search().list(
        q=query,
        part='snippet',
        type='video',
        maxResults=15,
        order='relevance'
    ).execute()
    
    print(f"✅ Encontrados: {len(search_no_filter.get('items', []))} vídeos")
    for i, item in enumerate(search_no_filter.get('items', [])[:5], 1):
        date = item['snippet']['publishedAt'][:10]
        print(f"  {i}. {item['snippet']['title'][:50]}... ({date})")
    
    # Teste 2: COM FILTRO DE 90 DIAS (nosso sistema)
    print("\n2️⃣ BUSCA COM FILTRO: ÚLTIMOS 90 DIAS (nosso sistema):")
    print("-"*40)
    
    published_after = (datetime.now() - timedelta(days=90)).isoformat() + 'Z'
    
    search_90_days = youtube.search().list(
        q=query,
        part='snippet',
        type='video',
        maxResults=15,
        order='relevance',
        publishedAfter=published_after  # ⚠️ ESTE É O FILTRO!
    ).execute()
    
    print(f"✅ Encontrados: {len(search_90_days.get('items', []))} vídeos")
    for i, item in enumerate(search_90_days.get('items', [])[:5], 1):
        date = item['snippet']['publishedAt'][:10]
        print(f"  {i}. {item['snippet']['title'][:50]}... ({date})")
    
    # Teste 3: COM FILTRO DE 30 DIAS
    print("\n3️⃣ BUSCA COM FILTRO: ÚLTIMOS 30 DIAS:")
    print("-"*40)
    
    published_after_30 = (datetime.now() - timedelta(days=30)).isoformat() + 'Z'
    
    search_30_days = youtube.search().list(
        q=query,
        part='snippet',
        type='video',
        maxResults=15,
        order='relevance',
        publishedAfter=published_after_30
    ).execute()
    
    print(f"✅ Encontrados: {len(search_30_days.get('items', []))} vídeos")
    for i, item in enumerate(search_30_days.get('items', [])[:5], 1):
        date = item['snippet']['publishedAt'][:10]
        print(f"  {i}. {item['snippet']['title'][:50]}... ({date})")
    
    # Teste 4: COM FILTRO DE 1 ANO
    print("\n4️⃣ BUSCA COM FILTRO: ÚLTIMO ANO:")
    print("-"*40)
    
    published_after_year = (datetime.now() - timedelta(days=365)).isoformat() + 'Z'
    
    search_year = youtube.search().list(
        q=query,
        part='snippet',
        type='video',
        maxResults=15,
        order='relevance',
        publishedAfter=published_after_year
    ).execute()
    
    print(f"✅ Encontrados: {len(search_year.get('items', []))} vídeos")
    for i, item in enumerate(search_year.get('items', [])[:5], 1):
        date = item['snippet']['publishedAt'][:10]
        print(f"  {i}. {item['snippet']['title'][:50]}... ({date})")
    
    print("\n" + "="*80)
    print("📊 RESUMO DOS FILTROS APLICADOS NO NOSSO SISTEMA:")
    print("="*80)
    
    print("""
🔴 FILTROS NA BUSCA (YouTube API):
1. publishedAfter = últimos 90 dias ⚠️
2. maxResults = 15 por query
3. type = 'video' (não shorts, não playlists)
4. order = 'relevance'
5. regionCode = 'BR'
6. relevanceLanguage = 'pt'

🔴 FILTROS APÓS A BUSCA (nosso código):
1. MIN_SUBSCRIBERS = 1000 (canal deve ter 1000+ inscritos)
2. MIN_COMMENTS = 20 (vídeo deve ter 20+ comentários)
3. MIN_DURATION = 60 segundos (sem shorts)
4. Excluir IDs já processados

⚠️ PROBLEMA IDENTIFICADO:
O filtro de 90 dias está MUITO RESTRITIVO para um nicho específico como Shamo!
Vídeos antigos mas relevantes estão sendo excluídos.
""")
    
    print("\n🎯 COMPARAÇÃO:")
    print(f"  • Sem filtro de data: {len(search_no_filter.get('items', []))} vídeos")
    print(f"  • Últimos 90 dias: {len(search_90_days.get('items', []))} vídeos")
    print(f"  • Últimos 30 dias: {len(search_30_days.get('items', []))} vídeos")
    print(f"  • Último ano: {len(search_year.get('items', []))} vídeos")

if __name__ == "__main__":
    asyncio.run(test_search_filters())