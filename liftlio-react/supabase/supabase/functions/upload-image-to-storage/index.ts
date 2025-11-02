import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req)=>{
  try {
    // Get image from request
    const formData = await req.formData();
    const file = formData.get('file');
    const fileName = formData.get('fileName') || `image_${Date.now()}.png`;

    if (!file) {
      return new Response(JSON.stringify({
        error: 'No file provided'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('trello-images')
      .upload(`anti-bot/${fileName}`, file, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('trello-images')
      .getPublicUrl(data.path);

    return new Response(JSON.stringify({
      url: publicUrl
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
