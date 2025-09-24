CREATE OR REPLACE FUNCTION public.generate_claude_prompt(v_video_data jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_prompt TEXT;
BEGIN
    v_prompt := 'Analyze the YouTube video with the following details:

Video ID: "' || v_video_data->>'video_id' || '"
Title: "' || v_video_data->>'video_title' || '"
Description: "' || v_video_data->>'video_description' || '"
Project Description: "' || v_video_data->>'project_description' || '"

Provide your analysis in the following JSON format, without any additional text or line breaks:

{
  "is_relevant": true,
  "relevance_score": 0.85,
  "relevance_reason": "The video discusses methods to bypass AI detection in written content, which is directly relevant to the project''s goal of generating articles that pass AI detectors.",
  "content_category": "AI detection evasion / Academic cheating",
  "sentiment_analysis": {
    "video": "Neutral",
    "comments": "Mixed"
  },
  "key_topics": [
    "AI detection",
    "Turnitin",
    "Plagiarism",
    "ChatGPT",
    "Anti-detection tools"
  ],
  "engagement_potential": "High",
  "target_audience": "Students and individuals looking to bypass AI detection in written content",
  "lead_potential": "High",
  "recommended_actions": [
    "Research ethical implications",
    "Explore legal alternatives",
    "Develop AI detection education"
  ],
  "ai_analysis_summary": "The video presents methods to evade AI detection in written content, sparking debate on academic integrity and AI use. Comments reveal mixed sentiments, with some users seeking ways to bypass detection and others expressing ethical concerns.",
  "trending_score": 0.7,
  "evergreen_potential": true
}';

    RETURN v_prompt;
END;
$function$