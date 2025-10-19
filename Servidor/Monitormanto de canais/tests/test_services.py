"""
Unit Tests for Services
Tests for Supabase, YouTube, Transcript, and Claude services
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from models import VideoData, ProjectData, CanalData
from services.supabase_service import SupabaseService
from services.youtube_service import YouTubeService
from services.transcript_service import TranscriptService
from services.claude_service import ClaudeService


# ============================================
# Supabase Service Tests
# ============================================

@pytest.mark.asyncio
async def test_supabase_get_canal_e_videos():
    """Test fetching canal data from Supabase"""
    with patch('services.supabase_service.create_client') as mock_client:
        # Mock RPC response
        mock_rpc = Mock()
        mock_rpc.execute.return_value.data = [{
            "youtube_channel_id": "UCtest123",
            "videos": ["vid1", "vid2"]
        }]
        mock_client.return_value.rpc.return_value = mock_rpc

        service = SupabaseService()
        result = await service.get_canal_e_videos(123)

        assert isinstance(result, CanalData)
        assert result.youtube_channel_id == "UCtest123"
        assert len(result.videos) == 2


@pytest.mark.asyncio
async def test_supabase_get_dados_projeto():
    """Test fetching project data from Supabase"""
    with patch('services.supabase_service.create_client') as mock_client:
        # Mock RPC response
        mock_rpc = Mock()
        mock_rpc.execute.return_value.data = [{
            "nome_produto": "TestProduct",
            "descricao_servico": "Test description",
            "pais": "BR"
        }]
        mock_client.return_value.rpc.return_value = mock_rpc

        service = SupabaseService()
        result = await service.get_dados_projeto(123)

        assert isinstance(result, ProjectData)
        assert result.nome_produto == "TestProduct"
        assert result.pais == "BR"


# ============================================
# YouTube Service Tests
# ============================================

@pytest.mark.asyncio
async def test_youtube_format_duration():
    """Test ISO 8601 duration formatting"""
    service = YouTubeService()

    assert service._format_duration("PT15M42S") == "15:42"
    assert service._format_duration("PT1H23M45S") == "01:23:45"
    assert service._format_duration("PT30S") == "00:30"


@pytest.mark.asyncio
async def test_youtube_normalize_video_id():
    """Test video ID normalization"""
    service = YouTubeService()

    assert service._normalize_video_id("ABC123") == "abc123"
    assert service._normalize_video_id(" xyz789 ") == "xyz789"


# ============================================
# Transcript Service Tests
# ============================================

@pytest.mark.asyncio
async def test_transcript_get_transcript_success():
    """Test successful transcript fetch"""
    with patch('httpx.AsyncClient') as mock_client:
        # Mock successful response
        mock_response = Mock()
        mock_response.json.return_value = {
            "transcription": "Test transcript",
            "video_id": "abc123",
            "contem": True
        }
        mock_response.raise_for_status = Mock()

        mock_client.return_value.post = AsyncMock(return_value=mock_response)

        service = TranscriptService()
        result = await service.get_transcript("abc123")

        assert result == "Test transcript"


@pytest.mark.asyncio
async def test_transcript_get_transcript_timeout():
    """Test transcript fetch timeout handling"""
    import httpx

    with patch('httpx.AsyncClient') as mock_client:
        # Mock timeout exception
        mock_client.return_value.post = AsyncMock(
            side_effect=httpx.TimeoutException("Timeout")
        )

        service = TranscriptService()
        result = await service.get_transcript("abc123")

        # Should return empty string on timeout
        assert result == ""


# ============================================
# Claude Service Tests
# ============================================

def test_claude_format_video_for_prompt():
    """Test video formatting for Claude prompt"""
    service = ClaudeService()

    video = VideoData(
        id="abc123",
        title="Test Video",
        description="Test description",
        published_at="2025-10-18T15:30:00Z",
        channel_title="TestChannel",
        duration="15:42",
        view_count=1000,
        like_count=50,
        comment_count=10,
        tags=["test", "video"],
        transcript="Test transcript"
    )

    result = service._format_video_for_prompt(video)

    assert "ID: abc123" in result
    assert "Título: Test Video" in result
    assert "Views: 1,000" in result


@pytest.mark.asyncio
async def test_claude_semantic_analysis_not():
    """Test Claude analysis returning NOT"""
    with patch('services.claude_service.Anthropic') as mock_anthropic:
        # Mock Claude response: NOT
        mock_response = Mock()
        mock_response.content = [Mock(text="NOT")]
        mock_response.usage = Mock(input_tokens=1000, output_tokens=10)

        mock_client = Mock()
        mock_client.messages.create.return_value = mock_response
        mock_anthropic.return_value = mock_client

        service = ClaudeService()

        videos = [
            VideoData(
                id="abc123",
                title="Test",
                description="Test",
                published_at="2025-10-18T15:30:00Z",
                transcript="Test transcript"
            )
        ]

        project = ProjectData(
            nome_produto="TestProduct",
            descricao_servico="Test description",
            pais="BR"
        )

        result = await service.semantic_analysis(videos, project)

        assert result == []


@pytest.mark.asyncio
async def test_claude_semantic_analysis_qualified():
    """Test Claude analysis returning qualified IDs"""
    with patch('services.claude_service.Anthropic') as mock_anthropic:
        # Mock Claude response: qualified IDs
        mock_response = Mock()
        mock_response.content = [Mock(text="abc123,xyz789")]
        mock_response.usage = Mock(input_tokens=1000, output_tokens=20)

        mock_client = Mock()
        mock_client.messages.create.return_value = mock_response
        mock_anthropic.return_value = mock_client

        service = ClaudeService()

        videos = [
            VideoData(
                id="abc123",
                title="Test 1",
                description="Test",
                published_at="2025-10-18T15:30:00Z",
                transcript="Test transcript"
            ),
            VideoData(
                id="xyz789",
                title="Test 2",
                description="Test",
                published_at="2025-10-18T15:30:00Z",
                transcript="Test transcript"
            )
        ]

        project = ProjectData(
            nome_produto="TestProduct",
            descricao_servico="Test description",
            pais="BR"
        )

        result = await service.semantic_analysis(videos, project)

        assert len(result) == 2
        assert "abc123" in result
        assert "xyz789" in result
