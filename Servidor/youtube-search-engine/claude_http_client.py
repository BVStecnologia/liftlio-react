"""
Claude HTTP Client - Drop-in replacement for Anthropic client
Uses the claude-code-api container instead of Anthropic API
"""

import httpx
import os
from typing import Optional, List, Dict, Any
from dataclasses import dataclass


# API Configuration
CLAUDE_API_URL = os.environ.get("CLAUDE_API_URL", "http://liftlio-claude-api:10100")


@dataclass
class ContentBlock:
    """Mimics Anthropic's ContentBlock"""
    type: str
    text: str


@dataclass
class Usage:
    """Mimics Anthropic's Usage"""
    input_tokens: int
    output_tokens: int


@dataclass
class Message:
    """Mimics Anthropic's Message response"""
    id: str
    type: str
    role: str
    content: List[ContentBlock]
    model: str
    stop_reason: str
    usage: Usage


class MessagesAPI:
    """Mimics Anthropic's messages API"""

    def __init__(self, api_url: str):
        self.api_url = api_url
        # Map Anthropic model names to our model names
        self.model_map = {
            "claude-haiku-4-5-20251001": "haiku",
            "claude-sonnet-4-5-20250929": "sonnet",  # Map sonnet to opus for better quality
            "claude-sonnet-4-20250514": "sonnet",
            "claude-opus-4-5-20251101": "opus",
            # Fallbacks
            "haiku": "haiku",
            "sonnet": "opus",  # Use opus for sonnet tasks (user requested)
            "opus": "opus"
        }

    def _get_model(self, model: str) -> str:
        """Map Anthropic model name to our model name"""
        # User requested: use opus instead of sonnet
        if "sonnet" in model.lower():
            return "opus"
        return self.model_map.get(model, "haiku")

    def create(
        self,
        model: str,
        max_tokens: int = 1024,
        messages: Optional[List[Dict]] = None,
        system: Optional[str] = None,
        temperature: Optional[float] = None,
        **kwargs
    ) -> Message:
        """
        Synchronous create method - mimics Anthropic's messages.create()

        Args:
            model: Model name (will be mapped to haiku/sonnet/opus)
            max_tokens: Maximum tokens in response (ignored, our API handles this)
            messages: List of message dicts [{"role": "user", "content": "..."}]
            system: System prompt
            temperature: Temperature (ignored, our API uses defaults)

        Returns:
            Message object mimicking Anthropic's response
        """
        # Build the prompt
        prompt_parts = []

        # Add system prompt
        if system:
            prompt_parts.append(f"SYSTEM INSTRUCTIONS:\n{system}")

        # Add messages
        if messages:
            for msg in messages:
                role = msg.get("role", "user").upper()
                content = msg.get("content", "")
                if role == "ASSISTANT" and content:
                    # Handle assistant prefill
                    prompt_parts.append(f"[CONTINUE FROM]: {content}")
                else:
                    prompt_parts.append(f"{role}:\n{content}")

        full_prompt = "\n\n".join(prompt_parts)

        # Get mapped model
        mapped_model = self._get_model(model)

        # Make HTTP request
        with httpx.Client(timeout=180.0) as client:
            response = client.post(
                f"{self.api_url}/chat",
                json={
                    "message": full_prompt,
                    "model": mapped_model,
                    "maxTurns": 1
                }
            )
            response.raise_for_status()
            data = response.json()

        if not data.get("success"):
            raise Exception(f"Claude API error: {data.get('error', 'Unknown error')}")

        response_text = data.get("response", "")

        # Build response mimicking Anthropic's format
        return Message(
            id=data.get("sessionId", "msg_http"),
            type="message",
            role="assistant",
            content=[ContentBlock(type="text", text=response_text)],
            model=model,
            stop_reason="end_turn",
            usage=Usage(
                input_tokens=0,  # Not tracked
                output_tokens=0   # Not tracked
            )
        )


class ClaudeHTTPClient:
    """
    Drop-in replacement for Anthropic client.

    Usage:
        # Instead of:
        # from anthropic import Anthropic
        # client = Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))

        # Use:
        from claude_http_client import ClaudeHTTPClient as Anthropic
        client = Anthropic()  # No API key needed!

        # Then use exactly like Anthropic client:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": "Hello!"}]
        )
        print(response.content[0].text)
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the client.

        Args:
            api_key: Ignored - included for compatibility with Anthropic client
        """
        self.api_url = CLAUDE_API_URL
        self.messages = MessagesAPI(self.api_url)

        # Log initialization
        print(f"[ClaudeHTTPClient] Initialized with API URL: {self.api_url}")
        print(f"[ClaudeHTTPClient] Note: Using Opus for Sonnet tasks as requested")


# Alias for drop-in replacement
Anthropic = ClaudeHTTPClient
