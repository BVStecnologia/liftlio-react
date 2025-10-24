"""
YouTube Service
Handles YouTube Data API v3 operations
"""

import re
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from loguru import logger

from config import get_settings
from models import VideoData


class YouTubeService:
    """Service for YouTube Data API v3 operations"""

    def __init__(self):
        """Initialize YouTube API client"""
        settings = get_settings()
        self.youtube = build('youtube', 'v3', developerKey=settings.youtube_api_key)
        self.max_results = settings.youtube_max_results
        logger.info("✅ YouTube API client initialized")

    def _get_date_filter(self, filter_name: str) -> Optional[str]:
        """
        Convert date filter name to ISO 8601 date

        Args:
            filter_name: One of: "qualquer data", "último dia", "última semana",
                        "último mês", "últimos 3 meses", "últimos 6 meses", "último ano"

        Returns:
            ISO 8601 date string or None
        """
        if filter_name == "qualquer data":
            return None

        now = datetime.now()

        filters = {
            "último dia": timedelta(days=1),
            "última semana": timedelta(weeks=1),
            "último mês": timedelta(days=30),
            "últimos 3 meses": timedelta(days=90),
            "últimos 6 meses": timedelta(days=180),
            "último ano": timedelta(days=365),
        }

        delta = filters.get(filter_name)
        if delta:
            date = now - delta
            return date.strftime("%Y-%m-%dT%H:%M:%SZ")

        return None

    def _normalize_video_id(self, video_id: str) -> str:
        """Normalize video ID for comparison"""
        return video_id.strip().lower() if video_id else ""

    def _format_duration(self, duration: str) -> str:
        """
        Format ISO 8601 duration to readable format

        Args:
            duration: ISO 8601 duration (e.g., "PT1H23M45S")

        Returns:
            Formatted duration (e.g., "01:23:45" or "23:45")
        """
        try:
            hours = minutes = seconds = 0

            hours_match = re.search(r"(\d+)H", duration)
            minutes_match = re.search(r"(\d+)M", duration)
            seconds_match = re.search(r"(\d+)S", duration)

            if hours_match:
                hours = int(hours_match.group(1))
            if minutes_match:
                minutes = int(minutes_match.group(1))
            if seconds_match:
                seconds = int(seconds_match.group(1))

            if hours > 0:
                return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
            return f"{minutes:02d}:{seconds:02d}"

        except Exception as e:
            logger.warning(f"Error formatting duration '{duration}': {e}")
            return duration

    async def get_channel_videos(
        self,
        video_ids: List[str],
        channel_id: Optional[str] = None,
        max_results: Optional[int] = None
    ) -> List[Dict]:
        """
        Get videos BY ID (not by discovery with 'today' filter)

        IMPORTANT CHANGE (2025-10-24):
        - Previously: Discovered videos using 'today' filter
        - Now: Receives video IDs from SQL (videos_para_scann)
        - Benefit: Single source of truth, no race conditions

        Args:
            video_ids: List of video IDs to fetch (from videos_para_scann)
            channel_id: Optional channel ID (only for logging)
            max_results: Maximum number of videos to return

        Returns:
            List of video dictionaries with basic info

        Raises:
            Exception: If API call fails
        """
        try:
            if not video_ids:
                logger.warning("No video IDs provided to fetch")
                return []

            logger.info(
                f"Fetching {len(video_ids)} videos BY ID "
                f"(channel: {channel_id or 'unknown'})"
            )

            all_videos = []

            # Process in batches of 50 (API limit)
            batch_size = 50
            for i in range(0, len(video_ids), batch_size):
                batch = video_ids[i:i + batch_size]
                logger.debug(f"Processing batch {i//batch_size + 1}: {len(batch)} videos")

                response = self.youtube.videos().list(
                    part="snippet",
                    id=",".join(batch)
                ).execute()

                for item in response.get("items", []):
                    snippet = item.get("snippet", {})

                    video_data = {
                        "video_id": item.get("id", ""),
                        "title": snippet.get("title", ""),
                        "description": snippet.get("description", ""),
                        "published_at": snippet.get("publishedAt", ""),
                        "thumbnail_url": (
                            snippet.get("thumbnails", {})
                            .get("default", {})
                            .get("url", "")
                        ),
                    }

                    all_videos.append(video_data)

            logger.success(
                f"✅ Fetched {len(all_videos)} videos by ID "
                f"(requested: {len(video_ids)})"
            )

            if len(all_videos) < len(video_ids):
                missing = len(video_ids) - len(all_videos)
                logger.warning(
                    f"⚠️ {missing} videos not found (may be deleted/private)"
                )

            return all_videos

        except HttpError as e:
            logger.error(f"❌ YouTube API error: {e}")
            if e.resp.status == 403:
                logger.error("Quota exceeded or invalid API key!")
            raise
        except Exception as e:
            logger.error(f"❌ Error fetching videos by ID: {e}")
            raise

    async def get_video_details(self, video_ids: List[str]) -> List[VideoData]:
        """
        Get detailed information for multiple videos

        Args:
            video_ids: List of YouTube video IDs

        Returns:
            List of VideoData objects

        Raises:
            Exception: If API call fails
        """
        try:
            logger.info(f"Fetching details for {len(video_ids)} videos")

            all_details = []

            # Process in batches of 50 (API limit)
            batch_size = 50
            for i in range(0, len(video_ids), batch_size):
                batch = video_ids[i:i + batch_size]
                logger.debug(f"Processing batch {i//batch_size + 1}: {len(batch)} videos")

                response = self.youtube.videos().list(
                    part="snippet,statistics,contentDetails",
                    id=",".join(batch)
                ).execute()

                for item in response.get("items", []):
                    snippet = item.get("snippet", {})
                    statistics = item.get("statistics", {})
                    content_details = item.get("contentDetails", {})

                    video_data = VideoData(
                        id=item.get("id", ""),
                        title=snippet.get("title", ""),
                        description=snippet.get("description", ""),
                        published_at=snippet.get("publishedAt", ""),
                        channel_title=snippet.get("channelTitle"),
                        duration=self._format_duration(
                            content_details.get("duration", "")
                        ),
                        view_count=int(statistics.get("viewCount", 0)),
                        like_count=int(statistics.get("likeCount", 0)),
                        comment_count=int(statistics.get("commentCount", 0)),
                        tags=snippet.get("tags", []),
                        thumbnail_url=(
                            snippet.get("thumbnails", {})
                            .get("high", {})
                            .get("url", "")
                        ),
                        transcript=""  # Will be filled by transcript service
                    )

                    all_details.append(video_data)

            logger.success(
                f"✅ Fetched details for {len(all_details)} videos"
            )
            return all_details

        except HttpError as e:
            logger.error(f"❌ YouTube API error getting details: {e}")
            if e.resp.status == 403:
                logger.error("Quota exceeded!")
            raise
        except Exception as e:
            logger.error(f"❌ Error fetching video details: {e}")
            raise


# ============================================
# Singleton instance
# ============================================
_youtube_service: YouTubeService | None = None


def get_youtube_service() -> YouTubeService:
    """Get YouTube service singleton"""
    global _youtube_service
    if _youtube_service is None:
        _youtube_service = YouTubeService()
    return _youtube_service
