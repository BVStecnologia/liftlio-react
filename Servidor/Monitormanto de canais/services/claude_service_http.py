"""
Claude Service HTTP
Handles semantic analysis using Claude via HTTP API (no Anthropic SDK required)
Uses the claude-code-api container at port 10200
"""

from typing import List, Dict
import json
import httpx
from loguru import logger

from config import get_settings
from models import VideoData, ProjectData


# ============================================
# STAGE 1: Pre-filter Prompt (no transcript)
# ============================================
STAGE1_PROMPT_TEMPLATE = """TAREFA: Pré-filtro rápido - Identificar se vídeo é direcionado a SELLERS (pessoas que vendem algo).

🎯 CRITÉRIO CENTRAL:
O vídeo é para pessoas/empresas que VENDEM produtos ou serviços?

BUYERS VÁLIDOS (APROVAR):
✅ E-commerce/Dropshipping: Vendem produtos físicos
✅ SaaS Founders: Vendem software/apps
✅ Service Providers: Vendem serviços (agências, consultoria, freelance)
✅ Coaches/Creators: Vendem cursos, produtos digitais, mentorias
✅ Local Businesses: Vendem produtos/serviços locais
✅ B2B/B2C Companies: Qualquer negócio vendendo algo

NÃO-BUYERS (REJEITAR):
❌ Content Creators: Fazem vídeos (não vendem produtos)
❌ Paid Ads Specialists: Fazem anúncios (skill técnica)
❌ Consumers/Hobbyists: Consomem conteúdo
❌ Tutorial/How-to (sem venda): Ensinam mas não vendem
❌ Entertainment: Entretenimento puro

⚡ ECONOMIA DE CUSTOS:
- Rejeitar NON-SELLERS economiza ~40% (evita processar transcrições desnecessárias)
- Na dúvida sobre SE VENDE algo → REJEITE (melhor falso negativo que falso positivo aqui)
- Se vídeo é para quem VENDE → APROVAR (Stage 2 valida relevância)

RESPOSTA OBRIGATÓRIA (JSON):
Retorne um objeto JSON onde cada chave é o video_id e o valor é:
- "PASS" se vídeo é para SELLERS (mesmo que nicho diferente)
- "PRE_FILTER_REJECT: [motivo breve, max 80 chars]" se vídeo NÃO é para sellers

Exemplo:
{{
  "abc123": "PASS",
  "xyz789": "PRE_FILTER_REJECT: Vídeo para content creators; não vendem produtos",
  "def456": "PASS"
}}

ATENÇÃO: Use EXATAMENTE o prefixo "PRE_FILTER_REJECT:" (não use "REJECT:")

Nome do produto ou serviço: {nome_produto}

Descrição do produto ou serviço: {descricao_servico}"""


# ============================================
# STAGE 2: Full Analysis Prompt (with transcript)
# ============================================
STAGE2_PROMPT_TEMPLATE = """TAREFA: Análise em 2 CAMADAS - Determinar se vídeos são relevantes para ferramenta de discovery.

═══════════════════════════════════════════════════════════
CAMADA 1: BUYER QUALIFICATION (Eliminatória)
═══════════════════════════════════════════════════════════

Responda SIM ou NÃO para CADA pergunta:

1️⃣ VIEWER VENDE ALGO?
   ✅ SIM: Produto físico, digital, SaaS, serviço, curso, consultoria
   ❌ NÃO: Apenas consome, é hobbysta, employee sem decision making

2️⃣ VIEWER PRECISA DE CLIENTES/DESCOBERTA?
   ✅ SIM: Busca growth, acquisition, leads, visibilidade, conversions
   ❌ NÃO: Apenas skill técnica, entretenimento, educação não-business
   ❌ NÃO: Apenas skill técnica SEM negócio próprio (ex: video editor employee)
           **IMPORTANTE**: E-commerce/Dropshipping/Shopify sellers SEMPRE = SIM
           (product research/sourcing É PARTE do processo de selling)

3️⃣ PRODUTO RESOLVE PROBLEMA DO VIEWER?
   ✅ SIM: Discovery orgânica ajuda a conseguir clientes/leads
   ❌ NÃO: Problema é técnico (ex: edição, design, operações)

DECISÃO CAMADA 1:
- SE QUALQUER "NÃO" → ❌ REJECTED (score 0.2)
- SE TODAS "SIM" → Prosseguir para CAMADA 2

═══════════════════════════════════════════════════════════
CAMADA 2: RELEVANCE SCORING (0-100 pontos)
═══════════════════════════════════════════════════════════

A. AUDIENCE OVERLAP (0-40 pontos)
   - Mesmo tipo de negócio (B2B, B2C, D2C, SaaS, Physical)? 0-15 pts
   - Mesmo stage (Startup, Scaling, Established)? 0-10 pts
   - Budget similar (Bootstrap, Funded, Enterprise)? 0-15 pts

B. PROBLEM OVERLAP (0-40 pontos)
   - Menciona dificuldade de conseguir clientes/leads? 0-20 pts
   - Discute canais de acquisition ou marketing? 0-10 pts
   - Frustra com CAC alto ou dependência de paid ads? 0-10 pts

C. NATURAL FIT (0-20 pontos)
   - Recomendar produto seria útil (não spam)? 0-15 pts
   - Viewer conhece conceito de organic discovery? 0-5 pts

PONTUAÇÃO TOTAL: A + B + C (0-100)

CONVERSÃO DE SCORE:
- 70-100 pontos: ✅ APPROVED (score 0.80-1.0, strong fit)
- 50-69 pontos:  ✅ APPROVED (score 0.60-0.79, moderate fit)
- 30-49 pontos:  ❌ REJECTED (score 0.35-0.59, weak fit)
- 0-29 pontos:   ❌ REJECTED (score 0.0-0.34, no fit)

═══════════════════════════════════════════════════════════
FORMATO DE RESPOSTA JSON:
═══════════════════════════════════════════════════════════

Para cada vídeo, retorne justificativa formatada:

{{
  "video_id": "✅ APPROVED: [motivo PT-BR, max 120 chars]"
}}

OU

{{
  "video_id": "❌ REJECTED: [motivo PT-BR, max 120 chars]"
}}

EXEMPLOS:

✅ APPROVED (Camada 2 passou):
"✅ APPROVED: E-commerce owner buscando clientes; Liftlio oferece discovery orgânico; fit natural; score 78"

❌ REJECTED (Camada 1 falhou):
"❌ REJECTED: Viewer é content creator; não vende produto; não precisa customer acquisition"

❌ REJECTED (Camada 2 - score baixo):
"❌ REJECTED: Viewer vende mas foco em sales tactics (não acquisition); score 35; fit insuficiente"

═══════════════════════════════════════════════════════════

Nome do produto ou serviço: {nome_produto}

Descrição do produto ou serviço: {descricao_servico}

IMPORTANTE:
- Se NENHUM vídeo qualificado: retorne {{"result": "NOT"}}
- Justificativas em PT-BR, objetivas, claras
- Use ponto-e-vírgula (;) ao invés de vírgulas
- Máximo 120 caracteres por justificativa
- Retorne APENAS o JSON, sem markdown
- Use EXATAMENTE os prefixos: ✅ APPROVED, ❌ REJECTED, ⚠️ SKIPPED"""


# ============================================
# API Configuration
# ============================================
import os
# Container name for Docker-to-Docker communication, fallback to external IP
CLAUDE_API_URL = os.environ.get("CLAUDE_API_URL", "http://liftlio-claude-api:10100")
STAGE1_MODEL = "haiku"   # Fast/cheap for pre-filter
STAGE2_MODEL = "opus"    # Most capable for full analysis


class ClaudeServiceHTTP:
    """Service for Claude AI semantic analysis via HTTP API (no SDK required)"""

    def __init__(self):
        """Initialize HTTP client"""
        settings = get_settings()
        self.api_url = CLAUDE_API_URL
        self.stage1_model = STAGE1_MODEL
        self.stage2_model = STAGE2_MODEL
        logger.info(f"✅ Claude HTTP client initialized")
        logger.info(f"   API URL: {self.api_url}")
        logger.info(f"   Stage 1 model: {self.stage1_model}")
        logger.info(f"   Stage 2 model: {self.stage2_model}")

    async def _call_claude(
        self,
        prompt: str,
        model: str = "haiku",
        max_turns: int = 1,
        timeout: float = 120.0
    ) -> str:
        """
        Call Claude API via HTTP

        Args:
            prompt: The prompt to send (system + user combined)
            model: Model to use (haiku, sonnet, opus)
            max_turns: Maximum conversation turns
            timeout: Request timeout in seconds

        Returns:
            Response text from Claude

        Raises:
            Exception: If API call fails
        """
        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                response = await client.post(
                    f"{self.api_url}/chat",
                    json={
                        "message": prompt,
                        "model": model,
                        "maxTurns": max_turns
                    }
                )
                response.raise_for_status()

                data = response.json()

                if not data.get("success"):
                    raise Exception(f"API returned error: {data.get('error', 'Unknown error')}")

                return data.get("response", "")

            except httpx.HTTPError as e:
                logger.error(f"HTTP error calling Claude API: {e}")
                raise
            except Exception as e:
                logger.error(f"Error calling Claude API: {e}")
                raise

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

            # Combine prompts for HTTP API (Claude Code format)
            full_prompt = f"""TASK: Video Pre-filter Analysis. Return ONLY JSON object, nothing else.

{system_prompt}

{user_prompt}

OUTPUT: Return ONLY the JSON object with video decisions. No markdown, no explanation, just the JSON."""

            # Call Claude API via HTTP
            logger.debug(f"Sending Stage 1 request to Claude API ({self.stage1_model})...")
            result = await self._call_claude(
                prompt=full_prompt,
                model=self.stage1_model,
                max_turns=1,
                timeout=120.0
            )

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

        STAGE 1: Pre-filter based on metadata only (fast, cheap) - Uses HAIKU
        STAGE 2: Full analysis with transcript (only for approved videos) - Uses OPUS

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
            # STAGE 1: Pre-filter (metadata only) - HAIKU
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
            # STAGE 2: Full analysis (WITH transcript) - OPUS
            # ============================================
            logger.info(f"🔍 [STAGE 2] Analyzing {len(approved_videos)} videos with full context (model: {self.stage2_model})...")

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

            # Combine prompts for HTTP API (Claude Code format)
            full_prompt = f"""TASK: Video Relevance Analysis. Return ONLY JSON object, nothing else.

{system_prompt}

{user_prompt}

OUTPUT: Return ONLY the JSON object with video analysis results. No markdown, no explanation, just the JSON."""

            # Call Claude API via HTTP (using OPUS for Stage 2)
            logger.debug(f"Sending Stage 2 request to Claude API ({self.stage2_model})...")
            result = await self._call_claude(
                prompt=full_prompt,
                model=self.stage2_model,
                max_turns=1,
                timeout=180.0  # Longer timeout for Opus
            )

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
_claude_service: ClaudeServiceHTTP | None = None


def get_claude_service() -> ClaudeServiceHTTP:
    """Get Claude service singleton"""
    global _claude_service
    if _claude_service is None:
        _claude_service = ClaudeServiceHTTP()
    return _claude_service
