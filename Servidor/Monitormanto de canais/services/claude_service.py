"""
Claude Service
Handles semantic analysis using Claude Sonnet 4.5
"""

from typing import List, Dict
import json
from anthropic import Anthropic
from loguru import logger

from config import get_settings
from models import VideoData, ProjectData


# ============================================
# System Prompt (UPDATED: Now returns JSON with reasoning)
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
4. Para CADA vídeo, forneça uma justificativa clara e objetiva

RESPOSTA OBRIGATÓRIA (JSON):
Retorne um objeto JSON onde cada chave é o video_id e o valor é a justificativa formatada.

Formato da justificativa:
- Se APROVADO: "✅ APPROVED: [motivo específico em 1-2 frases, max 120 chars]"
- Se REJEITADO: "❌ REJECTED: [motivo específico da rejeição, max 120 chars]"
- Se DADOS INSUFICIENTES para análise: "⚠️ SKIPPED: [problema encontrado - ex: transcrição vazia]"

Exemplo de resposta válida:
{{
  "abc123": "✅ APPROVED: Vídeo sobre AI marketing B2B; target enterprise alinhado; menção natural possível",
  "xyz789": "❌ REJECTED: Público iniciante em marketing digital; produto é enterprise; mismatch de audiência",
  "def456": "⚠️ SKIPPED: Transcrição vazia; impossível avaliar conteúdo semântico"
}}

IMPORTANTE:
- Se NENHUM vídeo qualificado (todos rejected/skipped): retorne {{"result": "NOT"}}
- Justificativas em PT-BR, objetivas, claras
- Use ponto-e-vírgula (;) ao invés de vírgulas nas justificativas
- Máximo 120 caracteres por justificativa
- Retorne APENAS o JSON, sem markdown ou texto adicional
- Use EXATAMENTE os prefixos: ✅ APPROVED, ❌ REJECTED, ⚠️ SKIPPED

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
    ) -> Dict[str, str]:
        """
        Analyze videos semantically to determine relevance to product/service

        Args:
            videos: List of enriched VideoData objects (with transcripts)
            project: ProjectData with product context

        Returns:
            Dict mapping video_id -> reasoning (e.g., "✅ APPROVED: motivo...")
            Returns empty dict if no videos qualified

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

Lembre-se: responda APENAS com o JSON no formato especificado.
Para cada vídeo, forneça uma justificativa clara em PT-BR usando os prefixos ✅ APPROVED, ❌ REJECTED ou ⚠️ SKIPPED."""

            # Call Claude API
            logger.debug("Sending request to Claude API...")
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1500,  # Increased for detailed reasoning
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
                    return {}

                # Sanitize reasoning values (remove problematic characters)
                sanitized_dict = {}
                for video_id, reasoning in result_dict.items():
                    # Replace commas and colons that could break CSV format
                    clean_reasoning = reasoning.replace(',', ';').replace(':', '｜', 1)
                    # Replace any additional colons with semicolon
                    clean_reasoning = clean_reasoning.replace(':', ';')
                    # Truncate to 120 chars max
                    clean_reasoning = clean_reasoning[:120]
                    sanitized_dict[video_id] = clean_reasoning

                # Count approved videos
                approved_count = sum(1 for r in sanitized_dict.values() if "✅ APPROVED" in r)
                rejected_count = sum(1 for r in sanitized_dict.values() if "❌ REJECTED" in r)
                skipped_count = sum(1 for r in sanitized_dict.values() if "⚠️ SKIPPED" in r)

                logger.success(
                    f"✅ Claude analysis complete: "
                    f"{approved_count} approved, {rejected_count} rejected, {skipped_count} skipped"
                )

                # Log tokens used (for cost tracking)
                input_tokens = response.usage.input_tokens
                output_tokens = response.usage.output_tokens
                estimated_cost = (input_tokens / 1_000_000 * 3) + (output_tokens / 1_000_000 * 15)

                logger.info(
                    f"Tokens used: {input_tokens:,} input + {output_tokens:,} output "
                    f"(~${estimated_cost:.4f})"
                )

                return sanitized_dict

            except json.JSONDecodeError as e:
                logger.error(f"❌ Failed to parse Claude JSON response: {e}")
                logger.error(f"Raw response was: {result}")
                # Fallback: return empty dict
                return {}

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
