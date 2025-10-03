-- =============================================
-- Função: analyze_video_with_claude
-- Descrição: Analisa vídeo com Claude AI
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.analyze_video_with_claude(text);

CREATE OR REPLACE FUNCTION public.analyze_video_with_claude(p_video_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_video_data JSONB;
    v_claude_response TEXT;
    v_prompt TEXT;
    v_transcription TEXT;
BEGIN
    -- Log input
    RAISE NOTICE 'Starting analysis for video ID: %', p_video_id;

    -- Get video data
    SELECT get_video_data_for_analysis INTO v_video_data
    FROM get_video_data_for_analysis(p_video_id);

    -- Log video data
    RAISE NOTICE 'Video data received: %',
        CASE
            WHEN v_video_data IS NULL THEN 'NULL'
            ELSE 'Data found - Title: ' || (v_video_data->>'video_title')
        END;

    -- Get transcription (simplificada)
    SELECT regexp_replace(
            regexp_replace(
                trancription,
                E'[\\n\\r\\t]+',
                ' ',
                'g'
            ),
            '[^\\x20-\\x7E]',
            '',
            'g'
        )
    INTO v_transcription
    FROM "Videos" v
    LEFT JOIN "Videos_trancricao" vt ON v.transcript = vt.id
    WHERE v."VIDEO" = p_video_id;

    -- Log transcription
    RAISE NOTICE 'Transcription found: %',
        CASE
            WHEN v_transcription IS NULL THEN 'NULL'
            WHEN v_transcription = '' THEN 'EMPTY'
            ELSE 'YES - Length: ' || length(v_transcription)::text || ' chars'
        END;

    -- Prepare prompt for Claude
    v_prompt := format(
        'Analyze this video: Title "%s". Description "%s". Transcription "%s". Project "%s". The video has %s comments. Evaluate relevance to project. Respond in JSON format as specified.',
        replace(COALESCE(v_video_data->>'video_title', ''), '"', ''''),
        replace(regexp_replace(left(COALESCE(v_video_data->>'video_description', ''), 1000), E'[\\n\\r\\t]+', ' ', 'g'), '"', ''''),
        replace(COALESCE(v_transcription, ''), '"', ''''),
        replace(COALESCE(v_video_data->>'project_description', ''), '"', ''''),
        COALESCE(jsonb_array_length(v_video_data->'comment_data'), 0)
    );

    -- Log prompt
    RAISE NOTICE 'Prompt created with length: %', length(v_prompt);
    RAISE NOTICE 'Prompt preview: %', left(v_prompt, 200);

    -- Call Claude for analysis
    SELECT claude_complete(
        v_prompt,
        'Analyze the YouTube video considering the title, description, transcription, and the project description. STOP. TAKE A DEEP BREATH... NOW PAY CLOSE ATTENTION: Your primary task is to determine how well this video aligns with the project description. The project description is the most crucial factor in your analysis. Evaluate the video relevance STRICTLY based on its connection to the project description. If there is little to no connection, the video should be marked as irrelevant with a low relevance score. Provide the analysis in the following JSON format:

{
  "is_relevant": boolean,
  "relevance_score": float between 0 and 1,
  "relevance_reason": "Detailed explanation of why the video is or is not relevant to the project description",
  "content_category": "Category of the content in relation to the project",
  "sentiment_analysis": {
    "video": "Sentiment of the video content in context of the project",
    "comments": "Overall sentiment of the comments in relation to the project goals"
  },
  "key_topics": [
    "List",
    "of",
    "key",
    "topics",
    "that",
    "align",
    "with",
    "project",
    "description"
  ],
  "engagement_potential": "Low/Medium/High based on relevance to project",
  "target_audience": "Description of the target audience in context of the project",
  "lead_potential": "Low/Medium/High based on alignment with project goals",
  "recommended_actions": [
    "List",
    "of",
    "recommended",
    "actions",
    "considering",
    "project",
    "relevance"
  ],
  "ai_analysis_summary": "Brief summary focusing on video relevance to the project",
  "trending_score": float between 0 and 1,
  "evergreen_potential": boolean
}

Ensure to escape single quotes within strings. Do not include any line breaks or extra spaces in the JSON. REMEMBER: The project description is your primary reference point. If the video does not align closely with it, rate it as irrelevant with a low score. Be critical and strict in your assessment.
Respond with only the requested JSON, without any additional text.',
        4000,
        0.7
    ) INTO v_claude_response;

    -- Log response
    RAISE NOTICE 'Claude response received with length: %',
        CASE
            WHEN v_claude_response IS NULL THEN 'NULL'
            ELSE length(v_claude_response)::text
        END;

    -- Return the response as JSONB
    RETURN v_claude_response::JSONB;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error: % %', SQLERRM, SQLSTATE;
        RETURN NULL;
END;
$function$;