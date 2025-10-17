#!/usr/bin/env python3
"""
YouTube Search Engine v5 - Sistema Completo Otimizado
Com filtro regional melhorado e filtros de qualidade ajustados
"""

import asyncio
import json
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import httpx
from anthropic import Anthropic
from dotenv import load_dotenv
import os
import re
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

load_dotenv()

# FastAPI app
app = FastAPI(title="YouTube Search Engine v5", version="5.0.0")

class SearchRequest(BaseModel):
    scannerId: int

class YouTubeSearchEngineV5:
    def __init__(self):
        # APIs
        self.youtube_api_key = os.getenv("YOUTUBE_API_KEY")
        self.youtube = build('youtube', 'v3', developerKey=self.youtube_api_key)
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        self.claude = Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))
        
        # Filtros de qualidade AJUSTADOS para mercado brasileiro
        self.MIN_SUBSCRIBERS = 500   # Reduzido de 1000 para 500
        self.MIN_COMMENTS = 10       # Reduzido de 20 para 10
        self.MIN_DURATION = 60        # Mantido 60 segundos
    
    async def get_project_data(self, scanner_id: int) -> Dict:
        """Busca dados completos do projeto incluindo descrição"""
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            # Buscar dados completos do projeto
            response = await client.post(
                f"{self.supabase_url}/rest/v1/rpc/get_projeto_data",
                headers=headers,
                json={"scanner_id": scanner_id}
            )
            result = response.json()
            
            if isinstance(result, list) and len(result) > 0:
                data = result[0]
            elif isinstance(result, dict):
                data = result
            else:
                raise ValueError(f"Resposta inesperada do Supabase: {type(result)} - {str(result)[:200]}")
            
            # MAPEAMENTO CORRETO DOS CAMPOS DO BANCO
            return {
                'scanner_id': scanner_id,
                'palavra_chave': data.get('palavra_chave', ''),
                'projeto_id': data.get('projeto_id'),
                'descricao_projeto': data.get('descricao_projeto', ''),
                'regiao': data.get('pais', 'BR'),  # MAPEAR pais -> regiao
                'videos_excluidos': data.get('ids_negativos', ''),  # MAPEAR ids_negativos -> videos_excluidos
                'palavras_negativas': data.get('palavras_negativas', '')
            }
    
    async def generate_optimized_queries(self, project_data: Dict) -> List[str]:
        """Gera queries otimizadas com Claude adaptadas à região"""
        palavra_chave = project_data.get('palavra_chave', '')
        descricao = project_data.get('descricao_projeto', '')
        region = project_data.get('regiao', 'BR')
        
        # Adaptar prompt baseado na região
        if region == 'BR':
            regional_context = """
MERCADO: Brasil 🇧🇷

ESTRATÉGIA PARA YOUTUBE BRASILEIRO:
- Query 1: Adicione "brasil" ou "brasileiro" ao termo principal
- Query 2: Use "como criar" ou "como fazer" + termo
- Query 3: Use apenas o termo principal simples
- Query 4: Termo + palavra comum BR (venda, criação, ovos)
- Query 5: Variação ou característica + termo"""
        elif region == 'US':
            regional_context = """
MARKET: United States 🇺🇸

US YOUTUBE SEARCH STRATEGY:
- Query 1: Main term + common modifier (chickens, puppies, etc)
- Query 2: "How to" + action + term
- Query 3: Term + "guide" or "tips"
- Query 4: "Best" + term or term + "for sale"
- Query 5: Term + specific trait (giant, pure, etc)"""
        else:
            regional_context = """
MARKET: International

UNIVERSAL STRATEGY:
- Keep queries simple and universal
- Focus on main keywords
- Avoid regional specific terms"""
        
        prompt = f"""Você é um especialista em pesquisa no YouTube. Analise o produto/serviço e gere queries de busca OTIMIZADAS.

PRODUTO/SERVIÇO: {palavra_chave}

CONTEXTO:
{descricao[:500] if descricao else 'Produto/serviço relacionado a ' + palavra_chave}...

{regional_context}

REGRAS IMPORTANTES:
1. Máximo 2-4 palavras por query
2. Use termos que pessoas REALMENTE pesquisam neste mercado
3. Adapte ao contexto regional acima
4. Balance entre específico e genérico

Gere 5 queries SIMPLES e EFETIVAS. Retorne APENAS as queries, uma por linha."""

        response = self.claude.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=200,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}]
        )
        
        queries_text = response.content[0].text.strip()
        return [q.strip() for q in queries_text.split('\n') if q.strip()][:5]
    
    async def search_youtube(self, query: str, project_data: Dict) -> List[Dict]:
        """Busca vídeos no YouTube com filtro regional melhorado"""
        days_back = 90
        published_after = (datetime.now() - timedelta(days=days_back)).isoformat() + 'Z'
        excluded_ids = project_data.get('videos_excluidos', '')
        excluded_list = excluded_ids.split(',') if excluded_ids else []
        region = project_data.get('regiao', 'BR')
        
        videos_found = []
        
        try:
            # Buscar 30 vídeos para ter mais opções
            search_response = self.youtube.search().list(
                q=query,
                part='snippet',
                type='video',
                maxResults=30,
                order='relevance',
                publishedAfter=published_after,
                regionCode=region,  # USAR REGIÃO DINÂMICA
                relevanceLanguage='pt' if region == 'BR' else 'en'  # IDIOMA BASEADO NA REGIÃO
            ).execute()
            
            for item in search_response.get('items', []):
                video_id = item['id']['videoId']
                
                # Pular se está na lista de excluídos
                if video_id in excluded_list:
                    continue
                
                title = item['snippet']['title']
                description = item['snippet'].get('description', '')
                channel = item['snippet']['channelTitle']
                
                # Filtro regional mais inteligente
                title_lower = title.lower()
                desc_lower = description.lower()
                
                # Detectar múltiplos indicadores asiáticos
                asian_specific = ['anakan', 'mantap', 'betul', 'ayam', 'nih', 'keren', 'siap', 'umur']
                asian_count = sum(1 for ind in asian_specific if ind in title_lower or ind in desc_lower)
                
                # Detectar português
                portuguese = ['brasil', 'português', 'como', 'para', 'você', 'criar', 'venda', 'comprar', 'fazenda', 'granja', 'criação', 'galo', 'combatente']
                has_portuguese = any(ind in title_lower or ind in desc_lower or ind in channel.lower() for ind in portuguese)
                
                # Rejeitar APENAS se tiver 3+ indicadores asiáticos E nenhum português
                if asian_count >= 3 and not has_portuguese:
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
                
                videos_found.append(video_data)
                
                # Limitar a 15 vídeos por query
                if len(videos_found) >= 15:
                    break
                    
        except Exception as e:
            print(f"Erro na busca para query '{query}': {e}")
        
        return videos_found
    
    def parse_duration(self, duration: str) -> int:
        """Converte duração ISO 8601 para segundos"""
        pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
        match = pattern.match(duration)
        
        if not match:
            return 0
        
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        
        return hours * 3600 + minutes * 60 + seconds
    
    async def fetch_video_details(self, video_ids: List[str]) -> Dict:
        """Busca detalhes completos dos vídeos"""
        video_details = {}
        
        # YouTube API permite até 50 vídeos por vez
        batch_size = 50
        for i in range(0, len(video_ids), batch_size):
            batch = video_ids[i:i+batch_size]
            
            try:
                videos_response = self.youtube.videos().list(
                    part='statistics,contentDetails,snippet',
                    id=','.join(batch)
                ).execute()
                
                for item in videos_response.get('items', []):
                    video_id = item['id']
                    stats = item.get('statistics', {})
                    details = item.get('contentDetails', {})
                    snippet = item.get('snippet', {})
                    
                    video_details[video_id] = {
                        'view_count': int(stats.get('viewCount', 0)),
                        'like_count': int(stats.get('likeCount', 0)),
                        'comment_count': int(stats.get('commentCount', 0)),
                        'duration_seconds': self.parse_duration(details.get('duration', 'PT0S')),
                        'channel_id': snippet.get('channelId', ''),
                        'tags': snippet.get('tags', []),
                        'category_id': snippet.get('categoryId', '')
                    }
                    
            except Exception as e:
                print(f"Erro ao buscar detalhes: {e}")
        
        return video_details
    
    async def fetch_channel_details(self, channel_ids: List[str]) -> Dict:
        """Busca detalhes dos canais"""
        channel_details = {}
        
        batch_size = 50
        for i in range(0, len(channel_ids), batch_size):
            batch = channel_ids[i:i+batch_size]
            
            try:
                channels_response = self.youtube.channels().list(
                    part='statistics,snippet',
                    id=','.join(batch)
                ).execute()
                
                for item in channels_response.get('items', []):
                    channel_id = item['id']
                    stats = item.get('statistics', {})
                    snippet = item.get('snippet', {})
                    
                    channel_details[channel_id] = {
                        'subscriber_count': int(stats.get('subscriberCount', 0)),
                        'video_count': int(stats.get('videoCount', 0)),
                        'view_count': int(stats.get('viewCount', 0)),
                        'title': snippet.get('title', ''),
                        'country': snippet.get('country', '')
                    }
                    
            except Exception as e:
                print(f"Erro ao buscar canais: {e}")
        
        return channel_details
    
    def apply_filters(self, videos: List[Dict], video_details: Dict, channel_details: Dict) -> List[Dict]:
        """Aplica filtros de qualidade ajustados"""
        filtered_videos = []
        
        for video in videos:
            video_id = video['id']
            channel_id = video.get('channel_id', '')
            
            # Verificar se temos detalhes
            if video_id not in video_details or channel_id not in channel_details:
                continue
            
            details = video_details[video_id]
            channel = channel_details[channel_id]
            
            # Aplicar filtros ajustados
            if (channel['subscriber_count'] >= self.MIN_SUBSCRIBERS and
                details['comment_count'] >= self.MIN_COMMENTS and
                details['duration_seconds'] >= self.MIN_DURATION):
                
                # Adicionar informações completas
                video['details'] = details
                video['channel_info'] = channel
                video['engagement_rate'] = self.calculate_engagement(details)
                filtered_videos.append(video)
        
        return filtered_videos
    
    def calculate_engagement(self, details: Dict) -> float:
        """Calcula taxa de engajamento"""
        views = details.get('view_count', 0)
        if views == 0:
            return 0.0
        
        likes = details.get('like_count', 0)
        comments = details.get('comment_count', 0)
        
        return ((likes + comments) / views) * 100
    
    async def fetch_video_comments(self, video_id: str, max_comments: int = 20) -> List[str]:
        """Busca comentários de um vídeo"""
        try:
            comments_response = self.youtube.commentThreads().list(
                part='snippet',
                videoId=video_id,
                maxResults=max_comments,
                order='relevance',
                textFormat='plainText'
            ).execute()
            
            comments = []
            for item in comments_response.get('items', []):
                comment_text = item['snippet']['topLevelComment']['snippet']['textDisplay']
                comments.append(comment_text[:200])
            
            return comments[:10]  # Máximo 10 comentários
            
        except Exception:
            return []
    
    async def analyze_with_claude(self, videos: List[Dict], project_data: Dict) -> List[str]:
        """Claude analisa e seleciona os 2 melhores vídeos"""
        if len(videos) <= 2:
            return [v['id'] for v in videos]
        
        # Buscar comentários para análise
        for video in videos:
            video['sample_comments'] = await self.fetch_video_comments(video['id'])
        
        # Preparar informações para Claude
        videos_info = []
        for i, video in enumerate(videos, 1):
            info = f"""
VÍDEO {i}:
ID: {video['id']}
Título: {video['title']}
Canal: {video['channel_info']['title']} ({video['channel_info']['subscriber_count']:,} inscritos)
País: {video['channel_info'].get('country', 'N/A')}
Views: {video['details']['view_count']:,}
Comentários: {video['details']['comment_count']}
Engajamento: {video['engagement_rate']:.2f}%

Amostras de comentários:
{chr(10).join(['- ' + c[:100] for c in video.get('sample_comments', [])[:5]])}
"""
            videos_info.append(info)
        
        palavra_chave = project_data.get('palavra_chave', '')
        descricao = project_data.get('descricao_projeto', '')
        
        prompt = f"""Analise os vídeos e selecione os 2 MELHORES para o projeto:

PROJETO:
- Palavra-chave: {palavra_chave}
- Descrição: {descricao[:500]}

CRITÉRIOS (em ordem de importância):
1. RELEVÂNCIA: Deve ser ESPECIFICAMENTE sobre "{palavra_chave}"
2. LOCALIZAÇÃO: Priorize vídeos brasileiros/portugueses
3. INTENÇÃO COMERCIAL: Comentários indicam interesse em comprar/criar
4. ENGAJAMENTO: Taxa de engajamento alta

VÍDEOS:
{''.join(videos_info)}

Retorne APENAS os 2 IDs dos melhores vídeos, um por linha."""

        response = self.claude.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=200,
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}]
        )

        result = response.content[0].text.strip()

        # Extrair IDs
        selected_ids = []
        for line in result.split('\n'):
            match = re.search(r'[A-Za-z0-9_-]{11}', line)
            if match:
                video_id = match.group(0)
                if video_id in [v['id'] for v in videos]:
                    selected_ids.append(video_id)

        # Fallback se não encontrou 2
        if len(selected_ids) < 2:
            sorted_videos = sorted(videos, key=lambda x: x['engagement_rate'], reverse=True)
            selected_ids = [v['id'] for v in sorted_videos[:2]]

        return selected_ids[:2]
    
    async def search_videos(self, scanner_id: int) -> Dict:
        """Executa o processo completo de busca"""
        print(f"\n{'='*80}")
        print("🚀 YOUTUBE SEARCH ENGINE V5 - PROCESSO COMPLETO")
        print(f"{'='*80}\n")
        
        # Etapa 1: Buscar dados do projeto
        print("📋 [Etapa 1/5] Buscando dados do projeto...")
        project_data = await self.get_project_data(scanner_id)
        print(f"   ✅ Projeto: {project_data.get('palavra_chave', 'N/A')}")
        
        # Etapa 2: Gerar queries
        print("\n🤖 [Etapa 2/5] Gerando queries otimizadas...")
        queries = await self.generate_optimized_queries(project_data)
        print(f"   ✅ {len(queries)} queries geradas")
        for i, q in enumerate(queries, 1):
            print(f"      {i}. {q}")
        
        # Etapa 3: Buscar vídeos
        print("\n🔍 [Etapa 3/5] Buscando vídeos no YouTube...")
        region = project_data.get('regiao', 'BR')
        print(f"   📍 Região: {region}")
        
        all_videos = []
        for query in queries:
            videos = await self.search_youtube(query, project_data)
            all_videos.extend(videos)
            print(f"   • Query '{query}': {len(videos)} vídeos")
        
        print(f"   ✅ Total: {len(all_videos)} vídeos encontrados")
        
        if len(all_videos) == 0:
            return {
                'success': False,
                'message': 'Nenhum vídeo encontrado',
                'video_ids': []
            }
        
        # Buscar detalhes
        videos = all_videos
        video_ids = [v['id'] for v in videos]
        channel_ids = list(set([v['channel_id'] for v in videos if 'channel_id' in v]))
        
        print("\n📊 [Etapa 4/5] Aplicando filtros de qualidade...")
        print(f"   • Mínimo de inscritos: {self.MIN_SUBSCRIBERS}")
        print(f"   • Mínimo de comentários: {self.MIN_COMMENTS}")
        print(f"   • Duração mínima: {self.MIN_DURATION}s")
        
        video_details = await self.fetch_video_details(video_ids)
        channel_details = await self.fetch_channel_details(channel_ids)
        
        # Aplicar filtros
        filtered_videos = self.apply_filters(videos, video_details, channel_details)
        print(f"   ✅ {len(filtered_videos)} vídeos aprovados")
        
        if len(filtered_videos) == 0:
            return {
                'success': False,
                'message': 'Nenhum vídeo passou pelos filtros',
                'video_ids': []
            }
        
        # Etapa 5: Seleção final com Claude
        print("\n🤖 [Etapa 5/5] Seleção final com IA...")
        selected_ids = await self.analyze_with_claude(filtered_videos, project_data)
        
        # Preparar resultado
        selected_videos = []
        for video_id in selected_ids:
            for video in filtered_videos:
                if video['id'] == video_id:
                    selected_videos.append(video)
                    break
        
        print(f"   ✅ {len(selected_ids)} vídeos selecionados")
        
        print(f"\n{'='*80}")
        print("🏆 VÍDEOS SELECIONADOS:")
        print(f"{'='*80}")
        
        for i, video in enumerate(selected_videos, 1):
            print(f"\n{i}. {video['title'][:60]}...")
            print(f"   Canal: {video['channel_info']['title']}")
            print(f"   Views: {video['details']['view_count']:,}")
            print(f"   Engajamento: {video['engagement_rate']:.2f}%")
            print(f"   URL: https://youtube.com/watch?v={video['id']}")
        
        print(f"\n🎯 IDs para o Supabase: {','.join(selected_ids)}")
        
        return {
            'success': True,
            'video_ids': selected_ids,
            'video_ids_string': ','.join(selected_ids),
            'selected_videos': selected_videos,
            'total_analyzed': len(filtered_videos)
        }

# FastAPI endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "5.0.0"}

@app.post("/search")
async def search_videos(request: SearchRequest):
    """Endpoint principal para buscar vídeos"""
    try:
        engine = YouTubeSearchEngineV5()
        result = await engine.search_videos(request.scannerId)
        
        if result['success']:
            return {
                "success": True,
                "text": result['video_ids_string'],
                "data": result
            }
        else:
            error_message = 'Erro na busca'
            if isinstance(result, dict) and 'message' in result:
                error_message = result['message']
            return {
                "success": False,
                "text": "",
                "message": error_message
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "YouTube Search Engine v5",
        "version": "5.0.0",
        "endpoints": ["/search", "/health"]
    }

async def main():
    """Função principal para testes locais"""
    scanner_id = 469  # ID do scanner para teste
    
    engine = YouTubeSearchEngineV5()
    result = await engine.search_videos(scanner_id)
    
    # Salvar resultado
    with open('resultado_v5.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 Resultado salvo em 'resultado_v5.json'")
    
    return result

if __name__ == "__main__":
    # Se executado diretamente, inicia o servidor
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    print(f"🚀 Iniciando YouTube Search Engine v5 em {host}:{port}")
    uvicorn.run(app, host=host, port=port)