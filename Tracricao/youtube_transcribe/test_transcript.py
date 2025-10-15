#!/usr/bin/env python3
import sys
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import NoTranscriptFound, TranscriptsDisabled

def test_video(video_id):
    print(f"\n=== Testing video: {video_id} ===")
    
    try:
        # List available transcripts
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        available_languages = [t.language_code for t in transcript_list]
        print(f"Available languages: {available_languages}")
        
        # Try to get transcript
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['pt', 'en'])
        print(f"✓ Transcript found! Length: {len(transcript)} segments")
        print(f"First segment: {transcript[0] if transcript else 'No segments'}")
        
    except NoTranscriptFound:
        print("✗ No transcript found for this video")
    except TranscriptsDisabled:
        print("✗ Transcripts are disabled for this video")
    except Exception as e:
        print(f"✗ Error: {type(e).__name__}: {str(e)}")

if __name__ == "__main__":
    # Test with the provided video ID
    test_video("Dn0PrsM_yJU")
    
    # Test with a known working video
    test_video("dQw4w9WgXcQ")  # Rick Astley - Never Gonna Give You Up