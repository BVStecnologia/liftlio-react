"""
Supabase Service
Handles Supabase RPC calls for channel and project data
"""

from typing import Dict, Any
from supabase import create_client, Client
from loguru import logger

from config import get_settings
from models import CanalData, ProjectData


class SupabaseService:
    """Service for Supabase database operations"""

    def __init__(self):
        """Initialize Supabase client"""
        settings = get_settings()
        self.client: Client = create_client(
            settings.supabase_url,
            settings.supabase_key
        )
        logger.info("✅ Supabase client initialized")

    async def get_canal_e_videos(self, scanner_id: int) -> CanalData:
        """
        Get channel data and video IDs from Supabase

        Calls RPC: obter_canal_e_videos
        Returns: CanalData with youtube_channel_id and excluded videos list

        Args:
            scanner_id: Scanner ID from Supabase table

        Returns:
            CanalData object

        Raises:
            Exception: If RPC fails or data is invalid
        """
        try:
            logger.info(f"Fetching canal data for scanner {scanner_id}")

            # Call Supabase RPC
            response = self.client.rpc(
                'obter_canal_e_videos',
                {'canal_id': scanner_id}
            ).execute()

            if not response.data:
                raise ValueError(f"No data returned for scanner {scanner_id}")

            # Parse response
            data = response.data
            if isinstance(data, list) and len(data) > 0:
                data = data[0]

            # Handle different response structures
            canal_id = data.get("youtube_channel_id", "")
            videos = data.get("videos", [])

            # If videos is a single ID, make it a list
            if isinstance(videos, str):
                videos = [videos] if videos else []
            elif not isinstance(videos, list):
                videos = []

            result = CanalData(
                youtube_channel_id=canal_id,
                videos=videos
            )

            logger.success(
                f"✅ Canal data fetched: {result.youtube_channel_id}, "
                f"{len(result.videos)} excluded videos"
            )
            return result

        except Exception as e:
            logger.error(f"❌ Error fetching canal data: {e}")
            raise

    async def get_dados_projeto(self, scanner_id: int) -> ProjectData:
        """
        Get project/product data from Supabase

        Calls RPC: obter_dados_projeto_por_canal
        Returns: ProjectData with product name, description, and country

        Args:
            scanner_id: Scanner ID from Supabase table

        Returns:
            ProjectData object

        Raises:
            Exception: If RPC fails or data is invalid
        """
        try:
            logger.info(f"Fetching project data for scanner {scanner_id}")

            # Call Supabase RPC
            response = self.client.rpc(
                'obter_dados_projeto_por_canal',
                {'canal_id': scanner_id}
            ).execute()

            if not response.data:
                raise ValueError(f"No project data returned for scanner {scanner_id}")

            # Parse response
            data = response.data
            if isinstance(data, list) and len(data) > 0:
                data = data[0]

            result = ProjectData(
                nome_produto=data.get("nome_produto", ""),
                descricao_servico=data.get("descricao_servico", ""),
                pais=data.get("pais", "BR")
            )

            logger.success(
                f"✅ Project data fetched: {result.nome_produto} ({result.pais})"
            )
            return result

        except Exception as e:
            logger.error(f"❌ Error fetching project data: {e}")
            raise


# ============================================
# Singleton instance
# ============================================
_supabase_service: SupabaseService | None = None


def get_supabase_service() -> SupabaseService:
    """Get Supabase service singleton"""
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = SupabaseService()
    return _supabase_service
