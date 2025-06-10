import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, source_table, source_id, metadata } = await req.json();

    if (!text || !source_table || !source_id) {
      throw new Error('Missing required parameters: text, source_table, source_id');
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

    // Call OpenAI API to generate embedding
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small', // Mais barato e eficiente
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const embedding = data.data[0].embedding;

    // Save embedding to database
    const { data: embedData, error: embedError } = await supabase
      .from('rag_embeddings')
      .insert({
        source_table,
        source_id,
        content: text.substring(0, 2000), // Limitar tamanho do conteúdo
        embedding,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (embedError) {
      console.error('Error saving embedding:', embedError);
      throw embedError;
    }

    // Mark item as processed
    const { error: updateError } = await supabase.rpc('mark_item_as_processed', {
      p_table_name: source_table,
      p_item_id: source_id,
      p_embedding_id: embedData.id
    });

    if (updateError) {
      console.error('Error marking item as processed:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        embedding_id: embedData.id,
        tokens_used: data.usage?.total_tokens 
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