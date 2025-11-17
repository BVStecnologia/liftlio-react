"""
Claude Service
Handles semantic analysis using Claude Sonnet 4.5 with 2-stage filtering
"""

from typing import List, Dict
import json
from anthropic import Anthropic
from loguru import logger

from config import get_settings
from models import VideoData, ProjectData


# ============================================
# STAGE 1: Pre-filter Prompt (no transcript)
# ============================================
STAGE1_PROMPT_TEMPLATE = """TAREFA: Pré-filtro rápido - Determinar se vídeos PODEM SER relevantes com base APENAS em metadados (título, descrição, tags).

REGRAS DE PRÉ-FILTRO:
1. APROVAR (PASS) se houver QUALQUER INDICAÇÃO de que o vídeo pode abordar o nicho/função do produto
2. REJEITAR apenas casos ÓBVIOS de incompatibilidade:
   - Nicho completamente diferente (ex: culinária vs. software)
   - Idioma incompatível (se o produto tem target específico)
   - Conteúdo claramente infantil/entretenimento quando produto é B2B
   - Spam, clickbait sem relação

IMPORTANTE:
- Este é um FILTRO INICIAL - seja PERMISSIVO
- Na dúvida, APROVE (deixe para Stage 2 decidir)
- REJEITE apenas quando CERTAMENTE irrelevante

RESPOSTA OBRIGATÓRIA (JSON):
Retorne um objeto JSON onde cada chave é o video_id e o valor é:
- "PASS" se aprovado para análise completa
- "PRE_FILTER_REJECT: [motivo breve, max 80 chars]" se claramente irrelevante

Exemplo:
{{
  "abc123": "PASS",
  "xyz789": "PRE_FILTER_REJECT: Vídeo sobre culinária; produto é SaaS B2B",
  "def456": "PASS"
}}

ATENÇÃO: Use EXATAMENTE o prefixo "PRE_FILTER_REJECT:" (não use "REJECT:")
Isso indica que o vídeo foi rejeitado no pré-filtro (Stage 1) antes da análise completa.

Nome do produto ou serviço: {nome_produto}

Descrição do produto ou serviço: {descricao_servico}"""


# ============================================
# STAGE 2: Full Analysis Prompt (with transcript)
# ============================================
STAGE2_PROMPT_TEMPLATE = """TAREFA: Determinar se vídeos são EXTREMAMENTE relevantes para o produto/serviço descrito.

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
    """Service for Claude AI semantic analysis with 2-stage filtering"""

    def __init__(self):
        """Initialize Anthropic client"""
        settings = get_settings()
        self.client = Anthropic(api_key=settings.claude_api_key)
        self.model = settings.claude_model
        logger.info(f"✅ Claude AI client initialized (model: {self.model})")

    def _format_video_light(self, video: VideoData) -> str:
        """
        Format a single video for Stage 1 (pre-filter) - NO TRANSCRIPT

        Args:
            video: VideoData object

        Returns:
            Formatted string with video metadata only
        """
        return f"""ID: {video.id}
Título: {video.title}
Descrição: {video.description[:500]}...
Canal: {video.channel_title or 'N/A'}
Publicado: {video.published_at}
Duração: {video.duration}
Views: {video.view_count:,} | Likes: {video.like_count:,} | Comments: {video.comment_count:,}
Tags: {', '.join(video.tags[:10]) if video.tags else 'N/A'}"""

    def _format_video_full(self, video: VideoData) -> str:
        """
        Format a single video for Stage 2 (full analysis) - WITH TRANSCRIPT

        Args:
            video: VideoData object

        Returns:
            Formatted string with video info + transcript
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

    async def _pre_filter_stage(
        self,
        videos: List[VideoData],
        project: ProjectData
    ) -> Dict[str, str]:
        """
        STAGE 1: Pre-filter videos using metadata only (no transcript)

        Args:
            videos: List of VideoData objects
            project: ProjectData with product context

        Returns:
            Dict mapping video_id -> "PASS" or "PRE_FILTER_REJECT: motivo"

        Raises:
            Exception: If Claude API fails
        """
        try:
            logger.info(f"🔍 [STAGE 1] Pre-filtering {len(videos)} videos (metadata only)...")

            # Format system prompt with product context
            system_prompt = STAGE1_PROMPT_TEMPLATE.format(
                nome_produto=project.nome_produto,
                descricao_servico=project.descricao_servico
            )

            # Format videos for user prompt (WITHOUT transcript)
            videos_text = "\n---\n".join([
                self._format_video_light(v) for v in videos
            ])

            user_prompt = f"""VÍDEOS PARA PRÉ-FILTRO:

{videos_text}

Lembre-se: responda APENAS com o JSON no formato especificado.
Para cada vídeo, retorne "PASS" ou "PRE_FILTER_REJECT: motivo breve"."""

            # Call Claude API
            logger.debug("Sending Stage 1 request to Claude API...")
            response = self.client.messages.create(
                model=self.model,
                max_tokens=800,  # Stage 1 needs fewer tokens
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )

            # Extract response
            result = response.content[0].text.strip()

            logger.debug(f"Stage 1 raw response: {result[:200]}...")

            # Parse JSON response
            try:
                # Remove markdown code blocks if present
                if result.startswith("```"):
                    result = result.split("```")[1]
                    if result.startswith("json"):
                        result = result[4:]
                    result = result.strip()

                result_dict = json.loads(result)

                # Count pass/reject
                pass_count = sum(1 for r in result_dict.values() if r == "PASS")
                reject_count = len(result_dict) - pass_count

                logger.success(
                    f"✅ [STAGE 1] Pre-filter complete: "
                    f"{pass_count} passed, {reject_count} rejected"
                )

                # Log tokens used
                input_tokens = response.usage.input_tokens
                output_tokens = response.usage.output_tokens
                estimated_cost = (input_tokens / 1_000_000 * 3) + (output_tokens / 1_000_000 * 15)

                logger.info(
                    f"[STAGE 1] Tokens: {input_tokens:,} input + {output_tokens:,} output "
                    f"(~${estimated_cost:.4f})"
                )

                return result_dict

            except json.JSONDecodeError as e:
                logger.error(f"❌ [STAGE 1] Failed to parse JSON response: {e}")
                logger.error(f"Raw response was: {result}")
                raise

        except Exception as e:
            logger.error(f"❌ [STAGE 1] Error in pre-filter: {e}")
            raise

    async def semantic_analysis(
        self,
        videos: List[VideoData],
        project: ProjectData
    ) -> Dict[str, str]:
        """
        Analyze videos semantically using 2-stage filtering

        STAGE 1: Pre-filter based on metadata only (fast, cheap)
        STAGE 2: Full analysis with transcript (only for approved videos)

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
                f"🎯 Starting 2-stage analysis for {len(videos)} videos "
                f"(product: {project.nome_produto})"
            )

            # ============================================
            # STAGE 1: Pre-filter (metadata only)
            # ============================================
            stage1_results = await self._pre_filter_stage(videos, project)

            # Separate approved and rejected videos
            approved_videos = []
            final_results = {}

            for video in videos:
                stage1_decision = stage1_results.get(video.id, "PASS")

                if stage1_decision == "PASS":
                    approved_videos.append(video)
                else:
                    # Extract rejection reason (handle both REJECT: and PRE_FILTER_REJECT:)
                    if stage1_decision.startswith("PRE_FILTER_REJECT:"):
                        reject_reason = stage1_decision.replace("PRE_FILTER_REJECT: ", "")
                    else:
                        reject_reason = stage1_decision.replace("REJECT: ", "")
                    final_results[video.id] = f"❌ REJECTED: {reject_reason}"

            # If no videos passed Stage 1, return early
            if not approved_videos:
                logger.warning("⚠️ No videos passed Stage 1 pre-filter")
                return final_results

            logger.info(f"✅ {len(approved_videos)} videos approved for Stage 2 analysis")

            # ============================================
            # STAGE 2: Full analysis (WITH transcript)
            # ============================================
            logger.info(f"🔍 [STAGE 2] Analyzing {len(approved_videos)} videos with full context...")

            # Format system prompt with product context
            system_prompt = STAGE2_PROMPT_TEMPLATE.format(
                nome_produto=project.nome_produto,
                descricao_servico=project.descricao_servico
            )

            # Format videos for user prompt (WITH transcript)
            videos_text = "\n---\n".join([
                self._format_video_full(v) for v in approved_videos
            ])

            user_prompt = f"""VÍDEOS PARA ANÁLISE:

{videos_text}

Lembre-se: responda APENAS com o JSON no formato especificado.
Para cada vídeo, forneça uma justificativa clara em PT-BR usando os prefixos ✅ APPROVED, ❌ REJECTED ou ⚠️ SKIPPED."""

            # Call Claude API
            logger.debug("Sending Stage 2 request to Claude API...")
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

            logger.debug(f"Stage 2 raw response: {result[:200]}...")

            # Parse JSON response
            try:
                # Remove markdown code blocks if present
                if result.startswith("```"):
                    result = result.split("```")[1]
                    if result.startswith("json"):
                        result = result[4:]
                    result = result.strip()

                stage2_dict = json.loads(result)

                # Check if response is "NOT" (no videos qualified)
                if "result" in stage2_dict and stage2_dict["result"] == "NOT":
                    logger.info("❌ [STAGE 2] No videos qualified (all rejected/skipped)")
                    return final_results

                # Sanitize reasoning values (remove problematic characters)
                for video_id, reasoning in stage2_dict.items():
                    # Replace commas and colons that could break CSV format
                    clean_reasoning = reasoning.replace(',', ';').replace(':', '｜', 1)
                    # Replace any additional colons with semicolon
                    clean_reasoning = clean_reasoning.replace(':', ';')
                    # Truncate to 120 chars max
                    clean_reasoning = clean_reasoning[:120]
                    final_results[video_id] = clean_reasoning

                # Count final results
                approved_count = sum(1 for r in final_results.values() if "✅ APPROVED" in r)
                rejected_count = sum(1 for r in final_results.values() if "❌ REJECTED" in r)
                skipped_count = sum(1 for r in final_results.values() if "⚠️ SKIPPED" in r)

                logger.success(
                    f"✅ [STAGE 2] Full analysis complete: "
                    f"{approved_count} approved, {rejected_count} rejected, {skipped_count} skipped"
                )

                # Log tokens used (for cost tracking)
                input_tokens = response.usage.input_tokens
                output_tokens = response.usage.output_tokens
                estimated_cost = (input_tokens / 1_000_000 * 3) + (output_tokens / 1_000_000 * 15)

                logger.info(
                    f"[STAGE 2] Tokens: {input_tokens:,} input + {output_tokens:,} output "
                    f"(~${estimated_cost:.4f})"
                )

                # Summary
                logger.success(
                    f"🎯 2-STAGE ANALYSIS COMPLETE: "
                    f"{approved_count} approved | {rejected_count} rejected | {skipped_count} skipped"
                )

                return final_results

            except json.JSONDecodeError as e:
                logger.error(f"❌ [STAGE 2] Failed to parse Claude JSON response: {e}")
                logger.error(f"Raw response was: {result}")
                # Return Stage 1 results if Stage 2 fails
                return final_results

        except Exception as e:
            logger.error(f"❌ Error in 2-stage analysis: {e}")
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
