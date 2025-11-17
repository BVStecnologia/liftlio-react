"""
Test Optimized 2-Stage Flow with PRE_FILTER_REJECT
Shows:
1. Stage 1 rejects some videos with PRE_FILTER_REJECT prefix
2. Transcripts fetched ONLY for approved videos
3. Final output shows clear rejection reasons
"""
import asyncio
from models import VideoData, ProjectData
from services.claude_service import get_claude_service

async def test():
    print("="*70)
    print("TESTE: Fluxo Otimizado de 2 Estágios")
    print("="*70)
    
    # Mock videos (sem transcrições ainda)
    videos = [
        VideoData(
            id="video1",
            title="How to Build AI Video Discovery Tools",
            description="Tutorial sobre como construir ferramentas de descoberta de vídeos com AI",
            channel_title="Tech Channel",
            published_at="2025-01-15",
            duration="PT10M30S",
            view_count=5000,
            like_count=200,
            comment_count=50,
            tags=["AI", "video", "discovery", "YouTube"],
            transcript=""  # SEM transcrição ainda
        ),
        VideoData(
            id="video2",
            title="Best Pasta Recipe Ever",
            description="Como fazer a melhor pasta italiana em casa",
            channel_title="Cooking Channel",
            published_at="2025-01-14",
            duration="PT8M15S",
            view_count=10000,
            like_count=500,
            comment_count=100,
            tags=["cooking", "pasta", "italian", "recipe"],
            transcript=""  # SEM transcrição ainda
        ),
        VideoData(
            id="video3",
            title="YouTube Comment Engagement Strategies for 2025",
            description="Estratégias para engajamento em comentários do YouTube",
            channel_title="Marketing Channel",
            published_at="2025-01-13",
            duration="PT15M20S",
            view_count=8000,
            like_count=300,
            comment_count=75,
            tags=["YouTube", "comments", "engagement", "marketing"],
            transcript=""  # SEM transcrição ainda
        ),
    ]
    
    # Mock project
    project = ProjectData(
        nome_produto="Liftlio",
        descricao_servico="Plataforma de descoberta de produtos através de comentários do YouTube. Ajuda empresas B2B a encontrar menções naturais de seus produtos em vídeos relevantes para fazer marketing direcionado."
    )
    
    print(f"\n📊 Videos para analisar: {len(videos)}")
    for v in videos:
        print(f"  - {v.id}: {v.title[:50]}...")
    
    print(f"\n📦 Produto: {project.nome_produto}")
    
    # STAGE 1: Pre-filter
    print("\n" + "="*70)
    print("STAGE 1: PRÉ-FILTRO (SEM TRANSCRIÇÕES)")
    print("="*70)
    
    claude = get_claude_service()
    stage1_results = await claude._pre_filter_stage(videos, project)
    
    print("\nResultados do Stage 1:")
    approved = []
    rejected = []
    for vid, decision in stage1_results.items():
        if decision == "PASS":
            approved.append(vid)
            print(f"  ✅ {vid}: PASS")
        else:
            rejected.append(vid)
            print(f"  ❌ {vid}: {decision}")
    
    print(f"\n📊 Stage 1 Summary:")
    print(f"  - Aprovados para Stage 2: {len(approved)}")
    print(f"  - Rejeitados: {len(rejected)}")
    print(f"  - Transcrições que serão buscadas: {len(approved)} (economia de {len(rejected)} fetches!)")
    
    # Simular busca de transcrições APENAS dos aprovados
    if approved:
        print("\n" + "="*70)
        print(f"BUSCANDO TRANSCRIÇÕES (APENAS {len(approved)} VÍDEOS APROVADOS)")
        print("="*70)
        
        for vid in approved:
            print(f"  📝 Fetching transcript for {vid}...")
        
        # Adicionar transcrições mockadas aos vídeos aprovados
        for video in videos:
            if video.id in approved:
                video.transcript = f"Mock transcript for {video.title}"
        
        # STAGE 2: Full analysis (apenas aprovados, COM transcrições)
        print("\n" + "="*70)
        print(f"STAGE 2: ANÁLISE COMPLETA ({len(approved)} VÍDEOS COM TRANSCRIÇÕES)")
        print("="*70)
        
        approved_videos = [v for v in videos if v.id in approved]
        stage2_results = await claude.semantic_analysis(approved_videos, project)
        
        print("\nResultados do Stage 2:")
        for vid, reasoning in stage2_results.items():
            print(f"  {reasoning[:100]}...")
    
    # RESULTADO FINAL
    print("\n" + "="*70)
    print("RESULTADO FINAL PARA O BANCO DE DADOS")
    print("="*70)
    
    final_results = {}
    
    # Add Stage 1 rejections
    for vid, decision in stage1_results.items():
        if decision != "PASS":
            # Remove PRE_FILTER_REJECT: prefix
            if decision.startswith("PRE_FILTER_REJECT:"):
                reject_reason = decision.replace("PRE_FILTER_REJECT: ", "")
            else:
                reject_reason = decision
            final_results[vid] = f"❌ REJECTED: {reject_reason}"
    
    # Add Stage 2 results
    if approved:
        final_results.update(stage2_results)
    
    for vid, result in final_results.items():
        print(f"  {vid}: {result}")
    
    print("\n" + "="*70)
    print("VANTAGENS DA OTIMIZAÇÃO:")
    print("="*70)
    print(f"  ✅ Transcrições economizadas: {len(rejected)}")
    print(f"  ✅ Tempo economizado: ~{len(rejected) * 2}s (estimado)")
    print(f"  ✅ Rejeitados no Stage 1 mostram claramente o motivo")
    print(f"  ✅ Formato final compatível com banco de dados")
    print("="*70)

asyncio.run(test())
