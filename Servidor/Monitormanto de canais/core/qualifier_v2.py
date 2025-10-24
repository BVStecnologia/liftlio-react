"""
Video Qualifier V2
Main pipeline for qualifying YouTube videos with bilingual semantic analysis
"""

import asyncio
import time
from typing import List
from loguru import logger

from models_v2 import QualificationResult, VideoAnalysisResult
from core.validators import validate_scanner_id
from core.parsers import merge_video_data
from services.supabase_service import get_supabase_service
from services.youtube_service import get_youtube_service
from services.transcript_service import get_transcript_service
from services.claude_service_v2 import get_claude_service


class VideoQualifierV2:
    """
    Main video qualification pipeline with bilingual support

    Orchestrates:
    1. Data fetching from Supabase (channel + project)
    2. YouTube video discovery
    3. Video enrichment (details + transcriptions)
    4. Semantic analysis with Claude (bilingual)
    5. Result compilation with JSONB format
    """

    def __init__(self):
        """Initialize all services"""
        self.supabase = get_supabase_service()
        self.youtube = get_youtube_service()
        self.transcript = get_transcript_service()
        self.claude = get_claude_service()
        logger.info("✅ VideoQualifierV2 initialized with bilingual support")

    async def process(self, scanner_id: int) -> QualificationResult:
        """
        Process a scanner and qualify videos with bilingual support

        Args:
            scanner_id: Scanner ID from Supabase

        Returns:
            QualificationResult with bilingual analysis results

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
            logger.info(f"🚀 Starting qualification V2 for scanner {scanner_id}")
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

            # Update stats
            stats["videos_found"] = len(basic_videos)

            if not basic_videos:
                logger.warning(
                    f"⚠️ No new videos found for scanner {scanner_id}"
                )
                warnings.append("No new videos found in last 24h")
                execution_time = time.time() - start_time
                return QualificationResult(
                    scanner_id=scanner_id,
                    qualified_video_ids=[],
                    qualified_video_ids_csv="",
                    all_results=[],
                    results_jsonb=[],
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

            # ⚠️ WARNING: Transcript issues
            if videos_without_transcript > 0:
                warning_msg = f"⚠️ WARNING: {videos_without_transcript}/{len(transcripts)} videos have empty transcripts"
                warnings.append(f"{videos_without_transcript} videos have empty transcripts")
                logger.warning(warning_msg)

            logger.success(
                f"✅ Enrichment complete: "
                f"{len(detailed_videos)} details, "
                f"{videos_with_transcript} transcripts"
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
            # STEP 6: Claude semantic analysis (BILINGUAL)
            # ============================================
            logger.info("🧠 Running Claude V2 bilingual semantic analysis...")

            # Get bilingual analysis results
            analysis_results: List[VideoAnalysisResult] = await self.claude.semantic_analysis(
                videos=enriched_videos,
                project=project_data
            )

            # Filter approved videos
            qualified_ids = [r.id for r in analysis_results if r.status == "APPROVED"]

            # Update final stats
            stats["videos_analyzed"] = len(enriched_videos)
            stats["videos_qualified"] = len(qualified_ids)

            # ⚠️ WARNING: No videos qualified
            if len(qualified_ids) == 0 and len(enriched_videos) > 0:
                warning_msg = f"❌ Claude rejected ALL {len(enriched_videos)} videos"
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

            # Convert to JSONB format for Edge Function
            results_jsonb = [
                {
                    "id": r.id,
                    "status": r.status,
                    "motivo": r.motivo,
                    "reason": r.reason,
                    "analyzed_at": r.analyzed_at,
                    "score": r.score,
                    "tags": r.tags
                }
                for r in analysis_results
            ]

            # Create legacy CSV format for backward compatibility
            # Format: "id:status|motivo,id:status|motivo"
            csv_parts = []
            for r in analysis_results:
                if r.status == "APPROVED":
                    prefix = "✅ APPROVED"
                elif r.status == "REJECTED":
                    prefix = "❌ REJECTED"
                else:
                    prefix = "⚠️ SKIPPED"
                csv_parts.append(f"{r.id}:{prefix}｜{r.motivo}")

            qualified_video_ids_csv = ",".join(csv_parts)

            result = QualificationResult(
                scanner_id=scanner_id,
                qualified_video_ids=qualified_ids,
                qualified_video_ids_csv=qualified_video_ids_csv,  # Legacy field
                all_results=analysis_results,  # NEW: Structured results
                results_jsonb=results_jsonb,  # NEW: JSONB-ready format
                total_analyzed=len(enriched_videos),
                execution_time_seconds=execution_time,
                success=True,
                warnings=warnings,
                stats=stats
            )

            logger.info(
                f"📋 Result summary:\n"
                f"   - Scanner: {scanner_id}\n"
                f"   - Videos analyzed: {len(enriched_videos)}\n"
                f"   - Approved: {len(qualified_ids)}\n"
                f"   - Execution time: {execution_time:.2f}s\n"
                f"   - Bilingual results: YES"
            )

            return result

        except Exception as e:
            logger.error(f"❌ Error processing scanner {scanner_id}: {e}")
            raise


def get_video_qualifier() -> VideoQualifierV2:
    """Factory function to get VideoQualifier V2 instance"""
    return VideoQualifierV2()