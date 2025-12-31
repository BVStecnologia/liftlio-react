// =============================================
// Blog AI Assistant Edge Function
// Created: 2025-12-28
// Description: AI-powered blog content assistance
// =============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Types
interface GenerateOutlineRequest {
  action: 'generate-outline';
  topic: string;
  targetKeyword?: string;
  tone?: 'professional' | 'casual' | 'educational' | 'technical';
  targetLength?: 'short' | 'medium' | 'long';
}

interface GenerateTitleRequest {
  action: 'generate-titles';
  topic: string;
  count?: number;
}

interface ImproveContentRequest {
  action: 'improve-content';
  content: string;
  improvementType: 'grammar' | 'seo' | 'readability' | 'engagement' | 'all';
}

interface GenerateSEORequest {
  action: 'generate-seo';
  title: string;
  content: string;
  targetKeyword?: string;
}

interface ExpandSectionRequest {
  action: 'expand-section';
  heading: string;
  context?: string;
  targetWords?: number;
}

interface GenerateExcerptRequest {
  action: 'generate-excerpt';
  content: string;
  maxLength?: number;
}

interface AnalyzeSEORequest {
  action: 'analyze-seo';
  title: string;
  content: string;
  metaDescription?: string;
  focusKeyword?: string;
}

type AIRequest =
  | GenerateOutlineRequest
  | GenerateTitleRequest
  | ImproveContentRequest
  | GenerateSEORequest
  | ExpandSectionRequest
  | GenerateExcerptRequest
  | AnalyzeSEORequest;

// Claude API call helper
async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = Deno.env.get('CLAUDE_API_KEY');
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage }
      ]
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// Generate blog outline
async function generateOutline(req: GenerateOutlineRequest) {
  const systemPrompt = `You are an expert blog content strategist and SEO specialist. Your task is to create comprehensive, well-structured blog post outlines that will rank well on Google and engage readers.

Guidelines:
- Create detailed outlines with H2 and H3 headings
- Include key points for each section
- Suggest a compelling hook for the introduction
- Recommend internal/external linking opportunities
- Estimate word count per section
- Focus on the target keyword naturally throughout

Output format: JSON with structure:
{
  "suggestedTitle": "string",
  "hook": "string",
  "sections": [
    {
      "heading": "string",
      "level": 2 | 3,
      "keyPoints": ["string"],
      "estimatedWords": number,
      "linkingSuggestions": ["string"]
    }
  ],
  "estimatedTotalWords": number,
  "suggestedTags": ["string"],
  "internalLinkingTopics": ["string"]
}`;

  const lengthGuide = {
    short: '800-1200 words',
    medium: '1500-2500 words',
    long: '3000-5000 words'
  };

  const userMessage = `Create a comprehensive blog post outline about: "${req.topic}"
${req.targetKeyword ? `Target SEO keyword: "${req.targetKeyword}"` : ''}
Tone: ${req.tone || 'professional'}
Target length: ${lengthGuide[req.targetLength || 'medium']}

Provide the outline in JSON format.`;

  const result = await callClaude(systemPrompt, userMessage);

  // Extract JSON from response
  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return { rawResponse: result };
}

// Generate title suggestions
async function generateTitles(req: GenerateTitleRequest) {
  const systemPrompt = `You are an expert copywriter specializing in blog titles that drive clicks and rank well on Google.

Guidelines for titles:
- Include power words that trigger emotion
- Use numbers when appropriate (listicles perform well)
- Keep titles under 60 characters when possible
- Include the target topic naturally
- Mix different title formats (How-to, Questions, Lists, etc.)
- Optimize for both SEO and CTR

Output format: JSON array of title objects:
[
  {
    "title": "string",
    "format": "how-to" | "listicle" | "question" | "guide" | "comparison" | "story",
    "estimatedCTR": "high" | "medium" | "low",
    "seoScore": number (1-10),
    "emotionalTrigger": "string"
  }
]`;

  const userMessage = `Generate ${req.count || 10} compelling blog title variations for the topic: "${req.topic}"

Provide a mix of different formats and styles. Return as JSON.`;

  const result = await callClaude(systemPrompt, userMessage);

  const jsonMatch = result.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return { rawResponse: result };
}

// Improve existing content
async function improveContent(req: ImproveContentRequest) {
  const improvementPrompts = {
    grammar: 'Fix any grammar, spelling, or punctuation errors. Improve sentence structure and clarity.',
    seo: 'Optimize the content for SEO by improving keyword usage, adding relevant terms, and enhancing readability for search engines.',
    readability: 'Improve readability by breaking up long paragraphs, using simpler language where appropriate, and improving flow.',
    engagement: 'Make the content more engaging by adding hooks, questions, and calls to action. Improve the emotional connection with readers.',
    all: 'Comprehensively improve the content for grammar, SEO, readability, and engagement.'
  };

  const systemPrompt = `You are an expert content editor and SEO specialist. Your task is to improve blog content while maintaining the author's voice.

Guidelines:
- Preserve the original meaning and intent
- Make improvements subtle but impactful
- Explain major changes you make
- Output both the improved content and a list of changes

Output format: JSON with structure:
{
  "improvedContent": "string (Markdown formatted)",
  "changes": [
    {
      "type": "grammar" | "seo" | "readability" | "engagement",
      "original": "string",
      "improved": "string",
      "reason": "string"
    }
  ],
  "overallScore": {
    "before": number (1-100),
    "after": number (1-100)
  }
}`;

  const userMessage = `${improvementPrompts[req.improvementType]}

Content to improve:
"""
${req.content}
"""

Provide the improved content and changes in JSON format.`;

  const result = await callClaude(systemPrompt, userMessage);

  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return { rawResponse: result };
}

// Generate SEO metadata
async function generateSEO(req: GenerateSEORequest) {
  const systemPrompt = `You are an SEO expert specializing in blog post optimization. Your task is to generate optimized meta tags and SEO recommendations.

Guidelines:
- Meta title: 50-60 characters, include primary keyword
- Meta description: 150-160 characters, compelling with CTA
- Focus on natural keyword integration
- Suggest secondary keywords
- Provide Schema.org recommendations

Output format: JSON with structure:
{
  "metaTitle": "string",
  "metaDescription": "string",
  "focusKeyword": "string",
  "secondaryKeywords": ["string"],
  "slug": "string",
  "ogTitle": "string",
  "ogDescription": "string",
  "schemaRecommendations": {
    "type": "BlogPosting" | "Article" | "HowTo" | "FAQ",
    "additionalProperties": {}
  },
  "keywordDensity": {
    "current": number,
    "recommended": number
  }
}`;

  const userMessage = `Generate SEO metadata for this blog post:

Title: "${req.title}"
${req.targetKeyword ? `Target keyword: "${req.targetKeyword}"` : ''}

Content preview (first 1000 chars):
"""
${req.content.substring(0, 1000)}...
"""

Provide SEO recommendations in JSON format.`;

  const result = await callClaude(systemPrompt, userMessage);

  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return { rawResponse: result };
}

// Expand a section
async function expandSection(req: ExpandSectionRequest) {
  const systemPrompt = `You are an expert blog writer who creates engaging, informative content. Your task is to expand on a section heading with detailed, valuable content.

Guidelines:
- Write in a conversational yet professional tone
- Include practical examples and actionable tips
- Use subheadings (H3) where appropriate
- Add bullet points for lists
- Include relevant statistics or facts when helpful
- Maintain natural keyword integration

Output format: Markdown text for the section.`;

  const userMessage = `Write approximately ${req.targetWords || 300} words expanding on this section heading: "${req.heading}"

${req.context ? `Context from the article: "${req.context}"` : ''}

Provide the content in Markdown format.`;

  const result = await callClaude(systemPrompt, userMessage);
  return { content: result };
}

// Generate excerpt
async function generateExcerpt(req: GenerateExcerptRequest) {
  const systemPrompt = `You are an expert at creating compelling blog post excerpts that entice readers to click and read more.

Guidelines:
- Capture the essence of the article
- Create curiosity or urgency
- Include a hint of the value readers will get
- Be concise and impactful

Output format: Just the excerpt text, no JSON.`;

  const userMessage = `Generate a compelling excerpt (maximum ${req.maxLength || 160} characters) for this blog post:

"""
${req.content.substring(0, 2000)}...
"""

Just provide the excerpt text.`;

  const result = await callClaude(systemPrompt, userMessage);
  return { excerpt: result.trim() };
}

// Analyze SEO
async function analyzeSEO(req: AnalyzeSEORequest) {
  const systemPrompt = `You are an expert SEO analyst. Your task is to analyze blog content and provide a detailed SEO score with actionable recommendations.

Scoring criteria (each out of 10):
- Title optimization
- Meta description effectiveness
- Keyword usage and density
- Content structure (headings, paragraphs)
- Readability score
- Internal/external linking
- Image alt text (if detectable)
- Content length and depth

Output format: JSON with structure:
{
  "overallScore": number (1-100),
  "categoryScores": {
    "titleOptimization": { "score": number, "feedback": "string" },
    "metaDescription": { "score": number, "feedback": "string" },
    "keywordUsage": { "score": number, "feedback": "string", "density": number },
    "contentStructure": { "score": number, "feedback": "string" },
    "readability": { "score": number, "feedback": "string", "gradeLevel": "string" },
    "contentDepth": { "score": number, "feedback": "string" }
  },
  "suggestions": [
    {
      "priority": "high" | "medium" | "low",
      "category": "string",
      "suggestion": "string",
      "impact": "string"
    }
  ],
  "competitorInsights": {
    "estimatedRankingDifficulty": "easy" | "medium" | "hard",
    "recommendedWordCount": number,
    "suggestedTopicsToAdd": ["string"]
  }
}`;

  const userMessage = `Analyze the SEO of this blog post:

Title: "${req.title}"
${req.metaDescription ? `Meta Description: "${req.metaDescription}"` : ''}
${req.focusKeyword ? `Focus Keyword: "${req.focusKeyword}"` : ''}

Content:
"""
${req.content}
"""

Provide detailed SEO analysis in JSON format.`;

  const result = await callClaude(systemPrompt, userMessage);

  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return { rawResponse: result };
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: AIRequest = await req.json();

    let result;

    switch (body.action) {
      case 'generate-outline':
        result = await generateOutline(body);
        break;
      case 'generate-titles':
        result = await generateTitles(body);
        break;
      case 'improve-content':
        result = await improveContent(body);
        break;
      case 'generate-seo':
        result = await generateSEO(body);
        break;
      case 'expand-section':
        result = await expandSection(body);
        break;
      case 'generate-excerpt':
        result = await generateExcerpt(body);
        break;
      case 'analyze-seo':
        result = await analyzeSEO(body);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Blog AI Assistant error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
