import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Configuração dos headers CORS (mantendo igual ao original)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Obter tokens das variáveis de ambiente
const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
const JINA_API_KEY = Deno.env.get('JINA_API_KEY');

// Verificar se as variáveis de ambiente foram configuradas
if (!CLAUDE_API_KEY || !JINA_API_KEY) {
  console.error('ERRO: CLAUDE_API_KEY ou JINA_API_KEY não estão configurados nas variáveis de ambiente');
}

console.info('server started - Análise de URL com Jina e Claude');

serve(async (req)=>{
  // Gerenciamento do CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    // Verificar se os tokens estão disponíveis
    if (!CLAUDE_API_KEY || !JINA_API_KEY) {
      return new Response(JSON.stringify({
        error: "Configuração do servidor incompleta: CLAUDE_API_KEY ou JINA_API_KEY não encontrado"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Connection': 'keep-alive'
        }
      });
    }

    // Extrair dados do request (mantendo compatibilidade - aceita "name" ou "url")
    const requestData = await req.json();
    const siteUrl = requestData.name || requestData.url;

    // Verificar se a URL foi fornecida
    if (!siteUrl) {
      return new Response(JSON.stringify({
        error: "URL não fornecida"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Connection': 'keep-alive'
        }
      });
    }

    console.log(`Processando URL: ${siteUrl}`);

    // PASSO 1: Fazer scraping com Jina AI
    console.log('Fazendo scraping com Jina AI...');
    const jinaUrl = `https://r.jina.ai/${siteUrl}`;

    const jinaResponse = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JINA_API_KEY}`,
        'Accept': 'application/json',
        'X-Return-Format': 'text'
      }
    });

    if (!jinaResponse.ok) {
      const errorText = await jinaResponse.text();
      console.error('Erro Jina AI:', jinaResponse.status, errorText);
      throw new Error(`Erro ao fazer scraping do site: ${jinaResponse.status}`);
    }

    // Obter o conteúdo do site
    const scrapedContent = await jinaResponse.text();

    if (!scrapedContent || scrapedContent.length < 100) {
      throw new Error('Não foi possível extrair conteúdo suficiente do site');
    }

    console.log('Scraping concluído, tamanho do conteúdo:', scrapedContent.length);

    // PASSO 2: Analisar com Claude focando em PROBLEMAS DO CLIENTE
    console.log('Analisando conteúdo com Claude...');

    const systemPrompt = `Website Analysis for Target Audience Description Generation

OBJECTIVE
Analyze the website and create detailed description focused on CUSTOMER PROBLEMS and RESULTS,
not technical features. The description will be used to find relevant conversations
where potential customers discuss their needs.

LANGUAGE GUIDELINES
- Automatically detect the website's language
- If English → respond entirely in English
- If Portuguese → respond entirely in Portuguese
- Maintain the same language throughout the entire response

CRITICAL APPROACH
AVOID language that attracts tech people or marketers:
❌ "AI-powered platform", "innovative solution", "automation tool"
❌ "Advanced features", "cutting-edge technology", "sophisticated system"
❌ Technical jargon, marketing buzzwords, technology focus

USE language of the end customer who has the problem:
✅ Real problems it solves
✅ Concrete results it delivers
✅ Contexts where it's used
✅ Simple and direct language

OUTPUT STRUCTURE (5 mandatory sections)

IMPORTANT - SECTION HEADERS MUST MATCH CONTENT LANGUAGE:

IF CONTENT IS IN ENGLISH, USE THESE HEADERS:
1. PROBLEMS IT SOLVES
2. WHO IT'S FOR
3. HOW IT WORKS (in simple language)
4. USE CONTEXTS
5. TYPICAL RESULTS

IF CONTENT IS IN PORTUGUESE, USE THESE HEADERS:
1. PROBLEMAS QUE RESOLVE
2. PARA QUEM É
3. COMO FUNCIONA (em linguagem simples)
4. CONTEXTOS DE USO
5. RESULTADOS TÍPICOS

SECTION CONTENT GUIDELINES:

Section 1: Describe real problems, challenges, or frustrations the product/service solves.
Use language the customer would use to describe their problem.
Focus on PAIN, not technical solution.

Section 2: Describe target audience using BEHAVIORAL and CONTEXTUAL characteristics,
not just demographics. Include: business type, stage, challenges faced,
what they're trying to achieve. AVOID technical jargon in audience description.

Section 3: Explain what the customer DOES with the product and what RESULT they get.
Focus on the process from the user's point of view, not the technology.
Use customer action verbs: achieves, increases, discovers, generates, etc.

Section 4: Where, when, and how the product is typically used.
Real situations, practical use cases, application moments.
Helps identify relevant conversations to mention the solution.

Section 5: What customers can achieve using the product/service.
Tangible results, concrete improvements, observable changes.
Avoid vague promises, focus on specific outcomes.

FORMAT
- Simple text, well-defined paragraphs
- Each section clearly separated
- Clear and direct language
- NO unnecessary technical jargon
- NO marketing buzzwords

CRITICAL: Start DIRECTLY with section 1. DO NOT include introductions,
decorative titles, or preambles. Begin immediately with the content.

CRITICAL - RESPONSE LANGUAGE:
The response MUST be written ENTIRELY in the same language detected in the website content.
If the site is in Portuguese, the ENTIRE response must be in Portuguese (including section headers).
If the site is in English, the ENTIRE response must be in English (including section headers).
Do not mix languages. Do not translate. Use the original content's language.`;

    const userPrompt = `Analyze the following content from website ${siteUrl}:

${scrapedContent.substring(0, 8000)}

Create the description following EXACTLY the 5-section structure provided.

CRITICAL - RESPOND IN THE WEBSITE'S LANGUAGE:
Detect the language of the content above and write your ENTIRE response in that same language.
If the content is in Portuguese, respond in Portuguese (use Portuguese section headers).
If the content is in English, respond in English (use English section headers).

REMEMBER:
- Focus on PROBLEMS and RESULTS, not technology
- Use language of the END CUSTOMER, not marketers
- Avoid technical jargon and buzzwords`;

    const claudePayload = {
      model: 'claude-sonnet-4-20250514',
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ],
      system: systemPrompt,
      max_tokens: 4096,
      temperature: 0.1
    };

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(claudePayload)
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Erro Claude API:', claudeResponse.status, errorText);
      throw new Error(`Erro ao analisar conteúdo: ${claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();

    // Extrair a resposta do Claude
    const analysisText = claudeData.content?.[0]?.text || '';

    if (!analysisText) {
      throw new Error('Resposta vazia do Claude');
    }

    // Retornar no MESMO formato da edge original
    return new Response(JSON.stringify({
      message: analysisText
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error("Erro na função:", error);

    // Em caso de erro, retornar uma mensagem de erro
    return new Response(JSON.stringify({
      error: `Erro ao processar a requisição: ${error.message}`
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Connection': 'keep-alive'
      }
    });
  }
});
