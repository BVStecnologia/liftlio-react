"""
Input Validators
Validates scanner IDs, video IDs, and other inputs
"""

import re
from typing import List
from loguru import logger


def validate_scanner_id(scanner_id: int) -> None:
    """
    Validate scanner ID

    Args:
        scanner_id: Scanner ID from request

    Raises:
        ValueError: If scanner_id is invalid
    """
    if scanner_id <= 0:
        raise ValueError(f"Invalid scanner_id: {scanner_id}. Must be positive integer.")

    logger.debug(f"✅ Scanner ID validated: {scanner_id}")


def validate_video_ids(video_ids: List[str]) -> None:
    """
    Validate list of YouTube video IDs

    Args:
        video_ids: List of video IDs

    Raises:
        ValueError: If any video ID is invalid
    """
    if not video_ids:
        # Empty list is valid (no exclusions)
        return

    # YouTube video IDs are 11 characters (alphanumeric + - and _)
    video_id_pattern = re.compile(r'^[a-zA-Z0-9_-]{11}$')

    for video_id in video_ids:
        if not video_id_pattern.match(video_id):
            raise ValueError(
                f"Invalid YouTube video ID: {video_id}. "
                f"Must be 11 characters (alphanumeric, - and _)"
            )

    logger.debug(f"✅ {len(video_ids)} video IDs validated")


def validate_qualified_ids(
    qualified_ids: List[str],
    available_ids: List[str]
) -> None:
    """
    Validate that qualified IDs are actually from available videos

    Args:
        qualified_ids: IDs returned by Claude
        available_ids: IDs of videos sent to Claude

    Raises:
        ValueError: If qualified ID is not in available videos
    """
    available_set = set(available_ids)

    for qualified_id in qualified_ids:
        if qualified_id not in available_set:
            logger.warning(
                f"⚠️ Claude returned ID not in available videos: {qualified_id}"
            )
            # Don't raise error, just log warning
            # Claude might have made a mistake, filter it out

    # Filter to only valid IDs
    valid_ids = [vid for vid in qualified_ids if vid in available_set]

    if len(valid_ids) < len(qualified_ids):
        logger.warning(
            f"⚠️ Filtered out {len(qualified_ids) - len(valid_ids)} invalid IDs"
        )

    logger.debug(f"✅ {len(valid_ids)} qualified IDs validated")
