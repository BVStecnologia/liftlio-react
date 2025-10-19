"""
Transcript Service
Handles video transcription using own VPS API
"""

import asyncio
from typing import List, Dict, Optional
import httpx
from loguru import logger

from config import get_settings


class TranscriptService:
    """Service for video transcription via own API"""

    def __init__(self):
        """Initialize HTTP client for transcription API"""
        settings = get_settings()
        self.api_url = settings.transcript_api_url
        self.timeout = settings.transcript_timeout
        self.max_concurrent = settings.max_concurrent_transcripts
        self.client = httpx.AsyncClient(timeout=self.timeout)
        logger.info(
            f"✅ Transcript API client initialized "
            f"(url: {self.api_url}, timeout: {self.timeout}s, "
            f"max_concurrent: {self.max_concurrent})"
        )

    async def get_transcript(self, video_id: str) -> str:
        """
        Get transcription for a single video

        Args:
            video_id: YouTube video ID

        Returns:
            Transcription text

        Raises:
            Exception: If API call fails or times out
        """
        try:
            url = f"{self.api_url}/transcribe"
            payload = {"url": f"https://www.youtube.com/watch?v={video_id}"}

            logger.debug(f"Requesting transcript for {video_id}")

            response = await self.client.post(url, json=payload)
            response.raise_for_status()

            data = response.json()

            # API response: {"transcription": "...", "video_id": "...", "contem": true}
            transcription = data.get("transcription", "")

            if not transcription:
                logger.warning(f"Empty transcript for video {video_id}")
                return ""

            logger.debug(
                f"✅ Transcript received for {video_id} "
                f"({len(transcription)} chars)"
            )
            return transcription

        except httpx.TimeoutException:
            logger.error(
                f"❌ Timeout getting transcript for {video_id} "
                f"(>{self.timeout}s)"
            )
            return ""
        except httpx.HTTPStatusError as e:
            logger.error(
                f"❌ HTTP error getting transcript for {video_id}: "
                f"{e.response.status_code}"
            )
            return ""
        except Exception as e:
            logger.error(f"❌ Error getting transcript for {video_id}: {e}")
            return ""

    async def get_batch_transcripts(
        self,
        video_ids: List[str]
    ) -> Dict[str, str]:
        """
        Get transcriptions for multiple videos in parallel

        Uses semaphore to limit concurrent requests

        Args:
            video_ids: List of YouTube video IDs

        Returns:
            Dictionary mapping video_id -> transcription
        """
        try:
            logger.info(
                f"Fetching transcripts for {len(video_ids)} videos "
                f"(max {self.max_concurrent} concurrent)"
            )

            # Semaphore to limit concurrent requests
            semaphore = asyncio.Semaphore(self.max_concurrent)

            async def fetch_with_semaphore(video_id: str) -> tuple[str, str]:
                """Fetch with concurrency limit"""
                async with semaphore:
                    transcript = await self.get_transcript(video_id)
                    return (video_id, transcript)

            # Fetch all in parallel (but limited by semaphore)
            tasks = [fetch_with_semaphore(vid) for vid in video_ids]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Process results
            transcripts = {}
            successful = 0
            failed = 0

            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Task failed with exception: {result}")
                    failed += 1
                    continue

                video_id, transcript = result
                transcripts[video_id] = transcript

                if transcript:
                    successful += 1
                else:
                    failed += 1

            logger.success(
                f"✅ Transcripts fetched: {successful} successful, "
                f"{failed} failed/empty"
            )

            return transcripts

        except Exception as e:
            logger.error(f"❌ Error in batch transcript fetch: {e}")
            raise

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
        logger.info("Transcript API client closed")


# ============================================
# Singleton instance
# ============================================
_transcript_service: TranscriptService | None = None


def get_transcript_service() -> TranscriptService:
    """Get Transcript service singleton"""
    global _transcript_service
    if _transcript_service is None:
        _transcript_service = TranscriptService()
    return _transcript_service
