#!/usr/bin/env python3
"""
ETAPA 3 - Buscar Detalhes e Aplicar Filtros de Qualidade
Este arquivo busca estatísticas detalhadas e aplica filtros de qualidade
"""

import asyncio
import json
from typing import Dict, List, Optional
from datetime import datetime
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from dotenv import load_dotenv
import os

load_dotenv()

class Etapa3FiltrarVideos:
    def __init__(self):
        self.youtube_api_key = os.getenv("YOUTUBE_API_KEY")
        self.youtube = build('youtube', 'v3', developerKey=self.youtube_api_key)
        
        # Filtros de qualidade
        self.MIN_SUBSCRIBERS = 1000  # Canal deve ter 1000+ inscritos
        self.MIN_COMMENTS = 20       # Vídeo deve ter 20+ comentários
        self.MIN_DURATION = 60        # Vídeo deve ter mais de 60 segundos
    
    def load_previous_results(self) -> Dict:
        """Carrega resultados da etapa 2"""
        try:
            with open('etapa_2_resultados.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print("❌ Arquivo 'etapa_2_resultados.json' não encontrado!")
            print("   Execute primeiro a etapa_2_buscar_youtube.py")
            return None
    
    def parse_duration(self, duration: str) -> int:
        """Converte duração ISO 8601 para segundos"""
        # PT15M33S -> 933 segundos
        # PT1H2M10S -> 3730 segundos
        import re
        
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
        print(f"\n📊 Buscando detalhes de {len(video_ids)} vídeos...")
        
        video_details = {}
        
        # YouTube API permite até 50 vídeos por vez
        batch_size = 50
        for i in range(0, len(video_ids), batch_size):
            batch = video_ids[i:i+batch_size]
            
            try:
                # Buscar estatísticas dos vídeos
                videos_response = self.youtube.videos().list(
                    part='statistics,contentDetails,snippet',
                    id=','.join(batch)
                ).execute()
                
                for item in videos_response.get('items', []):
                    video_id = item['id']
                    
                    # Extrair estatísticas
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
                    
            except HttpError as e:
                print(f"❌ Erro ao buscar detalhes: {e}")
            except Exception as e:
                print(f"❌ Erro: {e}")
        
        print(f"✅ Detalhes obtidos para {len(video_details)} vídeos")
        return video_details
    
    async def fetch_channel_details(self, channel_ids: List[str]) -> Dict:
        """Busca detalhes dos canais"""
        print(f"\n📺 Buscando detalhes de {len(channel_ids)} canais...")
        
        channel_details = {}
        
        # YouTube API permite até 50 canais por vez
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
                    
            except HttpError as e:
                print(f"❌ Erro ao buscar canais: {e}")
            except Exception as e:
                print(f"❌ Erro: {e}")
        
        print(f"✅ Detalhes obtidos para {len(channel_details)} canais")
        return channel_details
    
    def apply_filters(self, videos: List[Dict], video_details: Dict, channel_details: Dict) -> Dict:
        """Aplica filtros de qualidade nos vídeos"""
        print(f"\n{'='*80}")
        print("🔍 APLICANDO FILTROS DE QUALIDADE")
        print(f"{'='*80}\n")
        
        print(f"📋 Filtros configurados:")
        print(f"  • Mínimo de inscritos no canal: {self.MIN_SUBSCRIBERS}")
        print(f"  • Mínimo de comentários no vídeo: {self.MIN_COMMENTS}")
        print(f"  • Duração mínima: {self.MIN_DURATION} segundos\n")
        
        filtered_videos = []
        rejection_reasons = {
            'no_details': [],
            'no_channel': [],
            'low_subscribers': [],
            'low_comments': [],
            'too_short': [],
            'multiple_reasons': []
        }
        
        for video in videos:
            video_id = video['id']
            channel_id = video.get('channel_id', '')
            
            # Verificar se temos detalhes do vídeo
            if video_id not in video_details:
                rejection_reasons['no_details'].append(video_id)
                continue
            
            # Verificar se temos detalhes do canal
            if channel_id not in channel_details:
                rejection_reasons['no_channel'].append(video_id)
                continue
            
            details = video_details[video_id]
            channel = channel_details[channel_id]
            
            # Aplicar filtros
            failures = []
            
            # Filtro 1: Inscritos no canal
            if channel['subscriber_count'] < self.MIN_SUBSCRIBERS:
                failures.append(f"inscritos: {channel['subscriber_count']} < {self.MIN_SUBSCRIBERS}")
            
            # Filtro 2: Comentários no vídeo
            if details['comment_count'] < self.MIN_COMMENTS:
                failures.append(f"comentários: {details['comment_count']} < {self.MIN_COMMENTS}")
            
            # Filtro 3: Duração do vídeo
            if details['duration_seconds'] < self.MIN_DURATION:
                failures.append(f"duração: {details['duration_seconds']}s < {self.MIN_DURATION}s")
            
            # Se passou em todos os filtros
            if not failures:
                # Adicionar informações completas ao vídeo
                video['details'] = details
                video['channel_info'] = channel
                video['engagement_rate'] = self.calculate_engagement(details)
                filtered_videos.append(video)
                
                print(f"✅ APROVADO: {video['title'][:50]}...")
                print(f"   Canal: {channel['title']} ({channel['subscriber_count']:,} inscritos)")
                print(f"   Vídeo: {details['view_count']:,} views, {details['comment_count']} comentários")
                print(f"   Duração: {details['duration_seconds']}s")
                print(f"   Engajamento: {video['engagement_rate']:.2f}%\n")
            else:
                # Categorizar rejeição
                if len(failures) == 1:
                    if 'inscritos' in failures[0]:
                        rejection_reasons['low_subscribers'].append(video_id)
                    elif 'comentários' in failures[0]:
                        rejection_reasons['low_comments'].append(video_id)
                    elif 'duração' in failures[0]:
                        rejection_reasons['too_short'].append(video_id)
                else:
                    rejection_reasons['multiple_reasons'].append(video_id)
                
                print(f"❌ REJEITADO: {video['title'][:50]}...")
                for failure in failures:
                    print(f"   • {failure}")
                print()
        
        return {
            'filtered_videos': filtered_videos,
            'rejection_reasons': rejection_reasons,
            'total_approved': len(filtered_videos),
            'total_rejected': len(videos) - len(filtered_videos)
        }
    
    def calculate_engagement(self, details: Dict) -> float:
        """Calcula taxa de engajamento do vídeo"""
        views = details.get('view_count', 0)
        if views == 0:
            return 0.0
        
        likes = details.get('like_count', 0)
        comments = details.get('comment_count', 0)
        
        return ((likes + comments) / views) * 100
    
    def analyze_filtered_results(self, filter_results: Dict):
        """Analisa e exibe estatísticas dos resultados filtrados"""
        print(f"\n{'='*80}")
        print("📊 ANÁLISE DOS FILTROS")
        print(f"{'='*80}\n")
        
        filtered_videos = filter_results['filtered_videos']
        rejection_reasons = filter_results['rejection_reasons']
        
        # Estatísticas gerais
        print(f"📈 ESTATÍSTICAS GERAIS:")
        print(f"  ✅ Aprovados: {filter_results['total_approved']} vídeos")
        print(f"  ❌ Rejeitados: {filter_results['total_rejected']} vídeos")
        print(f"  📊 Taxa de aprovação: {(filter_results['total_approved'] / (filter_results['total_approved'] + filter_results['total_rejected']) * 100):.1f}%\n")
        
        # Motivos de rejeição
        print(f"❌ MOTIVOS DE REJEIÇÃO:")
        print(f"  • Poucos inscritos no canal: {len(rejection_reasons['low_subscribers'])} vídeos")
        print(f"  • Poucos comentários: {len(rejection_reasons['low_comments'])} vídeos")
        print(f"  • Vídeo muito curto: {len(rejection_reasons['too_short'])} vídeos")
        print(f"  • Múltiplos motivos: {len(rejection_reasons['multiple_reasons'])} vídeos")
        print(f"  • Sem detalhes disponíveis: {len(rejection_reasons['no_details'])} vídeos")
        print(f"  • Canal sem informações: {len(rejection_reasons['no_channel'])} vídeos\n")
        
        if filtered_videos:
            # Top vídeos por engajamento
            print(f"🏆 TOP 5 VÍDEOS POR ENGAJAMENTO:")
            sorted_by_engagement = sorted(filtered_videos, key=lambda x: x['engagement_rate'], reverse=True)[:5]
            for i, video in enumerate(sorted_by_engagement, 1):
                print(f"  {i}. {video['title'][:50]}...")
                print(f"     Engajamento: {video['engagement_rate']:.2f}%")
                print(f"     Views: {video['details']['view_count']:,}")
                print(f"     Canal: {video['channel_info']['title']}\n")
            
            # Canais mais frequentes
            print(f"📺 CANAIS MAIS FREQUENTES (após filtros):")
            channels_count = {}
            for video in filtered_videos:
                channel_name = video['channel_info']['title']
                channels_count[channel_name] = channels_count.get(channel_name, 0) + 1
            
            for channel, count in sorted(channels_count.items(), key=lambda x: x[1], reverse=True)[:5]:
                print(f"  • {channel}: {count} vídeos")

async def main():
    """Executa a etapa 3 completa"""
    print("\n" + "="*80)
    print("🚀 ETAPA 3 - BUSCAR DETALHES E FILTRAR VÍDEOS")
    print("="*80)
    
    etapa3 = Etapa3FiltrarVideos()
    
    # Carregar resultados da etapa 2
    previous_results = etapa3.load_previous_results()
    if not previous_results:
        return
    
    print(f"\n📋 Dados carregados da etapa 2:")
    print(f"  • Scanner ID: {previous_results['scanner_id']}")
    print(f"  • Total de vídeos: {previous_results['total_found']}")
    print(f"  • Queries usadas: {', '.join(previous_results['queries'])}")
    
    videos = previous_results['videos']
    video_ids = [v['id'] for v in videos]
    channel_ids = list(set([v['channel_id'] for v in videos if 'channel_id' in v]))
    
    # Buscar detalhes dos vídeos
    video_details = await etapa3.fetch_video_details(video_ids)
    
    # Buscar detalhes dos canais
    channel_details = await etapa3.fetch_channel_details(channel_ids)
    
    # Aplicar filtros
    filter_results = etapa3.apply_filters(videos, video_details, channel_details)
    
    # Analisar resultados
    etapa3.analyze_filtered_results(filter_results)
    
    # Salvar resultados para próxima etapa
    with open('etapa_3_resultados.json', 'w', encoding='utf-8') as f:
        json.dump({
            'scanner_id': previous_results['scanner_id'],
            'queries': previous_results['queries'],
            'filtered_videos': filter_results['filtered_videos'],
            'total_approved': filter_results['total_approved'],
            'total_rejected': filter_results['total_rejected'],
            'timestamp': datetime.now().isoformat()
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 Resultados salvos em 'etapa_3_resultados.json'")
    print(f"\n✅ ETAPA 3 CONCLUÍDA!")
    print(f"   Vídeos aprovados: {filter_results['total_approved']}")
    print(f"   Vídeos rejeitados: {filter_results['total_rejected']}")
    print(f"\n🔍 PRÓXIMA ETAPA: Análise final com IA para selecionar os 3 melhores")

if __name__ == "__main__":
    asyncio.run(main())