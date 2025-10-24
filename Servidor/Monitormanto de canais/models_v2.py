"""
Video Qualifier - Pydantic Models V2
Data validation and serialization schemas with bilingual support
"""

from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel, Field, validator


# ============================================
# Request Models
# ============================================

class QualifyRequest(BaseModel):
    """Request to qualify videos from a channel scanner"""
    scanner_id: int = Field(..., description="Scanner ID from Supabase", gt=0)

    class Config:
        json_schema_extra = {
            "example": {
                "scanner_id": 123
            }
        }


# ============================================
# Video Analysis Result (NEW)
# ============================================

class VideoAnalysisResult(BaseModel):
    """Individual video analysis result with bilingual support"""
    id: str = Field(..., description="YouTube video ID")
    status: str = Field(..., description="APPROVED, REJECTED, or SKIPPED")
    motivo: str = Field(..., description="Reasoning in Portuguese")
    reason: str = Field(..., description="Reasoning in English")
    analyzed_at: str = Field(..., description="ISO 8601 timestamp")
    score: Optional[float] = Field(None, description="AI confidence score (0-1)")
    tags: Optional[List[str]] = Field(default_factory=list, description="Detected tags/categories")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "abc123",
                "status": "APPROVED",
                "motivo": "Vídeo sobre AI marketing B2B; audiência enterprise",
                "reason": "Video about B2B AI marketing; enterprise audience",
                "analyzed_at": "2025-01-24T10:30:00Z",
                "score": 0.85,
                "tags": ["b2b", "marketing", "ai", "enterprise"]
            }
        }


# ============================================
# Response Models (UPDATED)
# ============================================

class QualificationResult(BaseModel):
    """Result of video qualification process with bilingual support"""
    scanner_id: int = Field(..., description="Scanner ID processed")

    # Legacy fields (kept for backward compatibility)
    qualified_video_ids: List[str] = Field(
        default_factory=list,
        description="List of qualified video IDs"
    )
    qualified_video_ids_csv: str = Field(
        default="",
        description="Comma-separated qualified video IDs (DEPRECATED)"
    )

    # NEW: Structured results
    all_results: List[VideoAnalysisResult] = Field(
        default_factory=list,
        description="All video analysis results with bilingual reasoning"
    )

    # NEW: JSONB-ready format for Edge Function
    results_jsonb: Optional[List[Dict]] = Field(
        None,
        description="JSONB-ready array for direct database storage"
    )

    # Existing fields
    total_analyzed: int = Field(
        default=0,
        description="Total number of videos analyzed"
    )
    execution_time_seconds: float = Field(
        default=0.0,
        description="Total execution time in seconds"
    )
    success: bool = Field(default=True, description="Whether process succeeded")
    error: Optional[str] = Field(default=None, description="Error message if failed")

    # Diagnostic fields
    warnings: List[str] = Field(
        default_factory=list,
        description="List of warnings during processing"
    )
    stats: dict = Field(
        default_factory=dict,
        description="Detailed statistics about the qualification process"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "scanner_id": 123,
                "qualified_video_ids": ["abc123", "xyz789"],
                "qualified_video_ids_csv": "abc123,xyz789",
                "all_results": [
                    {
                        "id": "abc123",
                        "status": "APPROVED",
                        "motivo": "Marketing B2B relevante",
                        "reason": "Relevant B2B marketing",
                        "analyzed_at": "2025-01-24T10:30:00Z",
                        "score": 0.92,
                        "tags": ["b2b", "marketing"]
                    }
                ],
                "total_analyzed": 20,
                "execution_time_seconds": 45.3,
                "success": True,
                "error": None
            }
        }


# ============================================
# Internal Data Models
# ============================================

class VideoData(BaseModel):
    """Complete video data with enrichments"""
    id: str = Field(..., description="YouTube video ID")
    title: str = Field(..., description="Video title")
    description: str = Field(default="", description="Video description")
    published_at: str = Field(..., description="Publication date (ISO 8601)")
    channel_title: Optional[str] = Field(default=None, description="Channel name")

    # Video stats
    duration: Optional[str] = Field(default=None, description="Duration (HH:MM:SS)")
    view_count: Optional[int] = Field(default=0, description="View count")
    like_count: Optional[int] = Field(default=0, description="Like count")
    comment_count: Optional[int] = Field(default=0, description="Comment count")

    # Additional metadata
    tags: Optional[List[str]] = Field(default_factory=list, description="Video tags")
    thumbnail_url: Optional[str] = Field(default=None, description="Thumbnail URL")

    # Transcription
    transcript: str = Field(default="", description="Video transcription")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "jNQXAC9IVRw",
                "title": "Como criar sistema de monitoramento",
                "description": "Tutorial completo...",
                "published_at": "2025-10-18T15:30:00Z",
                "channel_title": "TechBrasil",
                "duration": "15:42",
                "view_count": 12543,
                "like_count": 892,
                "comment_count": 156,
                "tags": ["ai", "monitoring", "youtube"],
                "transcript": "[00:00:01] Olá pessoal..."
            }
        }


class ProjectData(BaseModel):
    """Project/Product data from Supabase"""
    nome_produto: str = Field(..., description="Product/Service name")
    descricao_servico: str = Field(..., description="Product/Service description")
    pais: str = Field(..., description="Country code (BR, US, etc)")

    class Config:
        json_schema_extra = {
            "example": {
                "nome_produto": "Liftlio",
                "descricao_servico": "Plataforma de monitoramento de vídeos com AI",
                "pais": "BR"
            }
        }


class CanalData(BaseModel):
    """Channel data from Supabase"""
    youtube_channel_id: str = Field(..., description="YouTube channel ID")
    videos: Optional[List[str]] = Field(
        default_factory=list,
        description="List of excluded video IDs"
    )

    @validator('youtube_channel_id')
    def validate_channel_id(cls, v):
        """Validate YouTube channel ID format"""
        if not v or len(v) < 10:
            raise ValueError("Invalid YouTube channel ID")
        return v.strip()

    class Config:
        json_schema_extra = {
            "example": {
                "youtube_channel_id": "UCxxxxxxxxxxxxxx",
                "videos": ["vid1", "vid2", "vid3"]
            }
        }


# ============================================
# Health Check Model
# ============================================

class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(default="ok", description="Service status")
    service: str = Field(default="video-qualifier", description="Service name")
    version: str = Field(default="2.0.0", description="Service version (bilingual)")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "ok",
                "service": "video-qualifier",
                "version": "2.0.0"
            }
        }