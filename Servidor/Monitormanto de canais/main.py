"""
Video Qualifier API
FastAPI server for video qualification endpoints
"""

import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from models import QualifyRequest, QualificationResult, HealthResponse
from core.qualifier import get_video_qualifier
from config import get_settings


# ============================================
# Logging Configuration
# ============================================
logger.remove()  # Remove default handler
logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    level=get_settings().log_level
)


# ============================================
# FastAPI App
# ============================================
app = FastAPI(
    title="Video Qualifier API",
    description="API for qualifying YouTube videos using semantic analysis with Claude Sonnet 4.5",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)


# ============================================
# CORS Configuration
# ============================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Endpoints
# ============================================

@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint - redirects to health check"""
    return HealthResponse(
        status="ok",
        service="video-qualifier",
        version="1.0.0"
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint

    Returns:
        HealthResponse: Service status
    """
    logger.debug("Health check requested")
    return HealthResponse(
        status="ok",
        service="video-qualifier",
        version="1.0.0"
    )


@app.post("/qualify-videos", response_model=QualificationResult)
async def qualify_videos(request: QualifyRequest):
    """
    Qualify videos from a YouTube channel scanner

    This endpoint:
    1. Fetches channel and project data from Supabase
    2. Discovers new YouTube videos
    3. Enriches videos with details and transcriptions
    4. Analyzes videos semantically with Claude Sonnet 4.5
    5. Returns qualified video IDs

    Args:
        request: QualifyRequest with scanner_id

    Returns:
        QualificationResult: Qualified video IDs and stats

    Raises:
        HTTPException: If qualification fails
    """
    try:
        logger.info(
            f"📥 Received qualification request for scanner {request.scanner_id}"
        )

        # Get qualifier instance
        qualifier = get_video_qualifier()

        # Process qualification
        result = await qualifier.process(request.scanner_id)

        # Check if successful
        if not result.success:
            logger.error(
                f"❌ Qualification failed for scanner {request.scanner_id}: "
                f"{result.error}"
            )
            raise HTTPException(
                status_code=500,
                detail=f"Qualification failed: {result.error}"
            )

        logger.success(
            f"✅ Qualification successful for scanner {request.scanner_id}: "
            f"{len(result.qualified_video_ids)} videos qualified"
        )

        return result

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error in qualify_videos endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


# ============================================
# Startup/Shutdown Events
# ============================================

@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    settings = get_settings()
    logger.info("=" * 60)
    logger.info("🚀 Video Qualifier API Starting...")
    logger.info(f"   Server: {settings.host}:{settings.port}")
    logger.info(f"   Claude Model: {settings.claude_model}")
    logger.info(f"   Transcript API: {settings.transcript_api_url}")
    logger.info(f"   Supabase: {settings.supabase_url}")
    logger.info(f"   Log Level: {settings.log_level}")
    logger.info("=" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown"""
    logger.info("🛑 Video Qualifier API Shutting down...")


# ============================================
# Run Server (for local testing)
# ============================================
if __name__ == "__main__":
    import uvicorn

    settings = get_settings()

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,  # Auto-reload on code changes (disable in production)
        log_level=settings.log_level.lower()
    )
