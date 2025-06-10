import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, match_count = 10, match_threshold = 0.7 } = await req.json();

    if (!query) {
      throw new Error('Query parameter is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Generate embedding for the query
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: query,
        model: 'text-embedding-3-small',
      }),
    });

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Search for similar embeddings
    const { data: results, error: searchError } = await supabase.rpc('search_embeddings', {
      query_embedding: queryEmbedding,
      match_count,
      match_threshold
    });

    if (searchError) {
      throw searchError;
    }

    // Enrich results with full context
    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        const { data: context } = await supabase.rpc('get_full_context', {
          p_source_table: result.source_table,
          p_source_id: result.source_id
        });

        return {
          ...result,
          context
        };
      })
    );

    return new Response(
      JSON.stringify({ 
        success: true,
        query,
        results: enrichedResults,
        count: enrichedResults.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});