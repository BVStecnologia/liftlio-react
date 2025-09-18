// =============================================
// Edge Function: update-youtube-info
// Descrição: Busca e atualiza informações do canal YouTube usando tokens existentes
// Criado: 2025-01-18T20:00:00.000Z
// Atualizado: Integração com função SQL get_youtube_token para renovação automática
// =============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const { integration_id } = await req.json();

    if (!integration_id) {
      throw new Error('integration_id is required');
    }

    // Initialize Supabase client with service role for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get integration details with project_id
    const { data: integration, error: integrationError } = await supabase
      .from('Integrações')
      .select('"PROJETO id", youtube_email, youtube_channel_name, youtube_channel_id')
      .eq('id', integration_id)
      .single();

    if (integrationError) {
      console.error('Error fetching integration:', integrationError);
      throw new Error('Integration not found');
    }

    if (!integration) {
      throw new Error('Integration not found');
    }

    // If we already have the info, return it
    if (integration.youtube_channel_name && integration.youtube_email) {
      return new Response(JSON.stringify({
        email: integration.youtube_email,
        channel_name: integration.youtube_channel_name,
        channel_id: integration.youtube_channel_id,
        from_cache: true
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Get fresh token using the SQL function that handles refresh automatically
    const projectId = integration['PROJETO id'];
    console.log('Getting token for project:', projectId);

    // IMPORTANTE: Usar p_projeto_id como nome do parâmetro
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('get_youtube_token', { p_projeto_id: projectId });

    if (tokenError) {
      console.error('Error getting token:', tokenError);
      throw new Error('Failed to get YouTube token: ' + tokenError.message);
    }

    if (!tokenData) {
      throw new Error('No token returned');
    }

    const accessToken = tokenData;
    console.log('Got token, length:', accessToken.length);

    // Fetch user info from YouTube
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error('User info error:', errorText);
      throw new Error('Failed to fetch user info from Google');
    }

    const userInfo = await userInfoResponse.json();
    console.log('Got user info, email:', userInfo.email);

    // Fetch channel info from YouTube
    const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    let channelInfo = null;
    if (channelResponse.ok) {
      const channelData = await channelResponse.json();
      channelInfo = channelData.items?.[0];
      console.log('Got channel info:', channelInfo?.snippet?.title);
    } else {
      console.error('Channel info error:', await channelResponse.text());
    }

    // Update integration with the fetched info
    const updateData = {
      youtube_email: userInfo.email,
      youtube_channel_name: channelInfo?.snippet?.title || null,
      youtube_channel_id: channelInfo?.id || null,
      'Ultima atualização': new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('Integrações')
      .update(updateData)
      .eq('id', integration_id);

    if (updateError) {
      console.error('Error updating integration:', updateError);
    }

    return new Response(JSON.stringify({
      email: userInfo.email,
      channel_name: channelInfo?.snippet?.title || 'YouTube Channel',
      channel_id: channelInfo?.id || null,
      from_cache: false
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});