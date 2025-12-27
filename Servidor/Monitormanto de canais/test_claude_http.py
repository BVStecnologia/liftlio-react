#!/usr/bin/env python3
"""
Test script for Claude HTTP Service
Tests both Stage 1 (haiku) and Stage 2 (opus) calls
"""

import asyncio
import httpx
import json
from datetime import datetime

# API Configuration
CLAUDE_API_URL = "http://173.249.22.2:10200"

async def call_claude(prompt: str, model: str = "haiku", timeout: float = 120.0) -> dict:
    """Call Claude API via HTTP"""
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            f"{CLAUDE_API_URL}/chat",
            json={
                "message": prompt,
                "model": model,
                "maxTurns": 1
            }
        )
        response.raise_for_status()
        return response.json()


async def test_stage1_prefilter():
    """Test Stage 1 pre-filter with haiku model"""
    print("\n" + "="*60)
    print("TEST 1: Stage 1 Pre-filter (HAIKU)")
    print("="*60)

    prompt = """SYSTEM INSTRUCTIONS:
TAREFA: Pré-filtro rápido - Identificar se vídeo é direcionado a SELLERS.

🎯 CRITÉRIO: O vídeo é para pessoas que VENDEM produtos ou serviços?
✅ APROVAR: E-commerce, SaaS, serviços, coaches, produtos digitais
❌ REJEITAR: Content creators, consumers, entertainment

RESPONDA com JSON: {"video_id": "PASS"} ou {"video_id": "PRE_FILTER_REJECT: motivo"}

Nome do produto: Liftlio - Video Monitoring Tool
Descrição: Ferramenta SaaS que ajuda empresas a encontrar leads orgânicos em comentários do YouTube

USER REQUEST:
VÍDEOS PARA PRÉ-FILTRO:

ID: test_video_001
Título: Como Vender Mais no Dropshipping em 2025
Descrição: Estratégias avançadas para aumentar suas vendas no dropshipping...
Canal: Ecommerce Brasil
Views: 45,000 | Likes: 2,100 | Comments: 320
Tags: dropshipping, ecommerce, vendas

---

ID: test_video_002
Título: Melhores Jogos de 2025 - TOP 10
Descrição: Os jogos mais aguardados do ano para PC e Console...
Canal: Games Master
Views: 120,000 | Likes: 8,500 | Comments: 950
Tags: games, jogos, entretenimento

Responda APENAS com JSON:"""

    start = datetime.now()
    result = await call_claude(prompt, model="haiku", timeout=120.0)
    duration = (datetime.now() - start).total_seconds()

    print(f"\n✅ Response received in {duration:.1f}s")
    print(f"   Success: {result.get('success')}")
    print(f"   Model: haiku")

    response_text = result.get('response', '')
    print(f"\n📝 Raw response:\n{response_text[:500]}...")

    # Try to parse JSON
    try:
        # Clean markdown if present
        clean = response_text
        if "```" in clean:
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
            clean = clean.strip()

        parsed = json.loads(clean)
        print(f"\n✅ JSON parsed successfully:")
        for vid, decision in parsed.items():
            status = "PASS" if decision == "PASS" else "REJECT"
            print(f"   {vid}: {status}")
    except json.JSONDecodeError as e:
        print(f"\n❌ Failed to parse JSON: {e}")

    return result


async def test_stage2_analysis():
    """Test Stage 2 full analysis with opus model"""
    print("\n" + "="*60)
    print("TEST 2: Stage 2 Full Analysis (OPUS)")
    print("="*60)

    prompt = """SYSTEM INSTRUCTIONS:
TAREFA: Análise de relevância para ferramenta de discovery de leads.

CRITÉRIOS:
1. Viewer VENDE algo? (produto, serviço, SaaS)
2. Viewer precisa de CLIENTES/discovery?
3. Liftlio resolve o problema do viewer?

PONTUAÇÃO (0-100):
- 70-100: ✅ APPROVED (strong fit)
- 50-69: ✅ APPROVED (moderate fit)
- 0-49: ❌ REJECTED (weak fit)

Nome do produto: Liftlio - Video Monitoring Tool
Descrição: Ferramenta SaaS que ajuda empresas a encontrar leads orgânicos monitorando comentários do YouTube

USER REQUEST:
VÍDEO PARA ANÁLISE:

ID: dropship_2025
Título: Como Vender Mais no Dropshipping em 2025
Descrição: Estratégias avançadas para aumentar suas vendas no dropshipping usando marketing orgânico e técnicas de discovery de clientes...
Canal: Ecommerce Brasil
Views: 45,000 | Likes: 2,100 | Comments: 320
Tags: dropshipping, ecommerce, vendas, leads
Transcrição: Olá pessoal, hoje vou mostrar como encontrar clientes de forma orgânica para sua loja de dropshipping. Muitos empreendedores gastam fortunas em ads mas existe uma forma mais inteligente de conseguir leads qualificados. Vamos falar sobre monitoramento de redes sociais e YouTube para identificar pessoas interessadas nos seus produtos...

Responda com JSON: {"video_id": "✅ APPROVED: motivo"} ou {"video_id": "❌ REJECTED: motivo"}"""

    start = datetime.now()
    result = await call_claude(prompt, model="opus", timeout=180.0)
    duration = (datetime.now() - start).total_seconds()

    print(f"\n✅ Response received in {duration:.1f}s")
    print(f"   Success: {result.get('success')}")
    print(f"   Model: opus")

    response_text = result.get('response', '')
    print(f"\n📝 Raw response:\n{response_text[:500]}...")

    # Try to parse JSON
    try:
        clean = response_text
        if "```" in clean:
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
            clean = clean.strip()

        parsed = json.loads(clean)
        print(f"\n✅ JSON parsed successfully:")
        for vid, decision in parsed.items():
            print(f"   {vid}: {decision[:80]}...")
    except json.JSONDecodeError as e:
        print(f"\n❌ Failed to parse JSON: {e}")

    return result


async def test_health_check():
    """Test API health"""
    print("\n" + "="*60)
    print("TEST 0: Health Check")
    print("="*60)

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"{CLAUDE_API_URL}/health")
        data = response.json()

        print(f"\n✅ API Status: {data.get('status')}")
        print(f"   Version: {data.get('version')}")
        print(f"   Type: {data.get('type')}")
        print(f"   Uptime: {data.get('uptime', 0):.1f}s")

        return data


async def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("CLAUDE HTTP SERVICE - INTEGRATION TESTS")
    print("="*60)
    print(f"API URL: {CLAUDE_API_URL}")
    print(f"Time: {datetime.now().isoformat()}")

    try:
        # Test 0: Health check
        await test_health_check()

        # Test 1: Stage 1 with haiku
        await test_stage1_prefilter()

        # Test 2: Stage 2 with opus
        await test_stage2_analysis()

        print("\n" + "="*60)
        print("✅ ALL TESTS COMPLETED SUCCESSFULLY")
        print("="*60)

    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
