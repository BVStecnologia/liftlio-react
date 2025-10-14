// Edge Function: upload-trello-image
// Descrição: Upload de imagens para o Trello via Supabase Storage
// Criado: 13/08/2025
// Bucket: trello-images (público)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Criar cliente Supabase com service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables')
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    const formData = await req.formData()
    const file = formData.get('file') as File
    const fileName = formData.get('fileName') as string || `trello-${Date.now()}.png`
    const cardId = formData.get('cardId') as string || 'general'
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Converter arquivo para bytes
    const bytes = new Uint8Array(await file.arrayBuffer())
    const path = `cards/${cardId}/${fileName}`
    
    console.log('Uploading to path:', path)
    
    // Upload para o Storage
    const { data, error } = await supabaseClient.storage
      .from('trello-images')
      .upload(path, bytes, {
        contentType: file.type || 'image/png',
        upsert: true
      })

    if (error) {
      console.error('Upload error:', error)
      throw error
    }

    // Gerar URL pública
    const { data: urlData } = supabaseClient.storage
      .from('trello-images')
      .getPublicUrl(path)

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: urlData.publicUrl,
        path: path
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})