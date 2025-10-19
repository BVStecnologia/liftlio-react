"""
Video Qualifier - Pydantic Models
Data validation and serialization schemas
"""

from typing import List, Optional
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
# Response Models
# ============================================

class QualificationResult(BaseModel):
    """Result of video qualification process"""
    scanner_id: int = Field(..., description="Scanner ID processed")
    qualified_video_ids: List[str] = Field(
        default_factory=list,
        description="List of qualified video IDs"
    )
    qualified_video_ids_csv: str = Field(
        default="",
        description="Comma-separated qualified video IDs"
    )
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

    class Config:
        json_schema_extra = {
            "example": {
                "scanner_id": 123,
                "qualified_video_ids": ["abc123", "xyz789"],
                "qualified_video_ids_csv": "abc123,xyz789",
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
    version: str = Field(default="1.0.0", description="Service version")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "ok",
                "service": "video-qualifier",
                "version": "1.0.0"
            }
        }
