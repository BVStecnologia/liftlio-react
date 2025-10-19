"""
Claude Service
Handles semantic analysis using Claude Sonnet 4.5
"""

from typing import List
from anthropic import Anthropic
from loguru import logger

from config import get_settings
from models import VideoData, ProjectData


# ============================================
# System Prompt (from Langflow workflow)
# ============================================
SYSTEM_PROMPT_TEMPLATE = """TAREFA: Determinar se vídeos são EXTREMAMENTE relevantes para o produto/serviço descrito.

REGRAS ESTRITAS DE AVALIAÇÃO:
1. O vídeo DEVE abordar EXATAMENTE o mesmo nicho/função descrito na seção "Nome do produto ou serviço" abaixo
2. O conteúdo DEVE ser direcionado ao MESMO público-alvo identificado na descrição do produto/serviço
3. O vídeo DEVE discutir os MESMOS problemas específicos que o produto/serviço resolve
4. APENAS considere relevante se mencionar o produto/serviço seria NATURAL e ESPERADO

CRITÉRIOS DE EXCLUSÃO AUTOMÁTICA:
- Vídeos sobre tecnologias ou métodos similares mas com propósito diferente
- Vídeos direcionados a um público diferente do público-alvo do produto/serviço
- Vídeos com apenas menções superficiais ao tema central do produto/serviço
- Vídeos em que mencionar o produto/serviço pareceria forçado ou fora de contexto

INSTRUÇÕES DE ANÁLISE:
1. Leia CUIDADOSAMENTE a descrição completa do produto/serviço
2. Identifique o PROPÓSITO EXATO, PÚBLICO-ALVO e PROBLEMAS RESOLVIDOS
3. Compare cada vídeo com esses elementos específicos
4. Rejeite vídeos que não atendam a TODOS os critérios

RESPOSTA OBRIGATÓRIA:
- Se NENHUM vídeo atender a TODOS os critérios: "NOT"
- Se algum vídeo atender: apenas o ID (ex: "abc123" ou "abc123,xyz789")

⚠️ QUALQUER EXPLICAÇÃO OU TEXTO ADICIONAL RESULTARÁ EM FALHA NA TAREFA.

Nome do produto ou serviço: {nome_produto}

Descrição do produto ou serviço: {descricao_servico}"""


class ClaudeService:
    """Service for Claude AI semantic analysis"""

    def __init__(self):
        """Initialize Anthropic client"""
        settings = get_settings()
        self.client = Anthropic(api_key=settings.claude_api_key)
        self.model = settings.claude_model
        logger.info(f"✅ Claude AI client initialized (model: {self.model})")

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
Título: {video.title}
Descrição: {video.description[:500]}...
Canal: {video.channel_title or 'N/A'}
Publicado: {video.published_at}
Duração: {video.duration}
Views: {video.view_count:,} | Likes: {video.like_count:,} | Comments: {video.comment_count:,}
Tags: {', '.join(video.tags[:10]) if video.tags else 'N/A'}
Transcrição: {transcript}..."""

    async def semantic_analysis(
        self,
        videos: List[VideoData],
        project: ProjectData
    ) -> List[str]:
        """
        Analyze videos semantically to determine relevance to product/service

        Args:
            videos: List of enriched VideoData objects (with transcripts)
            project: ProjectData with product context

        Returns:
            List of qualified video IDs

        Raises:
            Exception: If Claude API fails or response is invalid
        """
        try:
            logger.info(
                f"Analyzing {len(videos)} videos with Claude Sonnet 4.5 "
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

            user_prompt = f"""VÍDEOS PARA ANÁLISE:

{videos_text}

Lembre-se: responda APENAS com os IDs separados por vírgula ou "NOT".
Nenhuma explicação ou texto adicional!"""

            # Call Claude API
            logger.debug("Sending request to Claude API...")
            response = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )

            # Extract response
            result = response.content[0].text.strip()

            logger.info(f"Claude response: {result}")

            # Validate response format (should be "NOT" or "id1,id2,...")
            if result not in ["NOT", "not"]:
                # Check if contains only IDs and commas
                if not all(c.isalnum() or c in [',', '_', '-'] for c in result):
                    logger.warning(
                        f"⚠️ Claude response contains unexpected characters: {result}"
                    )
                    # Try to extract only valid IDs
                    import re
                    result = re.sub(r'[^a-zA-Z0-9,_-]', '', result)

            # Parse response
            if result.upper() == "NOT":
                logger.info("❌ No videos qualified")
                return []

            qualified_ids = [vid.strip() for vid in result.split(",") if vid.strip()]

            logger.success(
                f"✅ Claude analysis complete: {len(qualified_ids)} videos qualified"
            )

            # Log tokens used (for cost tracking)
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            estimated_cost = (input_tokens / 1_000_000 * 3) + (output_tokens / 1_000_000 * 15)

            logger.info(
                f"Tokens used: {input_tokens:,} input + {output_tokens:,} output "
                f"(~${estimated_cost:.4f})"
            )

            return qualified_ids

        except Exception as e:
            logger.error(f"❌ Error in Claude analysis: {e}")
            raise


# ============================================
# Singleton instance
# ============================================
_claude_service: ClaudeService | None = None


def get_claude_service() -> ClaudeService:
    """Get Claude service singleton"""
    global _claude_service
    if _claude_service is None:
        _claude_service = ClaudeService()
    return _claude_service
