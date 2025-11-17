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
        warnings = []
        stats = {
            "videos_found": 0,
            "videos_with_transcript": 0,
            "videos_without_transcript": 0,
            "videos_analyzed": 0,
            "videos_qualified": 0
        }

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

            # ⚠️ VALIDATION: Check if product name is empty
            if not project_data.nome_produto or project_data.nome_produto.strip() == "":
                warning_msg = f"⚠️ WARNING: Product name is EMPTY for scanner {scanner_id}! Claude will lack context."
                warnings.append("Product name is empty")
                logger.warning(warning_msg)
            elif project_data.nome_produto.strip().endswith('-'):
                warning_msg = f"⚠️ WARNING: Product name seems incomplete: '{project_data.nome_produto}'"
                warnings.append(f"Product name incomplete: '{project_data.nome_produto}'")
                logger.warning(warning_msg)

            # ⚠️ VALIDATION: Check if service description is empty
            if not project_data.descricao_servico or len(project_data.descricao_servico.strip()) < 20:
                warning_msg = f"⚠️ WARNING: Service description is too short or empty for scanner {scanner_id}"
                warnings.append("Service description is too short")
                logger.warning(warning_msg)

            logger.success(
                f"✅ Supabase data fetched: "
                f"Channel {canal_data.youtube_channel_id}, "
                f"Product: {project_data.nome_produto}"
            )

            # ============================================
            # STEP 3: Fetch YouTube videos BY ID (from queue)
            # ============================================

            # Check if there are videos in the queue
            if not canal_data.videos or len(canal_data.videos) == 0:
                logger.warning(
                    f"⚠️ No videos in queue (videos_para_scann) for scanner {scanner_id}"
                )
                warnings.append("No videos in processing queue")
                execution_time = time.time() - start_time
                return QualificationResult(
                    scanner_id=scanner_id,
                    qualified_video_ids=[],
                    qualified_video_ids_csv="",
                    total_analyzed=0,
                    execution_time_seconds=execution_time,
                    success=True,
                    warnings=warnings,
                    stats=stats
                )

            logger.info(
                f"🎥 Fetching {len(canal_data.videos)} videos BY ID from queue "
                f"(channel: {canal_data.youtube_channel_id})..."
            )

            basic_videos = await self.youtube.get_channel_videos(
                video_ids=canal_data.videos,
                channel_id=canal_data.youtube_channel_id
            )

            # Update stats
            stats["videos_found"] = len(basic_videos)

            if not basic_videos:
                logger.warning(
                    f"⚠️ No videos found by ID for scanner {scanner_id} "
                    f"(requested: {len(canal_data.videos)})"
                )
                warnings.append(f"No videos found (requested {len(canal_data.videos)} IDs)")
                execution_time = time.time() - start_time
                return QualificationResult(
                    scanner_id=scanner_id,
                    qualified_video_ids=[],
                    qualified_video_ids_csv="",
                    total_analyzed=0,
                    execution_time_seconds=execution_time,
                    success=True,
                    warnings=warnings,
                    stats=stats
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

            # Count transcripts
            videos_with_transcript = sum(1 for t in transcripts.values() if t)
            videos_without_transcript = len(transcripts) - videos_with_transcript
            stats["videos_with_transcript"] = videos_with_transcript
            stats["videos_without_transcript"] = videos_without_transcript

            # ⚠️ WARNING: All transcripts empty
            if videos_without_transcript == len(transcripts) and len(transcripts) > 0:
                warning_msg = f"🚨 CRITICAL: ALL {len(transcripts)} videos have EMPTY transcripts! Claude will likely reject all."
                warnings.append(f"All {len(transcripts)} videos have empty transcripts")
                logger.error(warning_msg)
            elif videos_without_transcript > 0:
                warning_msg = f"⚠️ WARNING: {videos_without_transcript}/{len(transcripts)} videos have empty transcripts"
                warnings.append(f"{videos_without_transcript} videos have empty transcripts")
                logger.warning(warning_msg)

            logger.success(
                f"✅ Enrichment complete: "
                f"{len(detailed_videos)} details, "
                f"{videos_with_transcript} transcripts ({videos_without_transcript} empty)"
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

            # semantic_analysis now returns Dict[video_id, reasoning]
            analysis_dict = await self.claude.semantic_analysis(
                videos=enriched_videos,
                project=project_data
            )

            # Validate that all video IDs in analysis exist
            available_set = set(v.id for v in enriched_videos)
            analysis_dict = {
                vid: reasoning
                for vid, reasoning in analysis_dict.items()
                if vid in available_set
            }

            # Separate approved videos from rejected/skipped
            qualified_ids = [
                vid for vid, reasoning in analysis_dict.items()
                if "✅ APPROVED" in reasoning
            ]

            # Update final stats
            stats["videos_analyzed"] = len(enriched_videos)
            stats["videos_qualified"] = len(qualified_ids)

            # ⚠️ WARNING: No videos qualified
            if len(qualified_ids) == 0 and len(enriched_videos) > 0:
                warning_msg = f"❌ Claude rejected ALL {len(enriched_videos)} videos (returned 'NOT')"
                warnings.append(f"All {len(enriched_videos)} videos were rejected by Claude")
                logger.warning(warning_msg)

            logger.success(
                f"✅ Analysis complete: "
                f"{len(qualified_ids)}/{len(enriched_videos)} videos qualified"
            )

            # ============================================
            # STEP 7: Compile result
            # ============================================
            execution_time = time.time() - start_time

            # Format as "id:reasoning,id:reasoning"
            # Include ALL videos (approved, rejected, skipped) for full transparency
            all_videos_with_reasoning = [
                f"{vid}:{reasoning}"
                for vid, reasoning in analysis_dict.items()
            ]

            result = QualificationResult(
                scanner_id=scanner_id,
                qualified_video_ids=qualified_ids,  # Only approved IDs
                qualified_video_ids_csv=",".join(all_videos_with_reasoning),  # ALL with reasoning
                total_analyzed=len(enriched_videos),
                execution_time_seconds=execution_time,
                success=True,
                warnings=warnings,
                stats=stats
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
                error=str(e),
                warnings=warnings,
                stats=stats
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
