"""
Video Qualifier - Configuration
Environment variables loader and validation
"""

import os
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

# Load .env file
load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # ============================================
    # YouTube Data API v3
    # ============================================
    youtube_api_key: str = Field(
        ...,
        description="YouTube Data API v3 key",
        min_length=30
    )

    # ============================================
    # Claude API (Anthropic)
    # ============================================
    claude_api_key: str = Field(
        ...,
        description="Anthropic Claude API key",
        min_length=30
    )
    claude_model: str = Field(
        default="claude-sonnet-4-5-20250929",
        description="Claude model to use"
    )

    # ============================================
    # Supabase
    # ============================================
    supabase_url: str = Field(
        ...,
        description="Supabase project URL",
        min_length=20
    )
    supabase_key: str = Field(
        ...,
        description="Supabase anon/service key",
        min_length=100
    )

    # ============================================
    # Transcription API
    # ============================================
    transcript_api_url: str = Field(
        default="http://173.249.22.2:8081",
        description="Transcription API base URL"
    )

    # ============================================
    # Server Configuration
    # ============================================
    port: int = Field(default=8000, description="Server port", ge=1, le=65535)
    host: str = Field(default="0.0.0.0", description="Server host")
    log_level: str = Field(
        default="INFO",
        description="Logging level"
    )

    # ============================================
    # Optional Settings
    # ============================================
    max_concurrent_transcripts: int = Field(
        default=5,
        description="Max concurrent transcription requests",
        ge=1,
        le=20
    )
    transcript_timeout: int = Field(
        default=300,
        description="Transcription API timeout (seconds)",
        ge=60,
        le=600
    )
    youtube_max_results: int = Field(
        default=20,
        description="Max videos to fetch from YouTube",
        ge=1,
        le=50
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


# ============================================
# Singleton instance
# ============================================
try:
    settings = Settings()
    print(f"✅ Configuration loaded successfully")
    print(f"   YouTube API: {'*' * 20}{settings.youtube_api_key[-10:]}")
    print(f"   Claude Model: {settings.claude_model}")
    print(f"   Supabase URL: {settings.supabase_url}")
    print(f"   Transcript API: {settings.transcript_api_url}")
    print(f"   Server: {settings.host}:{settings.port}")
except Exception as e:
    print(f"❌ Error loading configuration: {e}")
    print(f"   Make sure .env file exists with all required variables")
    raise


# ============================================
# Helper function to get settings
# ============================================
def get_settings() -> Settings:
    """Get application settings singleton"""
    return settings
