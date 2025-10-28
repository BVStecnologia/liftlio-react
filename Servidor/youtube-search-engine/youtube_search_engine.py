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

    async def get_blocked_channels(self, project_id: int) -> set:
        """Busca canais bloqueados via RPC get_blocked_channels (batch)"""
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.supabase_url}/rest/v1/rpc/get_blocked_channels",
                    headers=headers,
                    json={"p_project_id": project_id}
                )
                result = response.json()

                # Se retornar lista de dicts, extrair channel_id
                if isinstance(result, list) and len(result) > 0:
                    if isinstance(result[0], dict):
                        # Extrair channel_id de cada dict
                        channel_ids = [item.get('channel_id', item.get('youtube_channel_id', ''))
                                     for item in result if item]
                        return set(channel_ids)
                    else:
                        # Lista de strings simples
                        return set(result)

                return set()
        except Exception as e:
            print(f"Erro ao buscar canais bloqueados: {e}")
            return set()

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

            return comments[:20]  # MELHORIA #1: Dobrado de 10 para 20 comentários

        except Exception:
            return []

    def get_video_channel_map(self, video_data_list: List[Dict]) -> Dict:
        """Mapeia channel_id → lista de índices de vídeos"""
        channel_map = {}
        for idx, video in enumerate(video_data_list):
            channel_id = video.get('channel_id', '')
            if channel_id not in channel_map:
                channel_map[channel_id] = []
            channel_map[channel_id].append(idx)
        return channel_map

    def apply_channel_diversification(self, video_list: List[Dict]) -> List[Dict]:
        """Mantém apenas 1 vídeo por canal (maior view_count)"""
        channel_map = self.get_video_channel_map(video_list)

        selected_videos = []
        for channel_id, indices in channel_map.items():
            if len(indices) == 1:
                selected_videos.append(video_list[indices[0]])
            else:
                # Múltiplos vídeos do mesmo canal - pegar o com maior view_count
                best_video = max(
                    [video_list[i] for i in indices],
                    key=lambda v: v.get('details', {}).get('view_count', 0)
                )
                selected_videos.append(best_video)

        before_count = len(video_list)
        after_count = len(selected_videos)
        print(f"   🎯 Diversificação de canais: {before_count} → {after_count} vídeos")

        return selected_videos

    async def extract_project_intelligence(self, project_description: str, search_keyword: str) -> Dict:
        """
        FASE 1: Extrai inteligência DINÂMICA da descrição do projeto usando Haiku.

        Retorna perfil completo: problema, público-alvo, sinais de fundo de funil, semânticas.
        """
        if not project_description or len(project_description) < 50:
            # Fallback GENÉRICO se não tiver descrição
            return {
                'problema_central': f'Necessidades relacionadas a {search_keyword}',
                'publico_alvo': ['pessoas interessadas em ' + search_keyword, 'usuários potenciais'],
                'dores_especificas': ['precisa de solução', 'buscando ajuda'],
                'sinais_fundo_funil': ['preciso', 'vou', 'quero', 'como faço', 'onde encontro'],
                'sinais_urgencia_temporal': ['agora', 'urgente', 'hoje', 'amanhã'],
                'sinais_implementacao': ['estou', 'vou', 'começando', 'tentando'],
                'semanticas_relacionadas': [search_keyword]
            }

        prompt = f"""Analise esta descrição de projeto e extraia PERFIL DE PÚBLICO-ALVO para buscar comentários relevantes no YouTube.

DESCRIÇÃO DO PROJETO:
{project_description[:1500]}

PALAVRA-CHAVE PRINCIPAL: {search_keyword}

Retorne JSON (sem markdown) com:
{{
  "problema_central": "QUAL problema este projeto resolve? (1 frase curta)",
  "publico_alvo": ["tipo1", "tipo2", "tipo3"],  // Ex: "donos de ecommerce", "criadores SaaS"
  "dores_especificas": ["dor1", "dor2"],  // Ex: "CAC alto", "sem tráfego"
  "sinais_fundo_funil": ["palavra1", "palavra2", "frase1"],  // Ex: "vou lançar", "preciso urgente", "semana que vem"
  "sinais_urgencia_temporal": ["temporal1", "temporal2"],  // Ex: "amanhã", "hoje", "agora"
  "sinais_implementacao": ["acao1", "acao2"],  // Ex: "estou criando", "montando", "começando"
  "semanticas_relacionadas": ["termo1", "termo2", "termo3"]  // Variações do problema
}}

CRÍTICO: Extraia DINAMI CAMENTE do texto, não invente! Se não encontrar, retorne array vazio.
"""

        try:
            response = self.claude.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=800,
                temperature=0.2,
                messages=[{"role": "user", "content": prompt}]
            )

            result_text = response.content[0].text.strip()

            # Remove markdown
            if result_text.startswith('```'):
                result_text = re.sub(r'^```(?:json)?\n', '', result_text)
                result_text = re.sub(r'\n```$', '', result_text)

            intelligence = json.loads(result_text)
            print(f"\n   🧠 Inteligência extraída:")
            print(f"      • Problema: {intelligence.get('problema_central', 'N/A')[:60]}...")
            print(f"      • Público-alvo: {len(intelligence.get('publico_alvo', []))} perfis")
            print(f"      • Sinais fundo funil: {len(intelligence.get('sinais_fundo_funil', []))} sinais")

            return intelligence

        except Exception as e:
            print(f"   ⚠️ Erro ao extrair inteligência: {e}")
            # Fallback GENÉRICO em caso de erro
            return {
                'problema_central': f'Necessidades relacionadas a {search_keyword}',
                'publico_alvo': ['pessoas interessadas em ' + search_keyword, 'usuários potenciais'],
                'dores_especificas': ['precisa de solução', 'buscando ajuda'],
                'sinais_fundo_funil': ['preciso', 'vou', 'quero', 'como faço', 'onde encontro'],
                'sinais_urgencia_temporal': ['agora', 'urgente', 'hoje', 'amanhã'],
                'sinais_implementacao': ['estou', 'vou', 'começando', 'tentando'],
                'semanticas_relacionadas': [search_keyword]
            }

    async def pre_check_video_quality(self, video: Dict, intelligence: Dict) -> Dict:
        """
        🚪 GATE #1: Pre-check de qualidade ANTES de gastar dinheiro com Haiku.

        Rejeita vídeos educacionais longos, engagement baixo e comentários vazios.
        Economiza ~60% dos custos em scanners ruins.

        Returns: {"should_analyze": bool, "rejection_reason": str}
        """
        duration = video['details'].get('duration_seconds', 0)
        title = video['title'].lower()
        description = video.get('description', '').lower()
        engagement_rate = video.get('engagement_rate', 0)

        # === RED FLAG #1: Cursos educacionais muito longos ===
        # Atraem ESTUDANTES, não COMPRADORES
        educational_keywords = [
            'complete course', 'full course', 'masterclass',
            'complete tutorial', 'full tutorial',
            'step by step guide', 'from scratch',
            'for beginners', 'beginner guide',
            'everything you need to know',
            'curso completo', 'tutorial completo'
        ]

        if duration > 7200:  # >2 horas
            if any(kw in title or kw in description for kw in educational_keywords):
                return {
                    "should_analyze": False,
                    "rejection_reason": f"Educational course (>{duration/3600:.1f}h) - attracts students, not buyers"
                }

        if duration > 3600:  # >1 hora
            # Mais permissivo, mas filtrar cursos completos
            strict_keywords = ['complete course', 'full course', 'masterclass', 'curso completo']
            if any(kw in title for kw in strict_keywords):
                return {
                    "should_analyze": False,
                    "rejection_reason": f"Long masterclass ({duration/3600:.1f}h) - low buyer intent"
                }

        # === RED FLAG #2: Engagement muito baixo ===
        if engagement_rate < 1.5:
            return {
                "should_analyze": False,
                "rejection_reason": f"Low engagement ({engagement_rate:.2f}%) - passive audience"
            }

        # === RED FLAG #3: Comentários muito curtos (gratidão vazia) ===
        sample_comments = video.get('sample_comments', [])
        if len(sample_comments) >= 3:
            avg_length = sum(len(c) for c in sample_comments) / len(sample_comments)

            if avg_length < 25:  # Média <25 chars
                # Verificar se são só gratidão
                gratitude_keywords = ['thank', 'thanks', 'obrigado', 'great', 'amazing', 'awesome', 'love']
                gratitude_count = sum(1 for c in sample_comments[:5]
                                    if any(kw in c.lower() for kw in gratitude_keywords)
                                    and len(c) < 50)

                if gratitude_count >= 3:  # >=3 de 5 são gratidão curta
                    return {
                        "should_analyze": False,
                        "rejection_reason": f"Comments too short (avg {avg_length:.0f} chars) + high gratitude rate ({gratitude_count}/5)"
                    }

        # === GREEN LIGHT: Vale a pena gastar Haiku ===
        return {
            "should_analyze": True,
            "rejection_reason": None
        }

    async def filter_and_diversify_with_haiku(
        self,
        video_data_list: List[Dict],
        search_keyword: str,
        project_id: str,
        project_description: str,
        max_videos: int = 10
    ) -> List[Dict]:
        """
        FASE 3: Usa Claude Haiku 4.5 para filtrar vídeos baseado em análise DINÂMICA de comentários.

        Returns: Lista de dicts de vídeos (preserva estrutura original - CRÍTICO!)
        """
        if len(video_data_list) <= max_videos:
            return video_data_list

        # FASE 1: Extrair inteligência do projeto
        print(f"\n   🧠 [Fase 1] Extraindo inteligência do projeto...")
        project_intel = await self.extract_project_intelligence(project_description, search_keyword)

        # FASE 2: Buscar e pré-filtrar comentários (Python) + Pre-check de qualidade
        print(f"\n   📝 [Fase 2] Buscando comentários de {len(video_data_list)} vídeos...")

        videos_to_analyze = []
        skipped_videos = 0

        for video in video_data_list:
            if 'sample_comments' not in video:
                raw_comments = await self.fetch_video_comments(video['id'], max_comments=20)

                # Pré-filtro Python: Remove spam, muito curtos, links
                filtered = []
                for comment in raw_comments:
                    # Limpar texto
                    text = comment.strip()

                    # Filtros básicos
                    if len(text) < 20:  # Muito curto
                        continue

                    # MELHORIA #1: Filtro expandido de spam (crypto, investment, engagement bait)
                    spam_keywords = [
                        # Links e mentions
                        'http://', 'https://', 'www.', '@', 'bit.ly',
                        # Crypto/Investment spam
                        'bitcoin', 'btc', 'crypto', 'cryptocurrency',
                        'meme coin', 'memecoin', 'shiba', 'doge',
                        'investment opportunity', 'trading', 'forex',
                        'retirement', 'i pray that', 'multi millionaire',
                        'make money fast', 'passive income',
                        # Engagement bait
                        'click here', 'check out', 'dm me',
                        'whatsapp', 'telegram', 'signal',
                        # Scam patterns
                        'work for 42', 'lost my money', 'gained $'
                    ]
                    if any(spam in text.lower() for spam in spam_keywords):
                        continue

                    if text.count('!') > 3 or text.count('?') > 3:  # Excesso de pontuação (spam)
                        continue

                    filtered.append(text)

                video['sample_comments'] = filtered[:12]  # MELHORIA #1: Aumentado de 8 para 12 comentários

            # 🚪 MELHORIA #3: Pre-check de qualidade ANTES de gastar Haiku
            pre_check = await self.pre_check_video_quality(video, project_intel)

            if not pre_check['should_analyze']:
                print(f"   ⏭️  Skipping video {video['id']}: {pre_check['rejection_reason']}")
                skipped_videos += 1
                continue

            # Vídeo passou no pre-check, adicionar à lista
            videos_to_analyze.append(video)

        print(f"   ✅ Pre-check concluído: {len(videos_to_analyze)} vídeos aprovados, {skipped_videos} rejeitados")

        # Se não sobrou nenhum vídeo, retornar vazio
        if not videos_to_analyze:
            print("   ⚠️  Nenhum vídeo passou no pre-check!")
            return []

        # FASE 3: Análise inteligente com Haiku (apenas vídeos aprovados no pre-check)
        print(f"\n   🔍 [Fase 3] Análise inteligente dos comentários com Haiku...")

        # Criar resumo COM análise de comentários (apenas vídeos que passaram no pre-check)
        video_summary = []
        for video in videos_to_analyze:
            comments_sample = video.get('sample_comments', [])[:12]  # MELHORIA #1: Dobrado de 6 para 12

            summary = {
                'video_id': video['id'],
                'channel_id': video.get('channel_id', ''),
                'title': video['title'][:100],
                'view_count': video.get('details', {}).get('view_count', 0),
                'comment_count': video.get('details', {}).get('comment_count', 0),
                'engagement_rate': video.get('engagement_rate', 0),
                'sample_comments': comments_sample
            }
            video_summary.append(summary)

        # Serializar vídeos separadamente (SOLUÇÃO: evita f-string com JSON complexo)
        videos_json_str = json.dumps(video_summary, ensure_ascii=False, indent=2)

        # Prompt INTELIGENTE baseado no perfil extraído
        haiku_prompt = f"""Você é um agente especialista em encontrar PÚBLICO-ALVO CORRETO no YouTube.

🎯 PERFIL DO PÚBLICO-ALVO (extraído dinamicamente):

PROBLEMA QUE O PRODUTO RESOLVE:
{project_intel.get('problema_central', 'N/A')}

PÚBLICO-ALVO IDEAL:
{', '.join(project_intel.get('publico_alvo', []))}

DORES ESPECÍFICAS QUE TÊM:
{', '.join(project_intel.get('dores_especificas', []))}

SINAIS DE FUNDO DE FUNIL (procure nos comentários):
• Urgência temporal: {', '.join(project_intel.get('sinais_urgencia_temporal', []))}
• Fase de implementação: {', '.join(project_intel.get('sinais_implementacao', []))}
• Linguagem de necessidade: {', '.join(project_intel.get('sinais_fundo_funil', []))}

SEMÂNTICAS RELACIONADAS:
{', '.join(project_intel.get('semanticas_relacionadas', []))}

────────────────────────────────────────────────────────────

VÍDEOS PARA ANALISAR ({len(videos_to_analyze)} total, após pre-check):
{videos_json_str}

────────────────────────────────────────────────────────────

🎯 MISSÃO: Selecione os {max_videos} MELHORES vídeos com comentários do PÚBLICO-ALVO CORRETO.

CRITÉRIOS DE SELEÇÃO (prioridade):

1. **PÚBLICO-ALVO CORRETO** (40 pontos):
   - Comentários de pessoas que SÃO o público-alvo?
   - Não curiosos genéricos ou elogios vazios

2. **SINAIS DE FUNDO DE FUNIL** (35 pontos):
   - Urgência temporal? ("vou lançar semana que vem", "começando agora")
   - Fase de ação? ("estou criando", "montando", "precisava disso")
   - Linguagem de necessidade forte? ("preciso", "quero fazer", "como faço")

3. **PROBLEMA/DOR ESPECÍFICA** (20 pontos):
   - Comentários mencionam dores que o produto resolve?
   - Problema claro e específico?

4. **DIVERSIDADE DE CANAIS** (5 pontos):
   - Max 1 vídeo por channel_id

❌ REJEITAR IMEDIATAMENTE (mesmo se órfão ou alta relevância):

1. **GRATIDÃO VAZIA** - Rejeitar se comentário é APENAS:
   - "thank you" / "obrigado" SEM contexto de negócio ou ação
   - "great video" / "ótimo vídeo" / "love this" SEM pergunta
   - "amazing" / "incrível" / "awesome" SEM aplicação
   - Elogios genéricos sem substância estratégica

2. **FASE DE CONSUMO** (NÃO é fundo de funil):
   - "I learned" / "aprendi" SEM "vou implementar"
   - "I understood" / "entendi" SEM ação futura
   - "saved to watch later" / "salvei para depois" = fase de PESQUISA
   - "I watch your videos" / "assisto seus vídeos" = espectador passivo
   - "makes sense" / "faz sentido" SEM contexto de implementar

3. **FEEDBACK EDUCACIONAL** (sem valor estratégico):
   - "explained well" / "explicou bem" SEM dúvida ou aplicação
   - "easy to understand" / "fácil de entender" SEM contexto de negócio
   - Comentários sobre QUALIDADE do vídeo (não sobre resolver problema)

4. **INTERESSE NO VLOGGER** (não no problema):
   - Pessoas interessadas no CURSO/PRODUTO do criador
   - Perguntas sobre "onde comprar seu curso"
   - Elogios ao criador sem mencionar problema próprio

5. **SPAM/OFF-TOPIC**:
   - Crypto, investimento, trading (já filtrado no Python)
   - Promoções de ferramentas
   - Completamente fora do tema

🎯 REGRA DE OURO:
   Se comentário = (gratidão OU feedback educacional) E NÃO tem (problema OU dúvida OU "vou fazer"):
   → REJEITAR sem exceção

✅ EXEMPLO BOM vs RUIM:
   ❌ "Thank you! Great explanation!" → Gratidão vazia
   ✅ "Thank you! I'm launching my store next week, this helped!" → Gratidão + AÇÃO + URGÊNCIA

   ❌ "I always learn from your videos" → Espectador passivo
   ✅ "I'm struggling with cold calls like you mentioned, any tips?" → Dor específica + pedido

✅ EXEMPLO DE COMENTÁRIO PERFEITO:
"precisava dessa informação, vou começar/lançar [projeto] na semana que vem"
(Motivo: urgência temporal + fase de ação + necessidade clara)

Outros exemplos válidos:
- "estou começando agora, preciso urgente dessa solução"
- "tenho esse problema há meses, onde posso encontrar ajuda?"
- "vou implementar isso amanhã na minha empresa"

────────────────────────────────────────────────────────────

🚨 MELHORIA #1 - CONFIDENCE CHECK OBRIGATÓRIO:

Você está analisando {len(video_summary[0].get('sample_comments', []))} comentários por vídeo.
CRÍTICO: Julgue APENAS os comentários fornecidos.
NÃO assuma que existam melhores comentários fora desta amostra.
NÃO invente que "pessoas estão implementando" se você NÃO VIU isso explicitamente.

Para CADA vídeo aprovado, você DEVE:
1. Identificar QUANTOS comentários são realmente bons (APPROVE)
2. Se <25% são bons → REJEITAR o vídeo (sample insuficiente)
3. Para cada comentário aprovado, CITAR a frase literal que justifica

Formato de análise por vídeo:
- Total de comentários analisados: X
- Comentários aprovados: Y (Y/X = Z%)
- Se Z < 25% → REJEITAR vídeo automaticamente

────────────────────────────────────────────────────────────

🕒 MELHORIA #7 - SCORING DE URGÊNCIA TEMPORAL:

Classifique cada comentário bom por nível de urgência:

**URGÊNCIA MÁXIMA (35 pontos):**
- "hoje", "agora", "neste momento"
- "amanhã", "esta semana"
- "começando hoje", "lançando amanhã"

**URGÊNCIA ALTA (25 pontos):**
- "semana que vem", "próxima semana"
- "em breve", "nos próximos dias"
- "vou começar", "vou lançar" (sem data específica)

**URGÊNCIA MÉDIA (15 pontos):**
- "este mês", "próximo mês"
- "estou criando" (sem deadline)
- "planejando para" + data futura

**URGÊNCIA FRACA (5 pontos):**
- "em alguns meses", "no futuro"
- "pensando em", "considerando"
- "algum dia", "eventualmente"

**SEM URGÊNCIA (0 pontos):**
- Sem menção temporal
- "já fiz", "fiz há X tempo" (passado)

PRIORIDADE: Vídeos com mais comentários de urgência MÁXIMA/ALTA devem ser selecionados primeiro.

────────────────────────────────────────────────────────────

Responda JSON (sem markdown):
{{
  "selected_video_ids": ["id1", "id2", ...],
  "reasoning": "1-2 frases explicando POR QUE estes vídeos (cite evidências literais)",
  "videos_analysis": [
    {{
      "video_id": "id",
      "total_comments_analyzed": 12,
      "approved_comments": 4,
      "approval_rate": 0.33,
      "decision": "APPROVE ou REJECT",
      "best_comments_with_urgency": [
        {{
          "text": "citação literal do comentário",
          "urgency_level": "MÁXIMA/ALTA/MÉDIA/FRACA/SEM",
          "urgency_score": 35,
          "reason": "urgência temporal + fase de implementação"
        }}
      ]
    }}
  ]
}}

"""

        try:
            # SOLUÇÃO: Usar prefill com "{" para forçar JSON válido (Anthropic best practice)
            response = self.claude.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=8000,  # FIX: Aumentado de 1500 → 8000 para evitar truncamento de JSON (Haiku 4.5 suporta 64k)
                temperature=0.3,
                messages=[
                    {"role": "user", "content": haiku_prompt},
                    {"role": "assistant", "content": "{"}  # Prefill: força JSON desde o início
                ]
            )

            # Reconstruir JSON completo (prefill + resposta)
            result_text = "{" + response.content[0].text.strip()

            # Salvar JSON bruto para debug (APENAS se houver erro)
            raw_json_for_debug = result_text

            # Remover markdown code blocks se existir (improvável com prefill)
            if result_text.startswith('```'):
                result_text = re.sub(r'^```(?:json)?\n', '', result_text)
                result_text = re.sub(r'\n```$', '', result_text)

            # Tentar parsing direto
            try:
                result = json.loads(result_text)
            except json.JSONDecodeError as parse_error:
                # Fallback: sanitização adicional
                print(f"   ⚠️ JSON parse error na primeira tentativa (posição {parse_error.pos})")
                print(f"   📄 Salvando JSON bruto em debug_haiku_response.json para análise...")

                # Salvar para debug
                with open('debug_haiku_response.json', 'w', encoding='utf-8') as f:
                    f.write(raw_json_for_debug)

                # Tentar sanitização
                sanitized_text = result_text.replace('\r\n', ' ').replace('\n', ' ').replace('\r', ' ')
                sanitized_text = re.sub(r'\s+', ' ', sanitized_text)  # Normalizar espaços

                try:
                    result = json.loads(sanitized_text)
                    print(f"   ✅ Recuperado com sanitização de espaços!")
                except json.JSONDecodeError as second_error:
                    # Último recurso: capturar até onde é válido
                    print(f"   ❌ Falha na sanitização. Erro: {second_error}")
                    raise ValueError(f"JSON inválido mesmo após sanitização. Verifique debug_haiku_response.json")
            selected_ids = result.get('selected_video_ids', [])
            reasoning = result.get('reasoning', 'N/A')

            # Mapear IDs de volta para vídeos originais (apenas dos aprovados no pre-check!)
            selected_videos = []
            for video_id in selected_ids:
                for video in videos_to_analyze:
                    if video['id'] == video_id:
                        selected_videos.append(video)
                        break

            # Calcular custo (estimativa)
            input_tokens = len(json.dumps(video_summary)) // 4
            output_tokens = len(result_text) // 4
            haiku_cost = (input_tokens * 0.00025 / 1000) + (output_tokens * 0.00125 / 1000)

            print(f"   🟡 Haiku selecionou: {len(selected_videos)} vídeos diversos")
            print(f"   💡 Raciocínio: {reasoning}")
            print(f"   💰 Custo Haiku: ${haiku_cost:.4f}")

            return selected_videos

        except Exception as e:
            print(f"   ⚠️ Erro no Haiku (fallback para view_count): {e}")
            # Fallback: aplicar diversificação e ordenar por view_count (apenas videos aprovados)
            diversified = self.apply_channel_diversification(videos_to_analyze)
            sorted_videos = sorted(
                diversified,
                key=lambda x: x.get('details', {}).get('view_count', 0),
                reverse=True
            )
            return sorted_videos[:max_videos]

    async def analyze_with_claude(self, videos: List[Dict], project_data: Dict) -> List[str]:
        """Claude analisa e seleciona os 2 MELHORES vídeos (com camada Haiku de diversificação)"""
        if len(videos) <= 2:
            return [v['id'] for v in videos]

        # NOVA CAMADA HAIKU: Filtragem INTELIGENTE com análise dinâmica (se >10 vídeos)
        if len(videos) > 10:
            print(f"\n   🟡 [Camada Haiku Inteligente] Filtrando {len(videos)} vídeos → 10 melhores")
            palavra_chave = project_data.get('palavra_chave', '')
            projeto_id = project_data.get('projeto_id', '')
            projeto_descricao = project_data.get('descricao_projeto', '')

            videos = await self.filter_and_diversify_with_haiku(
                video_data_list=videos,
                search_keyword=palavra_chave,
                project_id=projeto_id,
                project_description=projeto_descricao,
                max_videos=10
            )
            print(f"   ✅ Haiku retornou: {len(videos)} vídeos com público-alvo correto\n")

        # Buscar comentários para análise do Sonnet (se ainda não tiver)
        for video in videos:
            if 'sample_comments' not in video:
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

CONTEXTO COMPLETO DO PROJETO:
{descricao if descricao else f'Projeto relacionado a: {palavra_chave}'}

PALAVRA-CHAVE: {palavra_chave}

CRITÉRIOS (em ordem de importância):
1. PÚBLICO-ALVO CORRETO: Os comentários devem ser de pessoas que são o PÚBLICO-ALVO deste projeto (leia o contexto!)
2. DORES/PROBLEMAS: Comentários mostram PROBLEMAS que este projeto resolve
3. INTENÇÃO COMERCIAL: Comentários indicam NECESSIDADE da solução, interesse em comprar/investir
4. QUALIDADE DOS LEADS: Comentários de empreendedores/negócios, não curiosos genéricos
5. ENGAJAMENTO: Taxa de engajamento alta

VÍDEOS:
{''.join(videos_info)}

Retorne os IDs dos 2 melhores vídeos, um por linha."""

        response = self.claude.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=300,
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

        # Fallback se não encontrou
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

        # Filtrar canais bloqueados (anti-spam)
        project_id = project_data.get('projeto_id')
        blocked_channels = await self.get_blocked_channels(project_id)
        if blocked_channels:
            all_videos = [v for v in all_videos if v.get('channel_id') not in blocked_channels]
            print(f"   🚫 Canais bloqueados filtrados: {len(all_videos)} vídeos restantes")

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