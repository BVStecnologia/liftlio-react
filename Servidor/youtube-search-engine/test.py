#!/usr/bin/env python3
"""
Teste do YouTube Search Engine v4 com análise semântica
"""

import asyncio
import logging
from youtube_search_engine import YouTubeSearchEngineV4
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def test_scanner():
    load_dotenv()
    
    engine = YouTubeSearchEngineV4()
    scanner_id = 469
    
    print(f"\n{'='*60}")
    print(f"🧪 TESTE V4 - Scanner {scanner_id}")
    print(f"{'='*60}\n")
    
    result = await engine.process_scanner(scanner_id)
    
    print("\n📊 RESULTADO:")
    print(f"Success: {result.get('success', False)}")
    print(f"Video IDs: {result.get('video_ids', 'None')}")
    
    if result.get('success'):
        print(f"\n📈 ESTATÍSTICAS:")
        print(f"  Total encontrado: {result.get('total_found', 0)}")
        print(f"  Após filtros: {result.get('filtered_count', 0)}")
        print(f"  Selecionados: {result.get('relevant_found', 0)}")
        print(f"  Estratégia: {result.get('strategy_used', 'unknown')}")
        
        if result.get('video_ids'):
            video_ids = result['video_ids'].split(',')
            print(f"\n🎥 VÍDEOS SELECIONADOS:")
            for i, vid_id in enumerate(video_ids, 1):
                print(f"  {i}. https://youtube.com/watch?v={vid_id}")
    else:
        print(f"\n❌ ERRO: {result.get('error', 'Unknown error')}")
    
    print(f"\n{'='*60}\n")
    
    return result

if __name__ == "__main__":
    asyncio.run(test_scanner())