"""
Data Parsers
Utilities for formatting data for Claude and merging video data
"""

from typing import List, Dict
from models import VideoData, ProjectData


def format_video_for_claude(video: VideoData) -> str:
    """
    Format a single video for Claude prompt

    Args:
        video: VideoData object with all enrichments

    Returns:
        Formatted string with video information
    """
    # Truncate transcript to avoid token limits (~2000 chars)
    transcript = video.transcript[:2000] if video.transcript else "N/A"

    return f"""ID: {video.id}
Título: {video.title}
Descrição: {video.description[:500]}...
Canal: {video.channel_title or 'N/A'}
Publicado: {video.published_at}
Duração: {video.duration}
Views: {video.view_count:,} | Likes: {video.like_count:,} | Comments: {video.comment_count:,}
Tags: {', '.join(video.tags[:10]) if video.tags else 'N/A'}
Transcrição: {transcript}..."""


def format_product_context(project: ProjectData) -> str:
    """
    Format product/service context for Claude prompt

    Args:
        project: ProjectData with product info

    Returns:
        Formatted product context string
    """
    return f"""Nome do produto ou serviço: {project.nome_produto}

Descrição do produto ou serviço: {project.descricao_servico}

País: {project.pais}"""


def merge_video_data(
    basic_videos: List[Dict],
    detailed_videos: List[VideoData],
    transcripts: Dict[str, str]
) -> List[VideoData]:
    """
    Merge video data from different sources

    Combines:
    - Basic video info from channel query
    - Detailed video stats from video details query
    - Transcriptions from transcript API

    Args:
        basic_videos: List of basic video dicts from get_channel_videos()
        detailed_videos: List of VideoData from get_video_details()
        transcripts: Dict mapping video_id -> transcription

    Returns:
        List of VideoData with all enrichments
    """
    # Create lookup dict for detailed videos
    details_by_id = {video.id: video for video in detailed_videos}

    enriched_videos = []

    for basic in basic_videos:
        video_id = basic.get("video_id", "")

        if not video_id:
            continue

        # Get detailed data (if exists)
        detailed = details_by_id.get(video_id)

        if not detailed:
            # Skip videos without details (shouldn't happen)
            continue

        # Add transcript
        detailed.transcript = transcripts.get(video_id, "")

        enriched_videos.append(detailed)

    return enriched_videos


def format_videos_for_prompt(videos: List[VideoData]) -> str:
    """
    Format multiple videos for Claude user prompt

    Args:
        videos: List of enriched VideoData objects

    Returns:
        Formatted string with all videos separated by dividers
    """
    videos_text = "\n---\n".join([
        format_video_for_claude(v) for v in videos
    ])

    return f"""VÍDEOS PARA ANÁLISE:

{videos_text}

Lembre-se: responda APENAS com os IDs separados por vírgula ou "NOT".
Nenhuma explicação ou texto adicional!"""
