// =============================================
// Edge Function: update-youtube-info
// Descrição: Atualiza informações do canal YouTube (email, nome, ID)
// Criado: 2025-01-18T01:17:08.941Z
// Autor: Supabase MCP Expert Agent
// =============================================

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
    const { integration_id } = await req.json()

    if (!integration_id) {
      throw new Error('integration_id is required')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get integration with token
    const { data: integration, error: integrationError } = await supabase
      .from('Integrações')
      .select('Token, youtube_email, youtube_channel_name, youtube_channel_id')
      .eq('id', integration_id)
      .single()

    if (integrationError || !integration) {
      throw new Error('Integration not found')
    }

    // If we already have the info, return it
    if (integration.youtube_channel_name && integration.youtube_email) {
      return new Response(
        JSON.stringify({
          email: integration.youtube_email,
          channel_name: integration.youtube_channel_name,
          channel_id: integration.youtube_channel_id,
          from_cache: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch user info from YouTube
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          'Authorization': `Bearer ${integration.Token}`
        }
      }
    )

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info from Google')
    }

    const userInfo = await userInfoResponse.json()

    // Fetch channel info from YouTube
    const channelResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      {
        headers: {
          'Authorization': `Bearer ${integration.Token}`
        }
      }
    )

    let channelInfo = null
    if (channelResponse.ok) {
      const channelData = await channelResponse.json()
      channelInfo = channelData.items?.[0]
    }

    // Update integration with the fetched info
    const updateData = {
      youtube_email: userInfo.email,
      youtube_channel_name: channelInfo?.snippet?.title || null,
      youtube_channel_id: channelInfo?.id || null,
      'Ultima atualização': new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('Integrações')
      .update(updateData)
      .eq('id', integration_id)

    if (updateError) {
      console.error('Error updating integration:', updateError)
    }

    return new Response(
      JSON.stringify({
        email: userInfo.email,
        channel_name: channelInfo?.snippet?.title || 'YouTube Channel',
        channel_id: channelInfo?.id || null,
        from_cache: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})