"""
Video Qualifier
Main pipeline for qualifying YouTube videos using semantic analysis
"""

import asyncio
import time
from typing import List
from loguru import logger

from models import QualificationResult
from core.validators import validate_scanner_id, validate_qualified_ids
from core.parsers import merge_video_data
from services.supabase_service import get_supabase_service
from services.youtube_service import get_youtube_service
from services.transcript_service import get_transcript_service
from services.claude_service import get_claude_service


class VideoQualifier:
    """
    Main video qualification pipeline

    Orchestrates:
    1. Data fetching from Supabase (channel + project)
    2. YouTube video discovery
    3. Video enrichment (details + transcriptions)
    4. Semantic analysis with Claude
    5. Result compilation
    """

    def __init__(self):
        """Initialize all services"""
        self.supabase = get_supabase_service()
        self.youtube = get_youtube_service()
        self.transcript = get_transcript_service()
        self.claude = get_claude_service()
        logger.info("✅ VideoQualifier initialized")

    async def process(self, scanner_id: int) -> QualificationResult:
        """
        Process a scanner and qualify videos

        Args:
            scanner_id: Scanner ID from Supabase

        Returns:
            QualificationResult with qualified video IDs

        Raises:
            Exception: If any step fails
        """
        start_time = time.time()

        try:
            # ============================================
            # STEP 1: Validate input
            # ============================================
            logger.info(f"🚀 Starting qualification for scanner {scanner_id}")
            validate_scanner_id(scanner_id)

            # ============================================
            # STEP 2: Fetch Supabase data (parallel)
            # ============================================
            logger.info("📡 Fetching canal and project data from Supabase...")

            canal_data, project_data = await asyncio.gather(
                self.supabase.get_canal_e_videos(scanner_id),
                self.supabase.get_dados_projeto(scanner_id)
            )

            logger.success(
                f"✅ Supabase data fetched: "
                f"Channel {canal_data.youtube_channel_id}, "
                f"Product: {project_data.nome_produto}"
            )

            # ============================================
            # STEP 3: Fetch YouTube videos
            # ============================================
            logger.info(
                f"🎥 Fetching videos from YouTube channel "
                f"{canal_data.youtube_channel_id}..."
            )

            basic_videos = await self.youtube.get_channel_videos(
                channel_id=canal_data.youtube_channel_id,
                excluded_ids=canal_data.videos or []
            )

            if not basic_videos:
                logger.warning(
                    f"⚠️ No new videos found for scanner {scanner_id}"
                )
                execution_time = time.time() - start_time
                return QualificationResult(
                    scanner_id=scanner_id,
                    qualified_video_ids=[],
                    qualified_video_ids_csv="",
                    total_analyzed=0,
                    execution_time_seconds=execution_time,
                    success=True
                )

            video_ids = [v["video_id"] for v in basic_videos]
            logger.success(f"✅ Found {len(video_ids)} new videos")

            # ============================================
            # STEP 4: Enrich videos (parallel)
            # ============================================
            logger.info("📊 Enriching videos with details and transcriptions...")

            # Fetch details and transcripts in parallel
            detailed_videos, transcripts = await asyncio.gather(
                self.youtube.get_video_details(video_ids),
                self.transcript.get_batch_transcripts(video_ids)
            )

            logger.success(
                f"✅ Enrichment complete: "
                f"{len(detailed_videos)} details, "
                f"{len(transcripts)} transcripts"
            )

            # ============================================
            # STEP 5: Merge data
            # ============================================
            logger.info("🔗 Merging video data...")

            enriched_videos = merge_video_data(
                basic_videos=basic_videos,
                detailed_videos=detailed_videos,
                transcripts=transcripts
            )

            if not enriched_videos:
                logger.error("❌ No videos after merging data")
                raise ValueError("Failed to merge video data")

            logger.success(f"✅ {len(enriched_videos)} videos ready for analysis")

            # ============================================
            # STEP 6: Claude semantic analysis
            # ============================================
            logger.info("🧠 Running Claude semantic analysis...")

            qualified_ids = await self.claude.semantic_analysis(
                videos=enriched_videos,
                project=project_data
            )

            # Validate qualified IDs
            validate_qualified_ids(
                qualified_ids=qualified_ids,
                available_ids=[v.id for v in enriched_videos]
            )

            # Filter to only valid IDs
            available_set = set(v.id for v in enriched_videos)
            qualified_ids = [vid for vid in qualified_ids if vid in available_set]

            logger.success(
                f"✅ Analysis complete: "
                f"{len(qualified_ids)}/{len(enriched_videos)} videos qualified"
            )

            # ============================================
            # STEP 7: Compile result
            # ============================================
            execution_time = time.time() - start_time

            result = QualificationResult(
                scanner_id=scanner_id,
                qualified_video_ids=qualified_ids,
                qualified_video_ids_csv=",".join(qualified_ids),
                total_analyzed=len(enriched_videos),
                execution_time_seconds=execution_time,
                success=True
            )

            logger.success(
                f"🎉 Qualification complete for scanner {scanner_id}: "
                f"{len(qualified_ids)} qualified in {execution_time:.2f}s"
            )

            return result

        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(
                f"❌ Error qualifying scanner {scanner_id}: {e}"
            )

            # Return failed result
            return QualificationResult(
                scanner_id=scanner_id,
                qualified_video_ids=[],
                qualified_video_ids_csv="",
                total_analyzed=0,
                execution_time_seconds=execution_time,
                success=False,
                error=str(e)
            )


# ============================================
# Singleton instance
# ============================================
_qualifier: VideoQualifier | None = None


def get_video_qualifier() -> VideoQualifier:
    """Get VideoQualifier singleton"""
    global _qualifier
    if _qualifier is None:
        _qualifier = VideoQualifier()
    return _qualifier
