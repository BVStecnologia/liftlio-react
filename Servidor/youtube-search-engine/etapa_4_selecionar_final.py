#!/usr/bin/env python3
"""
ETAPA 4 - Seleção Final com IA
Claude analisa os vídeos filtrados e seleciona os 3 melhores
"""

import asyncio
import json
from typing import Dict, List
from datetime import datetime
from anthropic import Anthropic
from googleapiclient.discovery import build
from dotenv import load_dotenv
import os

load_dotenv()

class Etapa4SelecionarFinal:
    def __init__(self):
        self.claude_api_key = os.getenv("CLAUDE_API_KEY")
        self.claude = Anthropic(api_key=self.claude_api_key)
        self.youtube_api_key = os.getenv("YOUTUBE_API_KEY")
        self.youtube = build('youtube', 'v3', developerKey=self.youtube_api_key)
    
    def load_previous_results(self) -> Dict:
        """Carrega resultados da etapa 3"""
        try:
            with open('etapa_3_resultados.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print("❌ Arquivo 'etapa_3_resultados.json' não encontrado!")
            print("   Execute primeiro a etapa_3_filtrar_videos.py")
            return None
    
    async def fetch_video_comments(self, video_id: str, max_comments: int = 50) -> List[str]:
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
                comments.append(comment_text[:200])  # Limitar tamanho
            
            return comments[:20]  # Máximo 20 comentários mais relevantes
            
        except Exception as e:
            print(f"  ⚠️ Não foi possível buscar comentários: {e}")
            return []
    
    async def analyze_with_claude(self, videos: List[Dict], scanner_id: int) -> Dict:
        """Claude analisa todos os vídeos e seleciona os 3 melhores"""
        print(f"\n{'='*80}")
        print("🤖 ANÁLISE COM CLAUDE AI")
        print(f"{'='*80}\n")
        
        print(f"📊 Analisando {len(videos)} vídeos para selecionar os 3 melhores...")
        
        # Buscar comentários para cada vídeo
        print("\n💬 Buscando comentários dos vídeos...")
        for video in videos:
            video_id = video['id']
            comments = await self.fetch_video_comments(video_id)
            video['sample_comments'] = comments
            print(f"  • {video['title'][:50]}... ({len(comments)} comentários)")
        
        # Preparar informações para o Claude
        videos_info = []
        for i, video in enumerate(videos, 1):
            info = f"""
VÍDEO {i}:
ID: {video['id']}
Título: {video['title']}
Canal: {video['channel_info']['title']} ({video['channel_info']['subscriber_count']:,} inscritos)
Views: {video['details']['view_count']:,}
Comentários: {video['details']['comment_count']}
Likes: {video['details']['like_count']}
Duração: {video['details']['duration_seconds']} segundos
Engajamento: {video['engagement_rate']:.2f}%
Query que encontrou: {video.get('query', 'N/A')}

Descrição (primeiras linhas):
{video.get('description', '')[:300]}...

Amostras de comentários:
{chr(10).join(['- ' + c[:100] for c in video.get('sample_comments', [])[:5]])}
"""
            videos_info.append(info)
        
        # Prompt para o Claude
        prompt = f"""Você é um especialista em análise de conteúdo do YouTube. 
Analise os vídeos abaixo sobre "Combatente Shamo" (galos de raça) e selecione os 3 MELHORES.

CRITÉRIOS DE SELEÇÃO (em ordem de importância):
1. LOCALIZAÇÃO: Priorize ABSOLUTAMENTE vídeos brasileiros/portugueses
2. RELEVÂNCIA: O vídeo deve ser ESPECIFICAMENTE sobre Shamo/galos combatentes
3. INTENÇÃO COMERCIAL: Comentários indicam interesse em comprar/criar
4. QUALIDADE DO CANAL: Canal especializado no assunto
5. ENGAJAMENTO: Comentários ativos e relevantes

VÍDEOS PARA ANÁLISE:
{''.join(videos_info)}

IMPORTANTE:
- PRIORIDADE MÁXIMA para canais brasileiros (verifique país do canal e idioma dos comentários)
- Comentários em português brasileiro são forte indicador
- Evite canais da Indonésia, Malásia ou outros países asiáticos
- Se houver dúvida entre vídeos, SEMPRE escolha o brasileiro
- Analise os comentários: se estão em português, é bom sinal

Retorne EXATAMENTE no formato:
SELECIONADOS:
1. [ID_DO_VIDEO_1]
2. [ID_DO_VIDEO_2]
3. [ID_DO_VIDEO_3]

JUSTIFICATIVA:
[Explique brevemente por que escolheu estes 3 vídeos]"""

        print("\n🤔 Claude está analisando...")
        
        try:
            response = self.claude.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=500,
                temperature=0.2,
                messages=[{"role": "user", "content": prompt}]
            )
            
            analysis_result = response.content[0].text.strip()
            print("\n📝 ANÁLISE DO CLAUDE:")
            print("-" * 60)
            print(analysis_result)
            print("-" * 60)
            
            # Extrair IDs selecionados
            lines = analysis_result.split('\n')
            selected_ids = []
            
            for line in lines:
                # Procurar por padrões como "1. [VIDEO_ID]" ou "1. VIDEO_ID"
                import re
                match = re.search(r'\d+\.\s*\[?([A-Za-z0-9_-]+)\]?', line)
                if match and len(selected_ids) < 3:
                    video_id = match.group(1)
                    if video_id in [v['id'] for v in videos]:
                        selected_ids.append(video_id)
            
            # Se não encontrou 3, pegar os primeiros 3 por engajamento
            if len(selected_ids) < 3:
                print("\n⚠️ Claude não retornou 3 IDs válidos, usando fallback por engajamento...")
                sorted_videos = sorted(videos, key=lambda x: x['engagement_rate'], reverse=True)
                selected_ids = [v['id'] for v in sorted_videos[:3]]
            
            return {
                'selected_ids': selected_ids,
                'analysis': analysis_result,
                'success': True
            }
            
        except Exception as e:
            print(f"\n❌ Erro na análise do Claude: {e}")
            print("⚠️ Usando seleção por engajamento como fallback...")
            
            # Fallback: selecionar top 3 por engajamento
            sorted_videos = sorted(videos, key=lambda x: x['engagement_rate'], reverse=True)
            selected_ids = [v['id'] for v in sorted_videos[:3]]
            
            return {
                'selected_ids': selected_ids,
                'analysis': "Seleção automática por engajamento (fallback)",
                'success': False
            }
    
    def display_final_selection(self, videos: List[Dict], selected_ids: List[str]):
        """Exibe os vídeos finais selecionados"""
        print(f"\n{'='*80}")
        print("🏆 SELEÇÃO FINAL - 3 MELHORES VÍDEOS")
        print(f"{'='*80}\n")
        
        selected_videos = []
        for video_id in selected_ids:
            for video in videos:
                if video['id'] == video_id:
                    selected_videos.append(video)
                    break
        
        for i, video in enumerate(selected_videos, 1):
            print(f"🥇 VÍDEO {i}:")
            print(f"   ID: {video['id']}")
            print(f"   Título: {video['title']}")
            print(f"   Canal: {video['channel_info']['title']}")
            print(f"   Inscritos: {video['channel_info']['subscriber_count']:,}")
            print(f"   Views: {video['details']['view_count']:,}")
            print(f"   Comentários: {video['details']['comment_count']}")
            print(f"   Engajamento: {video['engagement_rate']:.2f}%")
            print(f"   URL: https://youtube.com/watch?v={video['id']}")
            print()
        
        return selected_videos

async def main():
    """Executa a etapa 4 completa"""
    print("\n" + "="*80)
    print("🚀 ETAPA 4 - SELEÇÃO FINAL COM IA")
    print("="*80)
    
    etapa4 = Etapa4SelecionarFinal()
    
    # Carregar resultados da etapa 3
    previous_results = etapa4.load_previous_results()
    if not previous_results:
        return
    
    print(f"\n📋 Dados carregados da etapa 3:")
    print(f"  • Scanner ID: {previous_results['scanner_id']}")
    print(f"  • Vídeos aprovados: {previous_results['total_approved']}")
    print(f"  • Vídeos rejeitados: {previous_results['total_rejected']}")
    
    filtered_videos = previous_results['filtered_videos']
    
    if len(filtered_videos) == 0:
        print("\n❌ Nenhum vídeo passou pelos filtros!")
        print("   Considere ajustar os filtros na etapa 3")
        return
    
    if len(filtered_videos) <= 3:
        print(f"\n⚠️ Apenas {len(filtered_videos)} vídeos disponíveis, retornando todos...")
        selected_ids = [v['id'] for v in filtered_videos]
        selected_videos = filtered_videos
    else:
        # Analisar com Claude
        analysis_result = await etapa4.analyze_with_claude(
            filtered_videos, 
            previous_results['scanner_id']
        )
        
        selected_ids = analysis_result['selected_ids']
        
        # Exibir seleção final
        selected_videos = etapa4.display_final_selection(filtered_videos, selected_ids)
    
    # Salvar resultado final
    final_result = {
        'scanner_id': previous_results['scanner_id'],
        'video_ids': selected_ids,
        'video_ids_string': ','.join(selected_ids),
        'selected_videos': selected_videos,
        'total_analyzed': len(filtered_videos),
        'timestamp': datetime.now().isoformat(),
        'success': True
    }
    
    with open('etapa_4_resultado_final.json', 'w', encoding='utf-8') as f:
        json.dump(final_result, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 Resultado final salvo em 'etapa_4_resultado_final.json'")
    
    print(f"\n{'='*80}")
    print("✅ PROCESSO COMPLETO FINALIZADO!")
    print(f"{'='*80}")
    print(f"\n📊 RESUMO FINAL:")
    print(f"  Etapa 1: Queries geradas com IA")
    print(f"  Etapa 2: {previous_results.get('total_found', 49)} vídeos encontrados")
    print(f"  Etapa 3: {previous_results['total_approved']} vídeos aprovados nos filtros")
    print(f"  Etapa 4: 3 vídeos selecionados pela IA")
    print(f"\n🎯 IDs FINAIS PARA O SUPABASE:")
    print(f"  {','.join(selected_ids)}")

if __name__ == "__main__":
    asyncio.run(main())