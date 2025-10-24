"""
Quick test script for justifications feature
Tests the new format: "video_id:✅ APPROVED - reasoning"
"""

import asyncio
import sys
from loguru import logger

# Configure logger
logger.remove()
logger.add(sys.stderr, level="INFO")

from core.qualifier import get_video_qualifier


async def test_qualification():
    """Test qualification with scanner ID 1118 (Adam Erhart channel)"""

    logger.info("=" * 60)
    logger.info("🧪 TESTING JUSTIFICATIONS FEATURE")
    logger.info("=" * 60)

    qualifier = get_video_qualifier()

    # Test with scanner 1118 from project 117
    scanner_id = 1118

    logger.info(f"\n📋 Testing with scanner ID: {scanner_id}")
    logger.info("Expected: JSON with ✅ APPROVED, ❌ REJECTED, ⚠️ SKIPPED\n")

    try:
        result = await qualifier.process(scanner_id)

        logger.info("\n" + "=" * 60)
        logger.info("📊 RESULTS:")
        logger.info("=" * 60)

        logger.info(f"✅ Success: {result.success}")
        logger.info(f"📹 Total analyzed: {result.total_analyzed}")
        logger.info(f"✅ Qualified (approved only): {len(result.qualified_video_ids)}")
        logger.info(f"⏱️  Execution time: {result.execution_time_seconds:.2f}s")

        if result.warnings:
            logger.warning(f"\n⚠️  Warnings: {len(result.warnings)}")
            for warning in result.warnings:
                logger.warning(f"  - {warning}")

        logger.info("\n" + "=" * 60)
        logger.info("📝 FORMATTED OUTPUT (with justifications):")
        logger.info("=" * 60)
        logger.info(f"\n{result.qualified_video_ids_csv}\n")

        # Parse and display nicely
        if result.qualified_video_ids_csv:
            logger.info("📋 Parsed entries:")
            entries = result.qualified_video_ids_csv.split(',')
            for i, entry in enumerate(entries, 1):
                if ':' in entry:
                    vid, reason = entry.split(':', 1)

                    # Color based on status
                    if "✅ APPROVED" in reason:
                        color = "green"
                    elif "❌ REJECTED" in reason:
                        color = "red"
                    elif "⚠️ SKIPPED" in reason:
                        color = "yellow"
                    else:
                        color = "white"

                    logger.opt(colors=True).info(
                        f"  <{color}>{i}. {vid}</{color}>: {reason}"
                    )
                else:
                    logger.info(f"  {i}. {entry} (old format, no reasoning)")

        logger.info("\n" + "=" * 60)
        logger.success("✅ TEST COMPLETED SUCCESSFULLY!")
        logger.info("=" * 60)

        return result

    except Exception as e:
        logger.error(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    logger.info("\n🚀 Starting test...")
    result = asyncio.run(test_qualification())

    if result and result.success:
        logger.success("\n🎉 All tests passed! Ready for VPS deployment.")
        sys.exit(0)
    else:
        logger.error("\n❌ Tests failed. Fix issues before deploying.")
        sys.exit(1)
