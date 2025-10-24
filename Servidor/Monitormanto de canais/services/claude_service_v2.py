"""
Claude Service V2
Handles semantic analysis using Claude Sonnet 4.5 with bilingual support
"""

from typing import List, Dict
import json
from datetime import datetime
from anthropic import Anthropic
from loguru import logger

from config import get_settings
from models_v2 import VideoData, ProjectData, VideoAnalysisResult


# ============================================
# System Prompt (BILINGUAL VERSION)
# ============================================
SYSTEM_PROMPT_TEMPLATE = """TASK: Determine if videos are EXTREMELY relevant to the product/service described.

STRICT EVALUATION RULES:
1. Video MUST address the EXACT same niche/function as the product/service
2. Content MUST target the SAME audience identified in the product description
3. Video MUST discuss the SAME specific problems the product/service solves
4. Only consider relevant if mentioning the product would be NATURAL and EXPECTED

AUTOMATIC EXCLUSION CRITERIA:
- Videos about similar technologies but different purpose
- Videos targeting different audience than the product's target
- Videos with only superficial mentions of the product's core theme
- Videos where mentioning the product would seem forced or out of context

ANALYSIS INSTRUCTIONS:
1. CAREFULLY read the complete product/service description
2. Identify the EXACT PURPOSE, TARGET AUDIENCE, and PROBLEMS SOLVED
3. Compare each video with these specific elements
4. For EACH video, provide clear reasoning in BOTH languages

MANDATORY RESPONSE (JSON):
Return a JSON object where each key is the video_id and the value is an object with:
- status: "APPROVED", "REJECTED", or "SKIPPED"
- motivo: Reasoning in Portuguese (max 120 chars)
- reason: Reasoning in English (max 120 chars)
- score: Confidence score from 0.0 to 1.0
- tags: Array of relevant tags detected (e.g., ["b2b", "marketing", "ai"])

Example of valid response:
{{
  "abc123": {{
    "status": "APPROVED",
    "motivo": "Vídeo sobre AI marketing B2B; público enterprise alinhado",
    "reason": "B2B AI marketing video; enterprise audience aligned",
    "score": 0.92,
    "tags": ["b2b", "marketing", "ai", "enterprise"]
  }},
  "xyz789": {{
    "status": "REJECTED",
    "motivo": "Público iniciante; produto é enterprise; incompatível",
    "reason": "Beginner audience; product is enterprise; mismatch",
    "score": 0.15,
    "tags": ["beginner", "tutorial"]
  }},
  "def456": {{
    "status": "SKIPPED",
    "motivo": "Transcrição vazia; impossível avaliar",
    "reason": "Empty transcript; cannot evaluate",
    "score": 0.0,
    "tags": []
  }}
}}

IMPORTANT:
- If NO videos qualify (all rejected/skipped): return {{"result": "NOT"}}
- Provide concise, clear reasoning in BOTH languages
- Use semicolon (;) instead of commas in reasoning
- Maximum 120 characters per reasoning
- Return ONLY the JSON, no markdown or additional text
- Score indicates your confidence (0.0-1.0) in the decision
- Tags should be relevant keywords in lowercase English

Product/Service Name: {nome_produto}

Product/Service Description: {descricao_servico}"""


class ClaudeServiceV2:
    """Service for Claude AI semantic analysis with bilingual support"""

    def __init__(self):
        """Initialize Anthropic client"""
        settings = get_settings()
        self.client = Anthropic(api_key=settings.claude_api_key)
        self.model = settings.claude_model
        logger.info(f"✅ Claude AI V2 client initialized (model: {self.model})")

    def _format_video_for_prompt(self, video: VideoData) -> str:
        """
        Format a single video for Claude prompt

        Args:
            video: VideoData object

        Returns:
            Formatted string with video info
        """
        # Truncate transcript to avoid token limits (~2000 chars)
        transcript = video.transcript[:2000] if video.transcript else "N/A"

        return f"""ID: {video.id}
Title: {video.title}
Description: {video.description[:500]}...
Channel: {video.channel_title or 'N/A'}
Published: {video.published_at}
Duration: {video.duration}
Views: {video.view_count:,} | Likes: {video.like_count:,} | Comments: {video.comment_count:,}
Tags: {', '.join(video.tags[:10]) if video.tags else 'N/A'}
Transcript: {transcript}..."""

    async def semantic_analysis(
        self,
        videos: List[VideoData],
        project: ProjectData
    ) -> List[VideoAnalysisResult]:
        """
        Analyze videos semantically with bilingual support

        Args:
            videos: List of enriched VideoData objects (with transcripts)
            project: ProjectData with product context

        Returns:
            List of VideoAnalysisResult with bilingual reasoning

        Raises:
            Exception: If Claude API fails or response is invalid
        """
        try:
            logger.info(
                f"Analyzing {len(videos)} videos with Claude Sonnet 4.5 V2 "
                f"for product: {project.nome_produto}"
            )

            # Format system prompt with product context
            system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
                nome_produto=project.nome_produto,
                descricao_servico=project.descricao_servico
            )

            # Format videos for user prompt
            videos_text = "\n---\n".join([
                self._format_video_for_prompt(v) for v in videos
            ])

            user_prompt = f"""VIDEOS FOR ANALYSIS:

{videos_text}

Remember: respond ONLY with the JSON in the specified format.
For each video, provide clear reasoning in BOTH Portuguese and English."""

            # Call Claude API
            logger.debug("Sending request to Claude API...")
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,  # Increased for bilingual reasoning
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )

            # Extract response
            result = response.content[0].text.strip()

            logger.info(f"Claude raw response: {result[:200]}...")

            # Parse JSON response
            try:
                # Remove markdown code blocks if present
                if result.startswith("```"):
                    result = result.split("```")[1]
                    if result.startswith("json"):
                        result = result[4:]
                    result = result.strip()

                result_dict = json.loads(result)

                # Check if response is "NOT" (no videos qualified)
                if "result" in result_dict and result_dict["result"] == "NOT":
                    logger.info("❌ No videos qualified (all rejected/skipped)")
                    return []

                # Convert to VideoAnalysisResult objects
                analysis_results = []
                current_timestamp = datetime.utcnow().isoformat() + "Z"

                for video_id, data in result_dict.items():
                    # Extract data with defaults
                    status = data.get("status", "SKIPPED")
                    motivo = data.get("motivo", "Sem análise disponível")[:120]
                    reason = data.get("reason", "No analysis available")[:120]
                    score = data.get("score", 0.0)
                    tags = data.get("tags", [])

                    # Clean reasoning (remove problematic characters)
                    motivo = motivo.replace(',', ';').replace(':', '｜', 1)
                    reason = reason.replace(',', ';').replace(':', '｜', 1)

                    # Create result object
                    analysis_results.append(VideoAnalysisResult(
                        id=video_id,
                        status=status,
                        motivo=motivo,
                        reason=reason,
                        analyzed_at=current_timestamp,
                        score=score,
                        tags=tags
                    ))

                # Count statistics
                approved_count = sum(1 for r in analysis_results if r.status == "APPROVED")
                rejected_count = sum(1 for r in analysis_results if r.status == "REJECTED")
                skipped_count = sum(1 for r in analysis_results if r.status == "SKIPPED")

                logger.success(
                    f"✅ Claude V2 analysis complete: "
                    f"{approved_count} approved, {rejected_count} rejected, {skipped_count} skipped"
                )

                # Log tokens used (for cost tracking)
                input_tokens = response.usage.input_tokens
                output_tokens = response.usage.output_tokens
                estimated_cost = (input_tokens / 1_000_000 * 3) + (output_tokens / 1_000_000 * 15)

                logger.info(
                    f"📊 Token usage: {input_tokens} in, {output_tokens} out | "
                    f"Est. cost: ${estimated_cost:.4f}"
                )

                return analysis_results

            except json.JSONDecodeError as e:
                logger.error(f"❌ Failed to parse Claude response as JSON: {e}")
                logger.error(f"Raw response: {result}")
                raise ValueError(f"Invalid JSON from Claude: {e}")

        except Exception as e:
            logger.error(f"❌ Claude API error: {e}")
            raise


def get_claude_service() -> ClaudeServiceV2:
    """Factory function to get Claude service instance"""
    return ClaudeServiceV2()