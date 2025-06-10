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
    const { batch_size = 5 } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get unprocessed items
    const { data: items, error: fetchError } = await supabase.rpc('get_unprocessed_items', {
      p_limit: batch_size
    });

    if (fetchError) {
      throw fetchError;
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No items to process',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each item
    const results = [];
    for (const item of items) {
      try {
        // Call generate-embeddings function
        const response = await fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: item.content,
            source_table: item.table_name,
            source_id: item.item_id,
            metadata: item.metadata
          }),
        });

        const result = await response.json();
        results.push({
          item_id: item.item_id,
          table: item.table_name,
          success: response.ok,
          error: result.error
        });

        // Pequena pausa para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        results.push({
          item_id: item.item_id,
          table: item.table_name,
          success: false,
          error: error.message
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: successful,
        failed: failed,
        results: results
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